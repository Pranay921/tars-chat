import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Send a DM connection request
export const sendDMRequest = mutation({
    args: { toUserId: v.id("users") },
    handler: async (ctx, { toUserId }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const me = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!me) throw new Error("User not found");
        if (me._id === toUserId) throw new Error("Cannot send request to yourself");

        // Check if already pending (either direction)
        const existing = await ctx.db
            .query("requests")
            .withIndex("by_fromUser_toUser", (q) =>
                q.eq("fromUserId", me._id).eq("toUserId", toUserId)
            )
            .first();
        if (existing && existing.status === "pending") return "already_pending";

        // Check reverse
        const reverse = await ctx.db
            .query("requests")
            .withIndex("by_fromUser_toUser", (q) =>
                q.eq("fromUserId", toUserId).eq("toUserId", me._id)
            )
            .first();
        if (reverse && reverse.status === "pending") return "already_pending";

        // Check if DM already exists
        const myParticipations = await ctx.db
            .query("participants")
            .withIndex("by_user", (q) => q.eq("userId", me._id))
            .collect();

        for (const p of myParticipations) {
            const conv = await ctx.db.get(p.conversationId);
            if (!conv || conv.isGroup) continue;
            const theirParticipation = await ctx.db
                .query("participants")
                .withIndex("by_conversation_user", (q) =>
                    q.eq("conversationId", conv._id).eq("userId", toUserId)
                )
                .unique();
            if (theirParticipation) return "already_exists";
        }

        await ctx.db.insert("requests", {
            fromUserId: me._id,
            toUserId,
            type: "dm",
            status: "pending",
        });
        return "sent";
    },
});

// Send group invites to multiple users
export const sendGroupInvites = mutation({
    args: {
        memberIds: v.array(v.id("users")),
        groupName: v.string(),
    },
    handler: async (ctx, { memberIds, groupName }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const me = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!me) throw new Error("User not found");

        for (const memberId of memberIds) {
            if (memberId === me._id) continue;
            await ctx.db.insert("requests", {
                fromUserId: me._id,
                toUserId: memberId,
                type: "group",
                status: "pending",
                groupName,
                groupMemberIds: [me._id, ...memberIds],
            });
        }
        return "invites_sent";
    },
});

// Accept a request
export const acceptRequest = mutation({
    args: { requestId: v.id("requests") },
    handler: async (ctx, { requestId }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const me = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!me) throw new Error("User not found");

        const request = await ctx.db.get(requestId);
        if (!request) throw new Error("Request not found");
        if (request.toUserId !== me._id) throw new Error("Not your request");
        if (request.status !== "pending") throw new Error("Request already handled");

        await ctx.db.patch(requestId, { status: "accepted" });

        if (request.type === "dm") {
            // Create the DM conversation
            const convId = await ctx.db.insert("conversations", {
                participantIds: [request.fromUserId, me._id],
                isGroup: false,
            });
            await ctx.db.insert("participants", { conversationId: convId, userId: request.fromUserId });
            await ctx.db.insert("participants", { conversationId: convId, userId: me._id });
            return convId;
        } else {
            // GROUP INVITE FLOW
            if (request.conversationId) {
                // Group was already created by an earlier acceptee — just join it
                const convId = request.conversationId;
                const conv = await ctx.db.get(convId);
                if (conv) {
                    // Only add if not already a participant (idempotent)
                    const existing = await ctx.db
                        .query("participants")
                        .withIndex("by_conversation_user", (q) =>
                            q.eq("conversationId", convId).eq("userId", me._id)
                        )
                        .unique();
                    if (!existing) {
                        await ctx.db.insert("participants", { conversationId: convId, userId: me._id });
                        const updatedIds = [...conv.participantIds, me._id];
                        await ctx.db.patch(convId, { participantIds: updatedIds });
                    }
                }
                return convId;
            } else {
                // First person to accept — create the group with admin + this user
                const convId = await ctx.db.insert("conversations", {
                    participantIds: [request.fromUserId, me._id],
                    isGroup: true,
                    groupName: request.groupName ?? "Group",
                    adminId: request.fromUserId, // Original requester is the admin
                });
                await ctx.db.insert("participants", { conversationId: convId, userId: request.fromUserId });
                await ctx.db.insert("participants", { conversationId: convId, userId: me._id });

                // Link the conversationId onto all OTHER still-pending invites from the same sender
                // Those users will join this group when they accept (without auto-accepting or dismissing their invite)
                const others = await ctx.db
                    .query("requests")
                    .withIndex("by_fromUser_toUser", (q) => q.eq("fromUserId", request.fromUserId))
                    .collect();
                for (const r of others) {
                    if (
                        r._id !== requestId &&
                        r.type === "group" &&
                        r.groupName === request.groupName &&
                        r.status === "pending"
                    ) {
                        // Just link the group — do NOT change status to "accepted"
                        await ctx.db.patch(r._id, { conversationId: convId });
                    }
                }
                return convId;
            }
        }
    },
});

// Decline a request
export const declineRequest = mutation({
    args: { requestId: v.id("requests") },
    handler: async (ctx, { requestId }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const me = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!me) throw new Error("User not found");

        const request = await ctx.db.get(requestId);
        if (!request || request.toUserId !== me._id) throw new Error("Not your request");

        await ctx.db.patch(requestId, { status: "declined" });
    },
});

// List pending incoming requests with sender info
export const listPendingRequests = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const me = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!me) return [];

        const pending = await ctx.db
            .query("requests")
            .withIndex("by_toUser_status", (q) =>
                q.eq("toUserId", me._id).eq("status", "pending")
            )
            .collect();

        const enriched = await Promise.all(
            pending.map(async (req) => {
                const from = await ctx.db.get(req.fromUserId);
                return {
                    ...req,
                    fromUser: from
                        ? { name: from.name, imageUrl: from.imageUrl, _id: from._id }
                        : null,
                };
            })
        );

        return enriched;
    },
});

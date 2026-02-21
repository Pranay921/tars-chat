import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get or create a 1-on-1 DM conversation
export const getOrCreateDM = mutation({
    args: { otherUserId: v.id("users") },
    handler: async (ctx, { otherUserId }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const me = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!me) throw new Error("User not found");

        // Look for existing DM between these two users
        const myParticipations = await ctx.db
            .query("participants")
            .withIndex("by_user", (q) => q.eq("userId", me._id))
            .collect();

        for (const p of myParticipations) {
            const conv = await ctx.db.get(p.conversationId);
            if (!conv || conv.isGroup) continue;
            const otherParticipant = await ctx.db
                .query("participants")
                .withIndex("by_conversation_user", (q) =>
                    q.eq("conversationId", p.conversationId).eq("userId", otherUserId)
                )
                .unique();
            if (otherParticipant) return p.conversationId;
        }

        const conversationId = await ctx.db.insert("conversations", {
            participantIds: [me._id, otherUserId],
            isGroup: false,
            lastMessageTime: Date.now(),
        });

        await ctx.db.insert("participants", { conversationId, userId: me._id, lastReadTime: Date.now() });
        await ctx.db.insert("participants", { conversationId, userId: otherUserId, lastReadTime: 0 });

        return conversationId;
    },
});

// List all conversations for the current user
export const listConversations = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const me = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!me) return [];

        const participations = await ctx.db
            .query("participants")
            .withIndex("by_user", (q) => q.eq("userId", me._id))
            .collect();

        const results = [];
        for (const p of participations) {
            const conv = await ctx.db.get(p.conversationId);
            if (!conv) continue;

            const allParticipants = await ctx.db
                .query("participants")
                .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
                .collect();

            const otherParticipantIds = allParticipants
                .filter((ap) => ap.userId !== me._id)
                .map((ap) => ap.userId);

            const otherUsers = await Promise.all(otherParticipantIds.map((id) => ctx.db.get(id)));

            const allMessages = await ctx.db
                .query("messages")
                .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
                .collect();

            const lastReadTime = p.lastReadTime ?? 0;
            const unreadCount = allMessages.filter(
                (m) => m._creationTime > lastReadTime && m.senderId !== me._id
            ).length;

            results.push({
                ...conv,
                otherUsers: otherUsers.filter(Boolean),
                unreadCount,
                myParticipantId: p._id,
            });
        }

        results.sort((a, b) => (b.lastMessageTime ?? 0) - (a.lastMessageTime ?? 0));
        return results;
    },
});

// Get a single conversation with all members
export const getConversation = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, { conversationId }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        const me = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!me) return null;

        const conv = await ctx.db.get(conversationId);
        if (!conv) return null;

        const allParticipants = await ctx.db
            .query("participants")
            .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
            .collect();

        const otherParticipantIds = allParticipants
            .filter((p) => p.userId !== me._id)
            .map((p) => p.userId);

        const otherUsers = await Promise.all(otherParticipantIds.map((id) => ctx.db.get(id)));

        return {
            ...conv,
            otherUsers: otherUsers.filter(Boolean),
            isAdmin: conv.adminId === me._id,
        };
    },
});

// Get all members of a group (with user details), for the manage panel
export const getGroupMembers = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, { conversationId }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const conv = await ctx.db.get(conversationId);
        if (!conv || !conv.isGroup) return [];

        const participants = await ctx.db
            .query("participants")
            .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
            .collect();

        const members = await Promise.all(
            participants.map(async (p) => {
                const user = await ctx.db.get(p.userId);
                return user
                    ? {
                        _id: user._id,
                        name: user.name,
                        imageUrl: user.imageUrl,
                        email: user.email,
                        isAdmin: user._id === conv.adminId,
                    }
                    : null;
            })
        );

        return members.filter(Boolean);
    },
});

// Mark conversation as read
export const markAsRead = mutation({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, { conversationId }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return;

        const me = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!me) return;

        const participant = await ctx.db
            .query("participants")
            .withIndex("by_conversation_user", (q) =>
                q.eq("conversationId", conversationId).eq("userId", me._id)
            )
            .unique();

        if (participant) {
            await ctx.db.patch(participant._id, { lastReadTime: Date.now() });
        }
    },
});

// Create a group conversation (direct, admin = creator)
export const createGroup = mutation({
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

        const allIds = [me._id, ...memberIds];

        const conversationId = await ctx.db.insert("conversations", {
            participantIds: allIds,
            isGroup: true,
            groupName,
            lastMessageTime: Date.now(),
            adminId: me._id, // Creator is admin
        });

        for (const uid of allIds) {
            await ctx.db.insert("participants", {
                conversationId,
                userId: uid,
                lastReadTime: uid === me._id ? Date.now() : 0,
            });
        }

        return conversationId;
    },
});

// Kick a member from a group — admin only
export const kickMember = mutation({
    args: {
        conversationId: v.id("conversations"),
        userId: v.id("users"),
    },
    handler: async (ctx, { conversationId, userId }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const me = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!me) throw new Error("User not found");

        const conv = await ctx.db.get(conversationId);
        if (!conv || !conv.isGroup) throw new Error("Not a group");
        if (conv.adminId !== me._id) throw new Error("Only the admin can kick members");
        if (userId === me._id) throw new Error("Cannot kick yourself");

        // Remove from participants table
        const participant = await ctx.db
            .query("participants")
            .withIndex("by_conversation_user", (q) =>
                q.eq("conversationId", conversationId).eq("userId", userId)
            )
            .unique();
        if (participant) await ctx.db.delete(participant._id);

        // Update participantIds array
        const updatedIds = conv.participantIds.filter((id) => id !== userId);
        await ctx.db.patch(conversationId, { participantIds: updatedIds });
    },
});

// Admin adds a new member to an existing group (sends an invite)
export const adminAddMember = mutation({
    args: {
        conversationId: v.id("conversations"),
        userId: v.id("users"),
    },
    handler: async (ctx, { conversationId, userId }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const me = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!me) throw new Error("User not found");

        const conv = await ctx.db.get(conversationId);
        if (!conv || !conv.isGroup) throw new Error("Not a group");
        if (conv.adminId !== me._id) throw new Error("Only the admin can add members");

        // Check not already a member
        const existing = await ctx.db
            .query("participants")
            .withIndex("by_conversation_user", (q) =>
                q.eq("conversationId", conversationId).eq("userId", userId)
            )
            .unique();
        if (existing) return "already_member";

        // Send a group invite request
        await ctx.db.insert("requests", {
            fromUserId: me._id,
            toUserId: userId,
            type: "group",
            status: "pending",
            groupName: conv.groupName ?? "Group",
            groupMemberIds: conv.participantIds,
        });
        return "invite_sent";
    },
});

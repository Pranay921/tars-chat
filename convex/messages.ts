import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Send a message
export const sendMessage = mutation({
    args: {
        conversationId: v.id("conversations"),
        text: v.string(),
    },
    handler: async (ctx, { conversationId, text }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const me = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!me) throw new Error("User not found");

        const messageId = await ctx.db.insert("messages", {
            conversationId,
            senderId: me._id,
            text,
            isDeleted: false,
            reactions: [],
        });

        // Update conversation's last message preview
        await ctx.db.patch(conversationId, {
            lastMessageTime: Date.now(),
            lastMessageText: text,
        });

        return messageId;
    },
});

// List messages in a conversation
export const listMessages = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, { conversationId }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const messages = await ctx.db
            .query("messages")
            .withIndex("by_conversation", (q) =>
                q.eq("conversationId", conversationId)
            )
            .collect();

        // Attach sender info
        const enriched = await Promise.all(
            messages.map(async (msg) => {
                const sender = await ctx.db.get(msg.senderId);
                return { ...msg, sender };
            })
        );

        return enriched;
    },
});

// Soft delete a message
export const deleteMessage = mutation({
    args: { messageId: v.id("messages") },
    handler: async (ctx, { messageId }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const me = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!me) throw new Error("User not found");

        const message = await ctx.db.get(messageId);
        if (!message) throw new Error("Message not found");
        if (message.senderId !== me._id) throw new Error("Not your message");

        await ctx.db.patch(messageId, { isDeleted: true, text: "" });
    },
});

// Toggle reaction on a message
export const toggleReaction = mutation({
    args: {
        messageId: v.id("messages"),
        emoji: v.string(),
    },
    handler: async (ctx, { messageId, emoji }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const me = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!me) throw new Error("User not found");

        const message = await ctx.db.get(messageId);
        if (!message) throw new Error("Message not found");

        const reactions = message.reactions ?? [];
        const existingIdx = reactions.findIndex((r) => r.emoji === emoji);

        if (existingIdx >= 0) {
            const existing = reactions[existingIdx];
            const userIdx = existing.userIds.indexOf(me._id);
            if (userIdx >= 0) {
                // Remove user from reaction
                const newUserIds = existing.userIds.filter((id) => id !== me._id);
                if (newUserIds.length === 0) {
                    reactions.splice(existingIdx, 1);
                } else {
                    reactions[existingIdx] = { ...existing, userIds: newUserIds };
                }
            } else {
                reactions[existingIdx] = {
                    ...existing,
                    userIds: [...existing.userIds, me._id],
                };
            }
        } else {
            reactions.push({ emoji, userIds: [me._id] });
        }

        await ctx.db.patch(messageId, { reactions });
    },
});

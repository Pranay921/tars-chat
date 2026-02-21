import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const OFFLINE_THRESHOLD_MS = 30000; // 30 seconds

// Heartbeat — call every 10s from client
export const heartbeat = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return;

        const me = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!me) return;

        const existing = await ctx.db
            .query("presence")
            .withIndex("by_userId", (q) => q.eq("userId", me._id))
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, {
                isOnline: true,
                lastHeartbeat: Date.now(),
            });
        } else {
            await ctx.db.insert("presence", {
                userId: me._id,
                isOnline: true,
                lastHeartbeat: Date.now(),
            });
        }
    },
});

// Go offline — call on unload
export const goOffline = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return;

        const me = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!me) return;

        const existing = await ctx.db
            .query("presence")
            .withIndex("by_userId", (q) => q.eq("userId", me._id))
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, {
                isOnline: false,
                isTypingIn: undefined,
                lastHeartbeat: Date.now(),
            });
        }
    },
});

// Set typing state
export const setTyping = mutation({
    args: {
        conversationId: v.optional(v.id("conversations")),
    },
    handler: async (ctx, { conversationId }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return;

        const me = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!me) return;

        const existing = await ctx.db
            .query("presence")
            .withIndex("by_userId", (q) => q.eq("userId", me._id))
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, {
                isTypingIn: conversationId,
                lastHeartbeat: Date.now(),
            });
        }
    },
});

// Get all presence statuses
export const getAllPresence = query({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();
        const presenceRecords = await ctx.db.query("presence").collect();

        return presenceRecords.map((p) => ({
            ...p,
            isOnline: p.isOnline && now - p.lastHeartbeat < OFFLINE_THRESHOLD_MS,
        }));
    },
});

// Get typing users in a conversation
export const getTypingUsers = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, { conversationId }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const me = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        const now = Date.now();
        const presenceRecords = await ctx.db.query("presence").collect();

        const typingUserIds = presenceRecords
            .filter(
                (p) =>
                    p.isTypingIn === conversationId &&
                    p.userId !== me?._id &&
                    now - p.lastHeartbeat < 5000 // typing clears after 5s stale
            )
            .map((p) => p.userId);

        const typingUsers = await Promise.all(
            typingUserIds.map((id) => ctx.db.get(id))
        );

        return typingUsers.filter(Boolean);
    },
});

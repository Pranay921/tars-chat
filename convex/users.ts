import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Upsert user from Clerk on login
export const storeUser = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const existing = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (existing) {
            // Update profile in case name/image changed
            await ctx.db.patch(existing._id, {
                name: identity.name ?? "User",
                email: identity.email ?? "",
                imageUrl: identity.pictureUrl ?? "",
            });
            return existing._id;
        }

        const userId = await ctx.db.insert("users", {
            clerkId: identity.subject,
            name: identity.name ?? "User",
            email: identity.email ?? "",
            imageUrl: identity.pictureUrl ?? "",
        });
        return userId;
    },
});

// Get current logged-in user
export const getMe = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;
        return await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
    },
});

// List all users excluding self, optionally filtered by name
export const listUsers = query({
    args: { search: v.optional(v.string()) },
    handler: async (ctx, { search }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const allUsers = await ctx.db.query("users").collect();
        const filtered = allUsers.filter((u) => u.clerkId !== identity.subject);

        if (!search || search.trim() === "") return filtered;
        const lower = search.toLowerCase();
        return filtered.filter((u) => u.name.toLowerCase().includes(lower));
    },
});

// Get user by id
export const getUserById = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        return await ctx.db.get(userId);
    },
});

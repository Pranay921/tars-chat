import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.string(),
  }).index("by_clerkId", ["clerkId"]),

  conversations: defineTable({
    participantIds: v.array(v.id("users")),
    isGroup: v.boolean(),
    groupName: v.optional(v.string()),
    groupImageUrl: v.optional(v.string()),
    lastMessageTime: v.optional(v.number()),
    lastMessageText: v.optional(v.string()),
    adminId: v.optional(v.id("users")), // Group admin (creator)
  }),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    text: v.string(),
    isDeleted: v.optional(v.boolean()),
    reactions: v.optional(
      v.array(
        v.object({
          emoji: v.string(),
          userIds: v.array(v.id("users")),
        })
      )
    ),
  })
    .index("by_conversation", ["conversationId"]),

  participants: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    lastReadTime: v.optional(v.number()),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_user", ["userId"])
    .index("by_conversation_user", ["conversationId", "userId"]),

  presence: defineTable({
    userId: v.id("users"),
    isOnline: v.boolean(),
    isTypingIn: v.optional(v.id("conversations")),
    lastHeartbeat: v.number(),
  }).index("by_userId", ["userId"]),

  // Friend/group requests
  requests: defineTable({
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    type: v.union(v.literal("dm"), v.literal("group")),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined")
    ),
    groupName: v.optional(v.string()),
    groupMemberIds: v.optional(v.array(v.id("users"))),
    conversationId: v.optional(v.id("conversations")), // Set after first accepts; subsequent acceptors join this group
  })
    .index("by_toUser_status", ["toUserId", "status"])
    .index("by_fromUser_toUser", ["fromUserId", "toUserId"]),
});

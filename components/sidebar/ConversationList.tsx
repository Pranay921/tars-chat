"use client";

import { useQuery } from "convex/react";
import { useRouter, useParams } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import UserAvatar from "@/components/shared/UserAvatar";
import EmptyState from "@/components/shared/EmptyState";
import { formatPreviewTimestamp, cn } from "@/lib/utils";

export default function ConversationList() {
    const router = useRouter();
    const params = useParams();
    const activeConversationId = params?.id as string | undefined;

    const conversations = useQuery(api.conversations.listConversations);
    const presence = useQuery(api.presence.getAllPresence);
    const me = useQuery(api.users.getMe);

    const getIsOnline = (userId: Id<"users">) => {
        const now = Date.now();
        const p = presence?.find((p) => p.userId === userId);
        return p?.isOnline && now - p.lastHeartbeat < 30000;
    };

    if (!conversations) {
        return (
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                            <div className="h-3 bg-white/10 rounded w-2/3" />
                            <div className="h-2.5 bg-white/10 rounded w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (conversations.length === 0) {
        return <EmptyState type="no-conversations" />;
    }

    return (
        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
            {conversations.map((conv) => {
                const isActive = activeConversationId === conv._id;
                const displayName = conv.isGroup
                    ? conv.groupName
                    : (conv.otherUsers[0] as any)?.name ?? "Unknown";
                const displayImage = conv.isGroup
                    ? undefined
                    : (conv.otherUsers[0] as any)?.imageUrl;
                const otherUserId = !conv.isGroup ? (conv.otherUsers[0] as any)?._id : undefined;
                const online = otherUserId ? getIsOnline(otherUserId) : false;

                return (
                    <button
                        key={conv._id}
                        onClick={() => router.push(`/conversations/${conv._id}`)}
                        className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-150 text-left",
                            isActive
                                ? "bg-purple-600/20 border border-purple-500/30"
                                : "hover:bg-white/5 active:bg-white/10 border border-transparent"
                        )}
                    >
                        <UserAvatar
                            name={displayName ?? "?"}
                            imageUrl={displayImage}
                            isOnline={!conv.isGroup ? online : undefined}
                            size="md"
                        />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium text-white truncate">{displayName}</p>
                                {conv.lastMessageTime && (
                                    <span className="text-xs text-[hsl(var(--muted-foreground))] flex-shrink-0">
                                        {formatPreviewTimestamp(conv.lastMessageTime)}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center justify-between gap-2 mt-0.5">
                                <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                                    {conv.lastMessageText || "Start chatting..."}
                                </p>
                                {(conv.unreadCount as number) > 0 && (
                                    <span className="flex-shrink-0 min-w-[18px] h-[18px] bg-purple-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                                        {(conv.unreadCount as number) > 99 ? "99+" : conv.unreadCount as number}
                                    </span>
                                )}
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}

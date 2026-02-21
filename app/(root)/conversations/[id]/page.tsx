"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { use } from "react";
import { ArrowLeft, Users } from "lucide-react";
import ChatWindow from "@/components/chat/ChatWindow";
import UserAvatar from "@/components/shared/UserAvatar";

interface Props {
    params: Promise<{ id: string }>;
}

export default function ConversationPage({ params }: Props) {
    const { id } = use(params);
    const conversationId = id as Id<"conversations">;
    const router = useRouter();

    const me = useQuery(api.users.getMe);
    const conversation = useQuery(api.conversations.getConversation, { conversationId });
    const presence = useQuery(api.presence.getAllPresence);

    if (!me) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!conversation) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const otherUser = !conversation.isGroup ? (conversation.otherUsers as any[])[0] : null;
    const displayName = conversation.isGroup ? conversation.groupName : otherUser?.name ?? "Unknown";
    const displayImage = !conversation.isGroup ? otherUser?.imageUrl : undefined;

    const online = (() => {
        if (!otherUser || !presence) return false;
        const now = Date.now();
        const p = presence.find((p) => p.userId === otherUser._id);
        return p?.isOnline && now - p.lastHeartbeat < 30000;
    })();

    return (
        <>
            {/* Mobile: show sidebar when no conversation selected — this page IS the conversation */}
            {/* On mobile, show full-screen */}
            <div className="flex flex-col h-full w-full">
                {/* Chat header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] flex-shrink-0">
                    {/* Back button (mobile only) */}
                    <button
                        onClick={() => router.back()}
                        className="md:hidden -ml-1 w-9 h-9 flex items-center justify-center rounded-xl text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>

                    <UserAvatar
                        name={displayName ?? "?"}
                        imageUrl={displayImage}
                        isOnline={!conversation.isGroup ? online : undefined}
                        size="md"
                    />
                    <div className="flex-1 min-w-0">
                        <h2 className="text-sm font-semibold text-white truncate">{displayName}</h2>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            {conversation.isGroup
                                ? `${(conversation.otherUsers as any[]).length + 1} members`
                                : online
                                    ? "Online"
                                    : "Offline"}
                        </p>
                    </div>
                    {conversation.isGroup && (
                        <div className="flex-shrink-0 text-[hsl(var(--muted-foreground))]">
                            <Users className="w-4 h-4" />
                        </div>
                    )}
                </div>

                {/* Chat window */}
                <ChatWindow
                    conversationId={conversationId}
                    myId={me._id}
                    isGroup={conversation.isGroup}
                />
            </div>
        </>
    );
}

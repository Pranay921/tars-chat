"use client";

import { MessageSquare, Users, SearchX, MessagesSquare } from "lucide-react";

type EmptyStateType =
    | "no-conversations"
    | "no-messages"
    | "no-search-results"
    | "select-conversation";

const configs: Record<
    EmptyStateType,
    { icon: React.ElementType; title: string; description: string }
> = {
    "no-conversations": {
        icon: MessageSquare,
        title: "No conversations yet",
        description: "Start chatting by selecting a user from the Users tab",
    },
    "no-messages": {
        icon: MessagesSquare,
        title: "No messages yet",
        description: "Say hi! Be the first to send a message",
    },
    "no-search-results": {
        icon: SearchX,
        title: "No users found",
        description: "Try a different name or check your spelling",
    },
    "select-conversation": {
        icon: Users,
        title: "Select a conversation",
        description: "Choose someone from the sidebar to start chatting",
    },
};

export default function EmptyState({ type }: { type: EmptyStateType }) {
    const { icon: Icon, title, description } = configs[type];

    return (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
            <div className="w-20 h-20 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <Icon className="w-10 h-10 text-purple-400" />
            </div>
            <div>
                <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))] max-w-xs">{description}</p>
            </div>
        </div>
    );
}

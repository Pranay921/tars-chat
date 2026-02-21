"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Search, X } from "lucide-react";
import UserAvatar from "@/components/shared/UserAvatar";
import EmptyState from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";

export default function UserList() {
    const [search, setSearch] = useState("");
    const router = useRouter();

    const users = useQuery(api.users.listUsers, { search });
    const presence = useQuery(api.presence.getAllPresence);
    const getOrCreateDM = useMutation(api.conversations.getOrCreateDM);

    const getIsOnline = (userId: Id<"users">) => {
        const now = Date.now();
        const p = presence?.find((p) => p.userId === userId);
        return p?.isOnline && now - p.lastHeartbeat < 30000;
    };

    const handleUserClick = async (userId: Id<"users">) => {
        const conversationId = await getOrCreateDM({ otherUserId: userId });
        router.push(`/conversations/${conversationId}`);
    };

    if (!users) {
        return (
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {[...Array(6)].map((_, i) => (
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

    return (
        <div className="flex flex-col h-full">
            {/* Search Bar */}
            <div className="p-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-[hsl(var(--secondary))] text-white placeholder-[hsl(var(--muted-foreground))] rounded-xl pl-9 pr-9 py-2 text-sm border border-[hsl(var(--border))] focus:outline-none focus:border-purple-500 transition-colors"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* User List */}
            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
                {users.length === 0 ? (
                    <EmptyState type="no-search-results" />
                ) : (
                    users.map((user) => {
                        const online = getIsOnline(user._id);
                        return (
                            <button
                                key={user._id}
                                onClick={() => handleUserClick(user._id)}
                                className={cn(
                                    "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-150",
                                    "hover:bg-white/5 active:bg-white/10 text-left group"
                                )}
                            >
                                <UserAvatar
                                    name={user.name}
                                    imageUrl={user.imageUrl}
                                    isOnline={online}
                                    size="md"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{user.name}</p>
                                    <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                                        {online ? (
                                            <span className="text-green-400">Online</span>
                                        ) : (
                                            user.email
                                        )}
                                    </p>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}

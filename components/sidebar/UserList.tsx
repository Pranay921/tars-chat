"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Search, X, UserPlus, Check } from "lucide-react";
import UserAvatar from "@/components/shared/UserAvatar";
import EmptyState from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";

type RequestStatus = "idle" | "sending" | "sent" | "already_pending" | "already_exists";

export default function UserList() {
    const [inputValue, setInputValue] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusMap, setStatusMap] = useState<Record<string, RequestStatus>>({});
    const inputRef = useRef<HTMLInputElement>(null);

    // Debounce: only update the Convex query arg 300ms after user stops typing
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(inputValue), 300);
        return () => clearTimeout(t);
    }, [inputValue]);

    const users = useQuery(api.users.listUsers, { search: debouncedSearch });
    const presence = useQuery(api.presence.getAllPresence);
    const sendDMRequest = useMutation(api.requests.sendDMRequest);

    const getIsOnline = (userId: Id<"users">) => {
        const now = Date.now();
        const p = presence?.find((p) => p.userId === userId);
        return p?.isOnline && now - p.lastHeartbeat < 30000;
    };

    const handleUserClick = async (userId: Id<"users">) => {
        if (statusMap[userId] === "sending" || statusMap[userId] === "sent") return;
        setStatusMap((prev) => ({ ...prev, [userId]: "sending" }));
        try {
            const result = await sendDMRequest({ toUserId: userId });
            setStatusMap((prev) => ({ ...prev, [userId]: (result as RequestStatus) ?? "sent" }));
        } catch {
            setStatusMap((prev) => ({ ...prev, [userId]: "idle" }));
        }
    };

    const getButtonState = (userId: string) => {
        const s = statusMap[userId] ?? "idle";
        if (s === "sent") return { label: "Request sent", icon: <Check className="w-4 h-4" />, disabled: true, cls: "text-green-400" };
        if (s === "already_pending") return { label: "Pending", icon: <Check className="w-4 h-4" />, disabled: true, cls: "text-yellow-400" };
        if (s === "already_exists") return { label: "Chat exists", icon: <Check className="w-4 h-4" />, disabled: true, cls: "text-purple-400" };
        if (s === "sending") return { label: "Sending...", icon: <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />, disabled: true, cls: "text-[hsl(var(--muted-foreground))]" };
        return { label: "Connect", icon: <UserPlus className="w-4 h-4" />, disabled: false, cls: "text-purple-400" };
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
                        ref={inputRef}
                        type="text"
                        placeholder="Search users..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="w-full bg-[hsl(var(--secondary))] text-white placeholder-[hsl(var(--muted-foreground))] rounded-xl pl-9 pr-9 py-2 text-sm border border-[hsl(var(--border))] focus:outline-none focus:border-purple-500 transition-colors"
                    />
                    {inputValue && (
                        <button
                            onClick={() => { setInputValue(""); setDebouncedSearch(""); inputRef.current?.focus(); }}
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
                        const btn = getButtonState(user._id);
                        return (
                            <div
                                key={user._id}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all duration-150"
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
                                {/* Connect button */}
                                <button
                                    onClick={() => handleUserClick(user._id)}
                                    disabled={btn.disabled}
                                    title={btn.label}
                                    className={cn(
                                        "flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border",
                                        btn.disabled
                                            ? "border-transparent bg-transparent cursor-default " + btn.cls
                                            : "border-purple-500/30 bg-purple-600/10 text-purple-400 hover:bg-purple-600/20"
                                    )}
                                >
                                    {btn.icon}
                                    <span className="hidden sm:inline">{btn.label}</span>
                                </button>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

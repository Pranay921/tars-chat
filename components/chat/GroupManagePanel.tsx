"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { X, UserPlus, UserMinus, Search, Crown, Shield } from "lucide-react";
import UserAvatar from "@/components/shared/UserAvatar";
import { cn } from "@/lib/utils";

interface Props {
    conversationId: Id<"conversations">;
    isAdmin: boolean;
    onClose: () => void;
}

export default function GroupManagePanel({ conversationId, isAdmin, onClose }: Props) {
    const [showAddUser, setShowAddUser] = useState(false);
    const [search, setSearch] = useState("");
    const [kickingId, setKickingId] = useState<string | null>(null);
    const [addStatus, setAddStatus] = useState<Record<string, "idle" | "sending" | "done">>({});

    const members = useQuery(api.conversations.getGroupMembers, { conversationId });
    const allUsers = useQuery(api.users.listUsers, { search });
    const kickMember = useMutation(api.conversations.kickMember);
    const adminAddMember = useMutation(api.conversations.adminAddMember);

    // Filter out users who are already members
    const memberIds = new Set(members?.map((m) => m!._id) ?? []);
    const usersToAdd = allUsers?.filter((u) => !memberIds.has(u._id));

    const handleKick = async (userId: Id<"users">) => {
        setKickingId(userId);
        try {
            await kickMember({ conversationId, userId });
        } catch (e) {
            console.error(e);
        } finally {
            setKickingId(null);
        }
    };

    const handleAdd = async (userId: Id<"users">) => {
        setAddStatus((prev) => ({ ...prev, [userId]: "sending" }));
        try {
            await adminAddMember({ conversationId, userId });
            setAddStatus((prev) => ({ ...prev, [userId]: "done" }));
        } catch (e) {
            console.error(e);
            setAddStatus((prev) => ({ ...prev, [userId]: "idle" }));
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
                    <div>
                        <h2 className="text-base font-semibold text-white">Manage Group</h2>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                            {isAdmin ? "You are the admin" : "View members"}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-[hsl(var(--muted-foreground))] hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="max-h-[60vh] overflow-y-auto">
                    {/* Members list */}
                    <div className="p-3 space-y-1">
                        <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider px-2 mb-2">
                            Members ({members?.length ?? 0})
                        </p>
                        {!members ? (
                            [...Array(3)].map((_, i) => (
                                <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl animate-pulse">
                                    <div className="w-9 h-9 rounded-full bg-white/10 flex-shrink-0" />
                                    <div className="flex-1 h-3 bg-white/10 rounded w-2/3" />
                                </div>
                            ))
                        ) : (
                            members.map((member) => {
                                if (!member) return null;
                                return (
                                    <div
                                        key={member._id}
                                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5"
                                    >
                                        <UserAvatar name={member.name} imageUrl={member.imageUrl} size="sm" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <p className="text-sm font-medium text-white truncate">{member.name}</p>
                                                {member.isAdmin && (
                                                    <Crown className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                                                )}
                                            </div>
                                            <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                                                {member.isAdmin ? "Admin" : "Member"}
                                            </p>
                                        </div>
                                        {/* Kick button — only admin sees it, not for themselves or other admins */}
                                        {isAdmin && !member.isAdmin && (
                                            <button
                                                onClick={() => handleKick(member._id)}
                                                disabled={kickingId === member._id}
                                                title={`Remove ${member.name}`}
                                                className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                            >
                                                {kickingId === member._id ? (
                                                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <UserMinus className="w-3.5 h-3.5" />
                                                )}
                                            </button>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Add member section — admin only */}
                    {isAdmin && (
                        <div className="border-t border-[hsl(var(--border))] p-3">
                            <button
                                onClick={() => setShowAddUser((v) => !v)}
                                className={cn(
                                    "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors",
                                    showAddUser
                                        ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                                        : "text-purple-400 hover:bg-purple-600/10 border border-transparent"
                                )}
                            >
                                <UserPlus className="w-4 h-4" />
                                {showAddUser ? "Hide" : "Add Member"}
                            </button>

                            {showAddUser && (
                                <div className="mt-3 space-y-2">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                                        <input
                                            type="text"
                                            placeholder="Search users..."
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            className="w-full bg-[hsl(var(--secondary))] text-white placeholder-[hsl(var(--muted-foreground))] rounded-xl pl-9 pr-3 py-2 text-sm border border-[hsl(var(--border))] focus:outline-none focus:border-purple-500"
                                        />
                                    </div>
                                    <div className="max-h-36 overflow-y-auto space-y-1">
                                        {usersToAdd?.length === 0 ? (
                                            <p className="text-xs text-[hsl(var(--muted-foreground))] text-center py-2">
                                                All users already in this group
                                            </p>
                                        ) : (
                                            usersToAdd?.map((user) => {
                                                const status = addStatus[user._id] ?? "idle";
                                                return (
                                                    <div key={user._id} className="flex items-center gap-2 p-2 rounded-xl hover:bg-white/5">
                                                        <UserAvatar name={user.name} imageUrl={user.imageUrl} size="sm" />
                                                        <span className="flex-1 text-sm text-white truncate">{user.name}</span>
                                                        <button
                                                            onClick={() => handleAdd(user._id)}
                                                            disabled={status !== "idle"}
                                                            className={cn(
                                                                "text-xs px-2.5 py-1 rounded-lg border transition-colors",
                                                                status === "done"
                                                                    ? "border-green-500/30 bg-green-500/10 text-green-400 cursor-default"
                                                                    : status === "sending"
                                                                        ? "border-transparent text-[hsl(var(--muted-foreground))] cursor-wait"
                                                                        : "border-purple-500/30 bg-purple-600/10 text-purple-400 hover:bg-purple-600/20"
                                                            )}
                                                        >
                                                            {status === "done" ? "Invited" : status === "sending" ? "..." : "Invite"}
                                                        </button>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[hsl(var(--border))]">
                    <button
                        onClick={onClose}
                        className="w-full py-2 rounded-xl border border-[hsl(var(--border))] text-sm text-[hsl(var(--muted-foreground))] hover:text-white hover:border-white/30 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

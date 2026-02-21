"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { MessageSquare, Users, LogOut, Plus, X, Check } from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";
import ConversationList from "./ConversationList";
import UserList from "./UserList";
import UserAvatar from "@/components/shared/UserAvatar";
import { cn } from "@/lib/utils";

type Tab = "chats" | "users";

export default function Sidebar() {
    const [activeTab, setActiveTab] = useState<Tab>("chats");
    const [showGroupDialog, setShowGroupDialog] = useState(false);
    const { user } = useUser();

    return (
        <div className="flex flex-col h-full w-full bg-[hsl(var(--card))] border-r border-[hsl(var(--border))]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[hsl(var(--border))]">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-4 h-4 text-white" />
                    </div>
                    <h1 className="text-base font-bold text-white tracking-tight">Tars Chat</h1>
                </div>
                <div className="flex items-center gap-2">
                    {activeTab === "chats" && (
                        <button
                            onClick={() => setShowGroupDialog(true)}
                            title="Create group chat"
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    )}
                    <UserButton
                        appearance={{
                            elements: {
                                userButtonAvatarBox: "w-8 h-8",
                            },
                        }}
                    />
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-2 border-b border-[hsl(var(--border))]">
                <TabBtn active={activeTab === "chats"} onClick={() => setActiveTab("chats")} icon={<MessageSquare className="w-3.5 h-3.5" />} label="Chats" />
                <TabBtn active={activeTab === "users"} onClick={() => setActiveTab("users")} icon={<Users className="w-3.5 h-3.5" />} label="Users" />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                {activeTab === "chats" ? <ConversationList /> : <UserList />}
            </div>

            {/* Group chat dialog */}
            {showGroupDialog && (
                <GroupChatDialog onClose={() => setShowGroupDialog(false)} />
            )}
        </div>
    );
}

function TabBtn({
    active,
    onClick,
    icon,
    label,
}: {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150",
                active
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-white/5"
            )}
        >
            {icon}
            {label}
        </button>
    );
}

function GroupChatDialog({ onClose }: { onClose: () => void }) {
    const [groupName, setGroupName] = useState("");
    const [selectedIds, setSelectedIds] = useState<Id<"users">[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const users = useQuery(api.users.listUsers, { search });
    const createGroup = useMutation(api.conversations.createGroup);

    const toggle = (id: Id<"users">) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const handleCreate = async () => {
        if (!groupName.trim() || selectedIds.length < 2) return;
        setLoading(true);
        try {
            const id = await createGroup({ memberIds: selectedIds, groupName: groupName.trim() });
            onClose();
            router.push(`/conversations/${id}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
                <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
                    <h2 className="text-base font-semibold text-white">New Group Chat</h2>
                    <button onClick={onClose} className="text-[hsl(var(--muted-foreground))] hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-4 space-y-3">
                    <input
                        type="text"
                        placeholder="Group name..."
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        className="w-full bg-[hsl(var(--secondary))] text-white placeholder-[hsl(var(--muted-foreground))] rounded-xl px-3 py-2 text-sm border border-[hsl(var(--border))] focus:outline-none focus:border-purple-500"
                    />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-[hsl(var(--secondary))] text-white placeholder-[hsl(var(--muted-foreground))] rounded-xl px-3 py-2 text-sm border border-[hsl(var(--border))] focus:outline-none focus:border-purple-500"
                    />
                    <div className="max-h-48 overflow-y-auto space-y-1">
                        {users?.map((user) => (
                            <button
                                key={user._id}
                                onClick={() => toggle(user._id)}
                                className={cn(
                                    "w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left",
                                    selectedIds.includes(user._id)
                                        ? "bg-purple-600/20 border border-purple-500/30"
                                        : "hover:bg-white/5 border border-transparent"
                                )}
                            >
                                <UserAvatar name={user.name} imageUrl={user.imageUrl} size="sm" />
                                <span className="text-sm text-white flex-1">{user.name}</span>
                                {selectedIds.includes(user._id) && (
                                    <Check className="w-4 h-4 text-purple-400" />
                                )}
                            </button>
                        ))}
                    </div>
                    {selectedIds.length > 0 && (
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            {selectedIds.length} member{selectedIds.length !== 1 ? "s" : ""} selected
                        </p>
                    )}
                </div>
                <div className="flex gap-2 p-4 border-t border-[hsl(var(--border))]">
                    <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-[hsl(var(--border))] text-sm text-[hsl(var(--muted-foreground))] hover:text-white hover:border-white/30 transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={!groupName.trim() || selectedIds.length < 2 || loading}
                        className="flex-1 py-2 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {loading ? "Creating..." : "Create Group"}
                    </button>
                </div>
            </div>
        </div>
    );
}

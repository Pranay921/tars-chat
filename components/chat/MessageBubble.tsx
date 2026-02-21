"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Trash2 } from "lucide-react";
import UserAvatar from "@/components/shared/UserAvatar";
import { formatTimestamp, cn } from "@/lib/utils";

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢"];

interface Message {
    _id: Id<"messages">;
    _creationTime: number;
    text: string;
    isDeleted?: boolean;
    senderId: Id<"users">;
    reactions?: { emoji: string; userIds: Id<"users">[] }[];
    sender?: {
        _id: Id<"users">;
        name: string;
        imageUrl: string;
    } | null;
}

interface MessageBubbleProps {
    message: Message;
    isOwn: boolean;
    myId: Id<"users">;
    showAvatar?: boolean;
}

export default function MessageBubble({ message, isOwn, myId, showAvatar }: MessageBubbleProps) {
    const [showReactionPicker, setShowReactionPicker] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const deleteMessage = useMutation(api.messages.deleteMessage);
    const toggleReaction = useMutation(api.messages.toggleReaction);

    const handleDelete = async () => {
        await deleteMessage({ messageId: message._id });
        setShowDeleteConfirm(false);
    };

    const handleReaction = async (emoji: string) => {
        await toggleReaction({ messageId: message._id, emoji });
        setShowReactionPicker(false);
    };

    const activeReactions = (message.reactions ?? []).filter((r) => r.userIds.length > 0);

    return (
        <div className={cn("flex items-end gap-2 group animate-fade-in", isOwn ? "flex-row-reverse" : "flex-row")}>
            {/* Avatar */}
            <div className="flex-shrink-0 w-8">
                {showAvatar && !isOwn ? (
                    <UserAvatar name={message.sender?.name ?? "?"} imageUrl={message.sender?.imageUrl} size="sm" />
                ) : null}
            </div>

            <div className={cn("flex flex-col gap-1 max-w-[70%]", isOwn ? "items-end" : "items-start")}>
                {/* Sender name for group */}
                {showAvatar && !isOwn && message.sender && (
                    <span className="text-xs text-[hsl(var(--muted-foreground))] pl-1">{message.sender.name}</span>
                )}

                <div className="relative flex items-end gap-1.5">
                    {/* Action buttons — visible on hover, left of own messages */}
                    {!message.isDeleted && (
                        <div className={cn(
                            "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
                            isOwn ? "order-first" : "order-last"
                        )}>
                            <button
                                onClick={() => setShowReactionPicker((v) => !v)}
                                title="React"
                                className="w-6 h-6 rounded-full flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-white/10 text-sm transition-all"
                            >
                                😊
                            </button>
                            {isOwn && (
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    title="Delete"
                                    className="w-6 h-6 rounded-full flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-red-400 hover:bg-red-400/10 transition-all"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    )}

                    {/* Bubble */}
                    <div
                        className={cn(
                            "relative px-3.5 py-2 rounded-2xl text-sm leading-relaxed max-w-full",
                            message.isDeleted
                                ? "bg-white/5 border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] italic"
                                : isOwn
                                    ? "bg-purple-600 text-white rounded-br-sm"
                                    : "bg-[hsl(var(--secondary))] text-white rounded-bl-sm"
                        )}
                    >
                        {message.isDeleted ? "This message was deleted" : message.text}
                    </div>
                </div>

                {/* Reactions */}
                {activeReactions.length > 0 && (
                    <div className={cn("flex flex-wrap gap-1 mt-0.5", isOwn ? "justify-end" : "justify-start")}>
                        {activeReactions.map((r) => {
                            const hasReacted = r.userIds.includes(myId);
                            return (
                                <button
                                    key={r.emoji}
                                    onClick={() => handleReaction(r.emoji)}
                                    className={cn(
                                        "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all",
                                        hasReacted
                                            ? "bg-purple-600/30 border border-purple-500/50 text-white"
                                            : "bg-white/10 border border-white/10 text-[hsl(var(--muted-foreground))] hover:bg-white/20"
                                    )}
                                >
                                    <span>{r.emoji}</span>
                                    <span>{r.userIds.length}</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Timestamp */}
                <span className="text-[10px] text-[hsl(var(--muted-foreground))] px-1">
                    {formatTimestamp(message._creationTime)}
                </span>
            </div>

            {/* Reaction picker */}
            {showReactionPicker && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowReactionPicker(false)} />
                    <div className={cn(
                        "absolute z-20 bottom-10 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-2 flex gap-1 shadow-2xl animate-fade-in",
                        isOwn ? "right-0" : "left-0"
                    )}>
                        {REACTION_EMOJIS.map((emoji) => (
                            <button
                                key={emoji}
                                onClick={() => handleReaction(emoji)}
                                className="w-9 h-9 flex items-center justify-center text-xl hover:bg-white/10 rounded-xl transition-colors"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </>
            )}

            {/* Delete confirm */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-5 shadow-2xl w-72 animate-fade-in">
                        <h3 className="text-sm font-semibold text-white mb-1">Delete message?</h3>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">
                            This message will be replaced with "This message was deleted".
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 py-2 rounded-xl border border-[hsl(var(--border))] text-xs text-[hsl(var(--muted-foreground))] hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex-1 py-2 rounded-xl bg-red-500 text-white text-xs hover:bg-red-600 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

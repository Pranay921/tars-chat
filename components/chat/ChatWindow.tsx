"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ArrowDown } from "lucide-react";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import TypingIndicator from "./TypingIndicator";
import EmptyState from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";

interface ChatWindowProps {
    conversationId: Id<"conversations">;
    myId: Id<"users">;
    isGroup: boolean;
}

export default function ChatWindow({ conversationId, myId, isGroup }: ChatWindowProps) {
    const messages = useQuery(api.messages.listMessages, { conversationId });
    const typingUsers = useQuery(api.presence.getTypingUsers, { conversationId });
    const markAsRead = useMutation(api.conversations.markAsRead);

    const scrollContainer = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const [isScrolledUp, setIsScrolledUp] = useState(false);
    const [hasNewMessages, setHasNewMessages] = useState(false);
    const prevMsgCountRef = useRef(0);
    const isScrolledUpRef = useRef(false);

    // Scroll to bottom smoothly
    const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
        bottomRef.current?.scrollIntoView({ behavior });
        setIsScrolledUp(false);
        setHasNewMessages(false);
    }, []);

    // Track scroll position
    const handleScroll = useCallback(() => {
        const container = scrollContainer.current;
        if (!container) return;
        const { scrollTop, scrollHeight, clientHeight } = container;
        const atBottom = scrollHeight - scrollTop - clientHeight < 100;
        isScrolledUpRef.current = !atBottom;
        setIsScrolledUp(!atBottom);
        if (atBottom) {
            setHasNewMessages(false);
        }
    }, []);

    // Auto-scroll or show new message button
    useEffect(() => {
        if (!messages) return;
        const newCount = messages.length;
        const prevCount = prevMsgCountRef.current;

        if (newCount > prevCount) {
            if (prevCount === 0) {
                // First load — scroll instantly
                scrollToBottom("instant" as ScrollBehavior);
            } else if (isScrolledUpRef.current) {
                // User scrolled up — show button
                setHasNewMessages(true);
            } else {
                scrollToBottom("smooth");
            }
        }
        prevMsgCountRef.current = newCount;
    }, [messages, scrollToBottom]);

    // Mark as read when opened
    useEffect(() => {
        markAsRead({ conversationId });
    }, [conversationId, markAsRead]);

    if (!messages) {
        return (
            <div className="flex-1 flex flex-col">
                <div className="flex-1 p-4 space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className={cn("flex gap-3 animate-pulse", i % 2 === 0 ? "" : "flex-row-reverse")}>
                            <div className="w-8 h-8 rounded-full bg-white/10 flex-shrink-0" />
                            <div className={cn("space-y-1", i % 2 === 0 ? "" : "items-end flex flex-col")}>
                                <div className="h-10 bg-white/10 rounded-2xl w-48" />
                                <div className="h-2.5 bg-white/10 rounded w-16" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 relative">
            {/* Messages */}
            <div
                ref={scrollContainer}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0"
            >
                {messages.length === 0 ? (
                    <EmptyState type="no-messages" />
                ) : (
                    messages.map((msg, i) => {
                        const prev = messages[i - 1];
                        const showAvatar = isGroup && (
                            !prev || prev.senderId !== msg.senderId
                        );
                        return (
                            <MessageBubble
                                key={msg._id}
                                message={msg as any}
                                isOwn={msg.senderId === myId}
                                myId={myId}
                                showAvatar={showAvatar}
                            />
                        );
                    })
                )}

                {/* Typing indicator */}
                {typingUsers && typingUsers.length > 0 && (
                    <div className="pl-10">
                        <TypingIndicator names={typingUsers.map((u: any) => u.name)} />
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* New messages scroll button */}
            {hasNewMessages && (
                <button
                    onClick={() => scrollToBottom("smooth")}
                    className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-xs font-medium rounded-full shadow-lg hover:bg-purple-700 transition-all animate-fade-in z-10"
                >
                    <ArrowDown className="w-3.5 h-3.5" />
                    New messages
                </button>
            )}

            {/* Input */}
            <MessageInput conversationId={conversationId} />
        </div>
    );
}

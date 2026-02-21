"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Send } from "lucide-react";
import { useTyping } from "@/hooks/useTyping";
import { cn } from "@/lib/utils";

interface MessageInputProps {
    conversationId: Id<"conversations">;
}

export default function MessageInput({ conversationId }: MessageInputProps) {
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const sendMessage = useMutation(api.messages.sendMessage);
    const { onTyping, stopTyping } = useTyping(conversationId);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSend = async () => {
        if (!text.trim() || sending) return;
        setSending(true);
        setError(null);
        const content = text.trim();
        setText("");
        stopTyping();
        // Reset height
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }
        try {
            await sendMessage({ conversationId, text: content });
        } catch {
            setError("Failed to send. Tap to retry.");
            setText(content);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setText(e.target.value);
        onTyping();
        // Auto resize textarea
        const ta = e.target;
        ta.style.height = "auto";
        ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
    };

    return (
        <div className="p-3 border-t border-[hsl(var(--border))]">
            {error && (
                <button
                    onClick={() => { setError(null); handleSend(); }}
                    className="w-full mb-2 p-2 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 text-center hover:bg-red-500/20 transition-colors"
                >
                    {error}
                </button>
            )}
            <div className="flex items-end gap-2">
                <textarea
                    ref={textareaRef}
                    rows={1}
                    value={text}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message... (Enter to send)"
                    className={cn(
                        "flex-1 resize-none bg-[hsl(var(--secondary))] text-white placeholder-[hsl(var(--muted-foreground))]",
                        "rounded-2xl px-4 py-2.5 text-sm border border-[hsl(var(--border))] focus:outline-none focus:border-purple-500",
                        "transition-colors leading-relaxed max-h-[120px] overflow-y-auto"
                    )}
                />
                <button
                    onClick={handleSend}
                    disabled={!text.trim() || sending}
                    className={cn(
                        "flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-150",
                        text.trim() && !sending
                            ? "bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-500/25 scale-100"
                            : "bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] cursor-not-allowed scale-95"
                    )}
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

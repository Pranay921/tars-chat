"use client";

import { useRef, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useTyping(conversationId: Id<"conversations">) {
    const setTyping = useMutation(api.presence.setTyping);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isTypingRef = useRef(false);

    const onTyping = useCallback(() => {
        if (!isTypingRef.current) {
            isTypingRef.current = true;
            setTyping({ conversationId });
        }

        // Clear existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Auto-clear after 2 seconds
        timeoutRef.current = setTimeout(() => {
            isTypingRef.current = false;
            setTyping({ conversationId: undefined });
        }, 2000);
    }, [conversationId, setTyping]);

    const stopTyping = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        isTypingRef.current = false;
        setTyping({ conversationId: undefined });
    }, [setTyping]);

    return { onTyping, stopTyping };
}

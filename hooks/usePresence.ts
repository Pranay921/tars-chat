"use client";

import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export function usePresence() {
    const heartbeat = useMutation(api.presence.heartbeat);
    const goOffline = useMutation(api.presence.goOffline);

    useEffect(() => {
        // Initial heartbeat
        heartbeat();

        // Heartbeat every 10 seconds
        const interval = setInterval(() => {
            heartbeat();
        }, 10000);

        // Go offline on tab close
        const handleBeforeUnload = () => {
            goOffline();
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            clearInterval(interval);
            window.removeEventListener("beforeunload", handleBeforeUnload);
            goOffline();
        };
    }, [heartbeat, goOffline]);
}

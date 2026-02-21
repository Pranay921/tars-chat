"use client";

import { useEffect } from "react";
import { useMutation } from "convex/react";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import Sidebar from "@/components/sidebar/Sidebar";
import { usePresence } from "@/hooks/usePresence";
import { cn } from "@/lib/utils";

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const storeUser = useMutation(api.users.storeUser);
    const pathname = usePathname();
    const { isSignedIn } = useAuth();
    usePresence();

    // Only call storeUser when Clerk confirms the user is signed in
    useEffect(() => {
        if (isSignedIn) {
            storeUser().catch(console.error);
        }
    }, [storeUser, isSignedIn]);

    const isInConversation = pathname?.includes("/conversations/");

    return (
        <div className="flex h-screen overflow-hidden bg-[hsl(var(--background))]">
            <div
                className={cn(
                    "flex flex-shrink-0",
                    "md:!flex",
                    isInConversation ? "hidden" : "flex w-full md:w-auto"
                )}
                style={{ width: isInConversation ? undefined : "var(--sidebar-width)" }}
            >
                <Sidebar />
            </div>

            <div
                className={cn(
                    "flex-1 flex flex-col overflow-hidden",
                    isInConversation ? "flex" : "hidden md:flex"
                )}
            >
                {children}
            </div>
        </div>
    );
}

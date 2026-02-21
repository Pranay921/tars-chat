"use client";

import EmptyState from "@/components/shared/EmptyState";

export default function HomePage() {
    return (
        <div className="hidden md:flex flex-1 items-center justify-center h-full bg-[hsl(var(--background))]">
            <EmptyState type="select-conversation" />
        </div>
    );
}

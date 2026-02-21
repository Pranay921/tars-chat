"use client";

import Image from "next/image";
import { getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
    name: string;
    imageUrl?: string;
    isOnline?: boolean;
    size?: "sm" | "md" | "lg";
    className?: string;
}

const sizeMap = {
    sm: { container: "w-8 h-8", text: "text-xs", dot: "w-2.5 h-2.5 -bottom-0.5 -right-0.5 border" },
    md: { container: "w-10 h-10", text: "text-sm", dot: "w-3 h-3 -bottom-0.5 -right-0.5 border-2" },
    lg: { container: "w-12 h-12", text: "text-base", dot: "w-3.5 h-3.5 bottom-0 right-0 border-2" },
};

export default function UserAvatar({ name, imageUrl, isOnline, size = "md", className }: UserAvatarProps) {
    const s = sizeMap[size];

    return (
        <div className={cn("relative flex-shrink-0", className)}>
            <div className={cn("rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600", s.container)}>
                {imageUrl ? (
                    <Image
                        src={imageUrl}
                        alt={name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <span className={cn("font-semibold text-white", s.text)}>
                        {getInitials(name)}
                    </span>
                )}
            </div>
            {isOnline !== undefined && (
                <span
                    className={cn(
                        "absolute rounded-full border-[hsl(var(--background))]",
                        s.dot,
                        isOnline ? "bg-green-500" : "bg-gray-500"
                    )}
                />
            )}
        </div>
    );
}

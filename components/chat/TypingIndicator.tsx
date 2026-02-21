"use client";

export default function TypingIndicator({ names }: { names: string[] }) {
    if (names.length === 0) return null;

    const label =
        names.length === 1
            ? `${names[0]} is typing`
            : names.length === 2
                ? `${names[0]} and ${names[1]} are typing`
                : `${names[0]} and ${names.length - 1} others are typing`;

    return (
        <div className="flex items-center gap-2 px-1 py-0.5 animate-fade-in">
            <div className="flex items-center gap-1">
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-purple-400" />
            </div>
            <span className="text-xs text-[hsl(var(--muted-foreground))] italic">{label}...</span>
        </div>
    );
}

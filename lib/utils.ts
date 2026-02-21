import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isToday, isThisYear } from "date-fns";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);

    if (isToday(date)) {
        return format(date, "h:mm a"); // e.g. "2:34 PM"
    }

    if (isThisYear(date)) {
        return format(date, "MMM d, h:mm a"); // e.g. "Feb 15, 2:34 PM"
    }

    return format(date, "MMM d yyyy, h:mm a"); // e.g. "Feb 15 2023, 2:34 PM"
}

export function formatPreviewTimestamp(timestamp: number): string {
    const date = new Date(timestamp);

    if (isToday(date)) {
        return format(date, "h:mm a");
    }

    if (isThisYear(date)) {
        return format(date, "MMM d");
    }

    return format(date, "MMM d, yyyy");
}

export function getInitials(name: string): string {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

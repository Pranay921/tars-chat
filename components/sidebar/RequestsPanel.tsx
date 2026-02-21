"use client";

import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { X, Check, MessageSquare, Users } from "lucide-react";
import UserAvatar from "@/components/shared/UserAvatar";

interface Props {
    onClose: () => void;
}

export default function RequestsPanel({ onClose }: Props) {
    const requests = useQuery(api.requests.listPendingRequests);
    const acceptRequest = useMutation(api.requests.acceptRequest);
    const declineRequest = useMutation(api.requests.declineRequest);
    const router = useRouter();

    const handleAccept = async (requestId: Id<"requests">) => {
        const convId = await acceptRequest({ requestId });
        if (convId) {
            onClose();
            router.push(`/conversations/${convId}`);
        }
    };

    const handleDecline = async (requestId: Id<"requests">) => {
        await declineRequest({ requestId });
    };

    return (
        <div className="absolute inset-0 z-40 bg-[hsl(var(--card))] flex flex-col animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))]">
                <h2 className="text-sm font-semibold text-white">Notifications</h2>
                <button
                    onClick={onClose}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-white/10 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Request list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {!requests ? (
                    // Loading skeleton
                    [...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
                            <div className="w-10 h-10 rounded-full bg-white/10 flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 bg-white/10 rounded w-2/3" />
                                <div className="h-2.5 bg-white/10 rounded w-1/3" />
                            </div>
                        </div>
                    ))
                ) : requests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-purple-600/20 flex items-center justify-center mb-3">
                            <MessageSquare className="w-6 h-6 text-purple-400" />
                        </div>
                        <p className="text-sm font-medium text-white mb-1">No pending requests</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            New connection requests will appear here
                        </p>
                    </div>
                ) : (
                    requests.map((req) => (
                        <div
                            key={req._id}
                            className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-[hsl(var(--border))]"
                        >
                            <UserAvatar
                                name={req.fromUser?.name ?? "?"}
                                imageUrl={req.fromUser?.imageUrl}
                                size="md"
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                    {req.fromUser?.name ?? "Someone"}
                                </p>
                                <div className="flex items-center gap-1 mt-0.5">
                                    {req.type === "dm" ? (
                                        <>
                                            <MessageSquare className="w-3 h-3 text-purple-400 flex-shrink-0" />
                                            <p className="text-xs text-[hsl(var(--muted-foreground))]">
                                                wants to connect with you
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <Users className="w-3 h-3 text-purple-400 flex-shrink-0" />
                                            <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                                                invited you to <span className="text-white font-medium">{req.groupName}</span>
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>
                            {/* Action buttons */}
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                <button
                                    onClick={() => handleDecline(req._id)}
                                    title="Decline"
                                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleAccept(req._id)}
                                    title="Accept"
                                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                                >
                                    <Check className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

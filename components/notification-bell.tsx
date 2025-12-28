"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, CheckCheck, Flag, Trophy, Users } from "lucide-react";
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from "@/app/(dashboard)/notifications/actions";
import { formatDistanceToNow, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    metadata: { race_id?: string; race_name?: string } | null;
    created_at: string;
}

export function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    const fetchNotifications = async () => {
        const [notifs, count] = await Promise.all([
            getNotifications(10),
            getUnreadCount()
        ]);
        setNotifications(notifs as Notification[]);
        setUnreadCount(count);
    };

    useEffect(() => {
        fetchNotifications();

        // Subscribe to real-time notifications
        const supabase = createClient();
        const channel = supabase
            .channel('notifications')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications' },
                () => {
                    fetchNotifications();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleMarkAsRead = async (notificationId: string) => {
        await markAsRead(notificationId);
        setNotifications(prev =>
            prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const handleMarkAllAsRead = async () => {
        await markAllAsRead();
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'race_upcoming': return <Flag className="h-4 w-4 text-green-500" />;
            case 'results_available': return <Trophy className="h-4 w-4 text-yellow-500" />;
            case 'your_turn_to_pick': return <Users className="h-4 w-4 text-blue-500" />;
            default: return <Bell className="h-4 w-4" />;
        }
    };

    const getLink = (notification: Notification) => {
        if (notification.metadata?.race_id) {
            if (notification.type === 'your_turn_to_pick' || notification.type === 'race_upcoming') {
                return '/draft';
            }
            return `/races/${notification.metadata.race_id}`;
        }
        return null;
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                        >
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-1 text-xs"
                            onClick={(e) => {
                                e.preventDefault();
                                handleMarkAllAsRead();
                            }}
                        >
                            <CheckCheck className="h-3 w-3 mr-1" />
                            Mark all read
                        </Button>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        No notifications yet
                    </div>
                ) : (
                    notifications.map((notification) => {
                        const link = getLink(notification);
                        const content = (
                            <div
                                className={`flex gap-3 p-2 ${!notification.read ? 'bg-accent/50' : ''}`}
                                onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                            >
                                <div className="shrink-0 mt-1">
                                    {getIcon(notification.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{notification.title}</p>
                                    <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {formatDistanceToNow(parseISO(notification.created_at), { addSuffix: true })}
                                    </p>
                                </div>
                            </div>
                        );

                        return (
                            <DropdownMenuItem key={notification.id} asChild={!!link} className="cursor-pointer p-0">
                                {link ? (
                                    <Link href={link} className="w-full">
                                        {content}
                                    </Link>
                                ) : (
                                    content
                                )}
                            </DropdownMenuItem>
                        );
                    })
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

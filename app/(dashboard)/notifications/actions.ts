'use server';

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type NotificationType = 'race_upcoming' | 'results_available' | 'your_turn_to_pick';

interface NotificationMetadata {
    race_id?: string;
    race_name?: string;
    [key: string]: unknown;
}

/**
 * Get notifications for the current user
 */
export async function getNotifications(limit = 20) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) {
        console.error("Error fetching notifications:", error);
        return [];
    }

    return data || [];
}

/**
 * Get unread notification count for current user
 */
export async function getUnreadCount(): Promise<number> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);

    if (error) {
        console.error("Error counting notifications:", error);
        return 0;
    }

    return count || 0;
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(notificationId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);

    if (error) {
        console.error("Error marking notification as read:", error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

/**
 * Mark all notifications as read for current user
 */
export async function markAllAsRead() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);

    if (error) {
        console.error("Error marking all as read:", error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

/**
 * Create a notification for a single user
 */
export async function createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    metadata?: NotificationMetadata
) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("notifications")
        .insert({
            user_id: userId,
            type,
            title,
            message,
            metadata: metadata || null,
        });

    if (error) {
        console.error("Error creating notification:", error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

/**
 * Create notifications for all active users
 */
export async function createNotificationForAll(
    type: NotificationType,
    title: string,
    message: string,
    metadata?: NotificationMetadata
) {
    const supabase = await createClient();

    // Get all active users
    const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id")
        .eq("is_active", true);

    if (profilesError || !profiles) {
        console.error("Error fetching profiles:", profilesError);
        return { success: false, error: profilesError?.message || "No profiles found" };
    }

    // Create notifications for each user
    const notifications = profiles.map(profile => ({
        user_id: profile.id,
        type,
        title,
        message,
        metadata: metadata || null,
    }));

    const { error } = await supabase
        .from("notifications")
        .insert(notifications);

    if (error) {
        console.error("Error creating notifications:", error);
        return { success: false, error: error.message };
    }

    return { success: true, count: notifications.length };
}

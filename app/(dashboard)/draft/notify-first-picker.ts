'use server';

import { createClient } from "@/lib/supabase/server";
import { DraftOrderEntry } from "@/lib/draft-order";

/**
 * Send an email and in-app notification to the first picker
 * when a draft is opened by an admin.
 */
export async function notifyFirstPicker(raceId: string) {
    try {
        const supabase = await createClient();

        // Get the race with draft order
        const { data: race, error: raceError } = await supabase
            .from("races")
            .select("name, draft_order")
            .eq("id", raceId)
            .single();

        if (raceError || !race?.draft_order) {
            console.error("[notifyFirstPicker] Could not load race:", raceError);
            return;
        }

        const draftOrder = race.draft_order as DraftOrderEntry[];

        // Find the first pick slot
        const firstSlot = draftOrder
            .filter(s => s.draftRound === 1)
            .sort((a, b) => a.pickOrder - b.pickOrder)[0];

        if (!firstSlot) {
            console.error("[notifyFirstPicker] No first slot found in draft order");
            return;
        }

        // Look up the player's email
        const { data: profile } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", firstSlot.userId)
            .single();

        if (!profile?.email) {
            console.error("[notifyFirstPicker] Could not find email for first picker");
            return;
        }

        // Create in-app notification
        const { createNotification } = await import("@/app/(dashboard)/notifications/actions");
        await createNotification(
            firstSlot.userId,
            "your_turn_to_pick",
            "Your Turn to Pick!",
            `You're up first in the ${race.name} draft. Make your pick!`,
            { race_id: raceId, race_name: race.name }
        );

        // Send email
        const { sendDraftTurnEmail } = await import("@/lib/email");
        await sendDraftTurnEmail(profile.email, firstSlot.displayName, race.name);
    } catch (error) {
        // Never let email errors propagate — log and continue
        console.error("[notifyFirstPicker] Error:", error);
    }
}

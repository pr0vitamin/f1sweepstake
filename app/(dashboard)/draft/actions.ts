'use server';

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getCurrentPickSlot, canEditPick, DraftOrderEntry } from "@/lib/draft-order";

export async function makePick(raceId: string, driverId: string, onBehalfOfUserId?: string) {
    const supabase = await createClient();

    // 1. Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Not authenticated");

    // Check if user is admin (if picking on behalf of someone else)
    let targetUserId = user.id;
    if (onBehalfOfUserId && onBehalfOfUserId !== user.id) {
        const { data: profile } = await supabase
            .from("profiles")
            .select("is_admin")
            .eq("id", user.id)
            .single();

        if (!profile?.is_admin) {
            throw new Error("Only admins can pick on behalf of other users");
        }
        targetUserId = onBehalfOfUserId;
    }

    // 2. Get race with draft order
    const { data: race, error: raceError } = await supabase
        .from("races")
        .select("*")
        .eq("id", raceId)
        .single();

    if (raceError || !race) throw new Error("Race not found");
    if (!race.picks_open) throw new Error("Picks are not open for this race");
    if (!race.draft_order) throw new Error("Draft order not set");

    const draftOrder = race.draft_order as DraftOrderEntry[];

    // 3. Get existing picks
    const { data: existingPicks, error: picksError } = await supabase
        .from("picks")
        .select("*")
        .eq("race_id", raceId);

    if (picksError) throw new Error("Could not fetch picks");

    // 4. Check if it's target user's turn
    const completedPicks = existingPicks.map(p => ({
        userId: p.user_id,
        draftRound: p.draft_round,
        pickOrder: p.pick_order
    }));

    const currentSlot = getCurrentPickSlot(draftOrder, completedPicks);

    if (!currentSlot) throw new Error("Draft is complete");
    if (currentSlot.userId !== targetUserId) throw new Error("Not this user's turn to pick");

    // 5. Check if driver is already picked
    const driverAlreadyPicked = existingPicks.some(p => p.driver_id === driverId);
    if (driverAlreadyPicked) throw new Error("Driver already picked");

    // 6. Insert pick
    const { error: insertError } = await supabase
        .from("picks")
        .insert({
            race_id: raceId,
            user_id: targetUserId,
            driver_id: driverId,
            pick_order: currentSlot.pickOrder,
            draft_round: currentSlot.draftRound
        });

    if (insertError) throw insertError;

    // 7. Check if only 1 driver remains - auto-assign to last player
    const updatedPicks = [...existingPicks, { driver_id: driverId, user_id: targetUserId, draft_round: currentSlot.draftRound, pick_order: currentSlot.pickOrder }];
    const updatedCompletedPicks = updatedPicks.map(p => ({
        userId: p.user_id,
        draftRound: p.draft_round,
        pickOrder: p.pick_order
    }));

    const nextSlot = getCurrentPickSlot(draftOrder, updatedCompletedPicks);
    let draftComplete = !nextSlot;

    if (nextSlot) {
        // Get all active drivers for this race's season
        const { data: allDrivers } = await supabase
            .from("drivers")
            .select("id, team:teams!inner(season_id)")
            .eq("team.season_id", race.season_id)
            .eq("is_active", true);

        if (allDrivers) {
            const pickedDriverIds = new Set(updatedPicks.map(p => p.driver_id));
            const remainingDrivers = allDrivers.filter(d => !pickedDriverIds.has(d.id));

            // If only 1 driver left, auto-assign to next player
            if (remainingDrivers.length === 1) {
                const lastDriver = remainingDrivers[0];
                await supabase
                    .from("picks")
                    .insert({
                        race_id: raceId,
                        user_id: nextSlot.userId,
                        driver_id: lastDriver.id,
                        pick_order: nextSlot.pickOrder,
                        draft_round: nextSlot.draftRound
                    });

                // After auto-assign, check if draft is now complete
                const finalPicks = [...updatedPicks, { driver_id: lastDriver.id, user_id: nextSlot.userId, draft_round: nextSlot.draftRound, pick_order: nextSlot.pickOrder }];
                const finalCompletedPicks = finalPicks.map(p => ({
                    userId: p.user_id,
                    draftRound: p.draft_round,
                    pickOrder: p.pick_order
                }));
                draftComplete = !getCurrentPickSlot(draftOrder, finalCompletedPicks);
            }
        }
    }

    // 8. If draft is complete (no more slots), auto-close picks
    if (draftComplete) {
        await supabase
            .from("races")
            .update({ picks_open: false })
            .eq("id", raceId);
    } else {
        // Draft continues - notify next player it's their turn
        const finalNextSlot = getCurrentPickSlot(draftOrder, updatedCompletedPicks);
        if (finalNextSlot && finalNextSlot.userId !== targetUserId) {
            const { createNotification } = await import("@/app/(dashboard)/notifications/actions");
            await createNotification(
                finalNextSlot.userId,
                "your_turn_to_pick",
                "Your Turn to Pick!",
                `It's your turn to pick in the ${race.name} draft. Don't keep everyone waiting!`,
                { race_id: raceId, race_name: race.name }
            );
        }
    }

    revalidatePath(`/draft`);
    revalidatePath(`/admin/races/${raceId}/draft`);

    return { success: true };
}

export async function updatePick(raceId: string, draftRound: 1 | 2, newDriverId: string) {
    const supabase = await createClient();

    // 1. Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Not authenticated");

    // 2. Get race
    const { data: race, error: raceError } = await supabase
        .from("races")
        .select("*")
        .eq("id", raceId)
        .single();

    if (raceError || !race) throw new Error("Race not found");
    if (!race.picks_open) throw new Error("Picks are closed");

    const draftOrder = race.draft_order as DraftOrderEntry[];

    // 3. Get existing picks
    const { data: existingPicks, error: picksError } = await supabase
        .from("picks")
        .select("*")
        .eq("race_id", raceId);

    if (picksError) throw new Error("Could not fetch picks");

    // 4. Check if user can edit
    const completedPicks = existingPicks.map(p => ({
        userId: p.user_id,
        draftRound: p.draft_round,
        pickOrder: p.pick_order
    }));

    const canEdit = canEditPick(draftOrder, completedPicks, user.id, draftRound);
    if (!canEdit) throw new Error("Cannot edit pick - next player has already picked");

    // 5. Check if new driver is available
    const driverTaken = existingPicks.some(p =>
        p.driver_id === newDriverId &&
        !(p.user_id === user.id && p.draft_round === draftRound)
    );
    if (driverTaken) throw new Error("Driver already picked by another player");

    // 6. Update pick
    const { error: updateError } = await supabase
        .from("picks")
        .update({ driver_id: newDriverId })
        .eq("race_id", raceId)
        .eq("user_id", user.id)
        .eq("draft_round", draftRound);

    if (updateError) throw updateError;

    revalidatePath(`/draft`);
    return { success: true };
}

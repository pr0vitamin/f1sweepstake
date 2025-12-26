'use server';

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getCurrentPickSlot, canEditPick, DraftOrderEntry } from "@/lib/draft-order";

export async function makePick(raceId: string, driverId: string) {
    const supabase = await createClient();

    // 1. Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Not authenticated");

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

    // 4. Check if it's user's turn
    const completedPicks = existingPicks.map(p => ({
        userId: p.user_id,
        draftRound: p.draft_round,
        pickOrder: p.pick_order
    }));

    const currentSlot = getCurrentPickSlot(draftOrder, completedPicks);

    if (!currentSlot) throw new Error("Draft is complete");
    if (currentSlot.userId !== user.id) throw new Error("Not your turn to pick");

    // 5. Check if driver is already picked
    const driverAlreadyPicked = existingPicks.some(p => p.driver_id === driverId);
    if (driverAlreadyPicked) throw new Error("Driver already picked");

    // 6. Insert pick
    const { error: insertError } = await supabase
        .from("picks")
        .insert({
            race_id: raceId,
            user_id: user.id,
            driver_id: driverId,
            pick_order: currentSlot.pickOrder,
            draft_round: currentSlot.draftRound
        });

    if (insertError) throw insertError;

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

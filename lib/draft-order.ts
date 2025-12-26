/**
 * Snake Draft Order Logic for F1 Sweepstakes
 * 
 * Handles the draft order calculation including:
 * - Random order for first race of season
 * - Performance-based order for subsequent races (worst first)
 * - Snake draft (round 1: 1→N, round 2: N→1)
 */

import type { Profile } from '@/lib/types/database';

export interface DraftOrderEntry {
    userId: string;
    displayName: string;
    pickOrder: number;
    draftRound: 1 | 2;
    previousRacePoints?: number;
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
export function shuffleArray<T>(array: T[], seed?: number): T[] {
    const result = [...array];

    // Simple seeded random for reproducibility in tests
    const random = seed !== undefined
        ? () => {
            seed = (seed! * 1103515245 + 12345) & 0x7fffffff;
            return seed / 0x7fffffff;
        }
        : Math.random;

    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
}

/**
 * Generate draft order for the first race of the season (random)
 */
export function generateRandomDraftOrder(
    players: Profile[],
    seed?: number
): DraftOrderEntry[] {
    const shuffledPlayers = shuffleArray(players, seed);
    const draftOrder: DraftOrderEntry[] = [];

    // Round 1: 1 → N
    shuffledPlayers.forEach((player, index) => {
        draftOrder.push({
            userId: player.id,
            displayName: player.display_name,
            pickOrder: index + 1,
            draftRound: 1,
        });
    });

    // Round 2: N → 1 (snake)
    [...shuffledPlayers].reverse().forEach((player, index) => {
        draftOrder.push({
            userId: player.id,
            displayName: player.display_name,
            pickOrder: shuffledPlayers.length + index + 1,
            draftRound: 2,
        });
    });

    return draftOrder;
}

/**
 * Generate draft order based on previous race performance
 * Worst performers pick first (snake draft)
 */
export function generatePerformanceDraftOrder(
    players: { profile: Profile; previousRacePoints: number }[]
): DraftOrderEntry[] {
    // Sort by points ascending (worst first)
    const sortedPlayers = [...players].sort((a, b) => a.previousRacePoints - b.previousRacePoints);
    const draftOrder: DraftOrderEntry[] = [];

    // Round 1: worst → best
    sortedPlayers.forEach((player, index) => {
        draftOrder.push({
            userId: player.profile.id,
            displayName: player.profile.display_name,
            pickOrder: index + 1,
            draftRound: 1,
            previousRacePoints: player.previousRacePoints,
        });
    });

    // Round 2: best → worst (snake)
    [...sortedPlayers].reverse().forEach((player, index) => {
        draftOrder.push({
            userId: player.profile.id,
            displayName: player.profile.display_name,
            pickOrder: sortedPlayers.length + index + 1,
            draftRound: 2,
            previousRacePoints: player.previousRacePoints,
        });
    });

    return draftOrder;
}

/**
 * Get the current pick slot (who should pick next)
 */
export function getCurrentPickSlot(
    draftOrder: DraftOrderEntry[],
    completedPicks: { userId: string; draftRound: number }[]
): DraftOrderEntry | null {
    // Find the first slot that hasn't been picked yet
    for (const slot of draftOrder.sort((a, b) => a.pickOrder - b.pickOrder)) {
        const hasPicked = completedPicks.some(
            p => p.userId === slot.userId && p.draftRound === slot.draftRound
        );
        if (!hasPicked) {
            return slot;
        }
    }
    return null; // Draft is complete
}

/**
 * Check if a user can still edit their pick
 * Users can only edit until the next person has made their pick
 */
export function canEditPick(
    draftOrder: DraftOrderEntry[],
    completedPicks: { userId: string; draftRound: number; pickOrder: number }[],
    userId: string,
    draftRound: 1 | 2
): boolean {
    // Find the user's pick order
    const userSlot = draftOrder.find(
        s => s.userId === userId && s.draftRound === draftRound
    );
    if (!userSlot) return false;

    // Check if the next person has already picked
    const nextPickOrder = userSlot.pickOrder + 1;
    const nextSlot = draftOrder.find(s => s.pickOrder === nextPickOrder);

    if (!nextSlot) {
        // User was last in draft, can always edit (within draft window)
        return true;
    }

    // Check if next person has made their pick
    const nextHasPicked = completedPicks.some(
        p => p.userId === nextSlot.userId && p.draftRound === nextSlot.draftRound
    );

    return !nextHasPicked;
}

/**
 * Format draft order as text for copying to Teams
 */
export function formatDraftOrderForTeams(
    draftOrder: DraftOrderEntry[],
    completedPicks: { userId: string; draftRound: number }[] = []
): string {
    const lines: string[] = ['🏎️ **F1 Sweepstakes Draft Order**', ''];

    // Round 1
    lines.push('**Round 1:**');
    const round1 = draftOrder
        .filter(s => s.draftRound === 1)
        .sort((a, b) => a.pickOrder - b.pickOrder);

    round1.forEach(slot => {
        const hasPicked = completedPicks.some(
            p => p.userId === slot.userId && p.draftRound === 1
        );
        const status = hasPicked ? '✅' : '⬜';
        lines.push(`${slot.pickOrder}. ${status} ${slot.displayName}`);
    });

    lines.push('');

    // Round 2
    lines.push('**Round 2:**');
    const round2 = draftOrder
        .filter(s => s.draftRound === 2)
        .sort((a, b) => a.pickOrder - b.pickOrder);

    round2.forEach(slot => {
        const hasPicked = completedPicks.some(
            p => p.userId === slot.userId && p.draftRound === 2
        );
        const status = hasPicked ? '✅' : '⬜';
        lines.push(`${slot.pickOrder}. ${status} ${slot.displayName}`);
    });

    return lines.join('\n');
}

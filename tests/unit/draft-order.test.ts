import { describe, it, expect } from 'vitest';
import {
    shuffleArray,
    generateRandomDraftOrder,
    generatePerformanceDraftOrder,
    getCurrentPickSlot,
    canEditPick,
    formatDraftOrderForTeams,
} from '@/lib/draft-order';
import type { Profile } from '@/lib/types/database';

// Test fixtures
const createProfile = (id: string, name: string): Profile => ({
    id,
    email: `${name.toLowerCase()}@test.com`,
    display_name: name,
    is_admin: false,
    is_active: true,
    created_at: '',
    updated_at: '',
});

const mockPlayers: Profile[] = [
    createProfile('u1', 'Alice'),
    createProfile('u2', 'Bob'),
    createProfile('u3', 'Charlie'),
];

describe('shuffleArray', () => {
    it('shuffles array with seed for reproducibility', () => {
        const result1 = shuffleArray([1, 2, 3, 4, 5], 12345);
        const result2 = shuffleArray([1, 2, 3, 4, 5], 12345);

        expect(result1).toEqual(result2);
        expect(result1).not.toEqual([1, 2, 3, 4, 5]); // Should be shuffled
    });

    it('returns different order with different seed', () => {
        const result1 = shuffleArray([1, 2, 3, 4, 5], 11111);
        const result2 = shuffleArray([1, 2, 3, 4, 5], 22222);

        expect(result1).not.toEqual(result2);
    });

    it('preserves all elements', () => {
        const original = [1, 2, 3, 4, 5];
        const shuffled = shuffleArray(original, 12345);

        expect(shuffled.sort()).toEqual(original.sort());
    });
});

describe('generateRandomDraftOrder', () => {
    it('creates entries for both draft rounds', () => {
        const order = generateRandomDraftOrder(mockPlayers, 12345);

        expect(order.length).toBe(mockPlayers.length * 2); // 2 rounds
        expect(order.filter(e => e.draftRound === 1).length).toBe(3);
        expect(order.filter(e => e.draftRound === 2).length).toBe(3);
    });

    it('uses snake draft order (round 2 is reversed)', () => {
        const order = generateRandomDraftOrder(mockPlayers, 12345);

        const round1Order = order
            .filter(e => e.draftRound === 1)
            .sort((a, b) => a.pickOrder - b.pickOrder)
            .map(e => e.userId);

        const round2Order = order
            .filter(e => e.draftRound === 2)
            .sort((a, b) => a.pickOrder - b.pickOrder)
            .map(e => e.userId);

        // Round 2 should be reverse of round 1
        expect(round2Order).toEqual([...round1Order].reverse());
    });

    it('assigns sequential pick orders', () => {
        const order = generateRandomDraftOrder(mockPlayers, 12345);
        const pickOrders = order.map(e => e.pickOrder).sort((a, b) => a - b);

        expect(pickOrders).toEqual([1, 2, 3, 4, 5, 6]);
    });
});

describe('generatePerformanceDraftOrder', () => {
    it('orders by previous race points (worst first)', () => {
        const playersWithPoints = [
            { profile: createProfile('u1', 'Alice'), previousRacePoints: 25 },
            { profile: createProfile('u2', 'Bob'), previousRacePoints: 0 },
            { profile: createProfile('u3', 'Charlie'), previousRacePoints: 18 },
        ];

        const order = generatePerformanceDraftOrder(playersWithPoints);

        const round1Order = order
            .filter(e => e.draftRound === 1)
            .sort((a, b) => a.pickOrder - b.pickOrder)
            .map(e => e.displayName);

        // Worst (0) picks first, then 18, then 25
        expect(round1Order).toEqual(['Bob', 'Charlie', 'Alice']);
    });

    it('includes previous race points in entry', () => {
        const playersWithPoints = [
            { profile: createProfile('u1', 'Alice'), previousRacePoints: 25 },
        ];

        const order = generatePerformanceDraftOrder(playersWithPoints);

        expect(order[0].previousRacePoints).toBe(25);
    });
});

describe('getCurrentPickSlot', () => {
    it('returns first unpicked slot', () => {
        const draftOrder = generateRandomDraftOrder(mockPlayers, 12345);

        // No picks made yet
        const currentSlot = getCurrentPickSlot(draftOrder, []);

        expect(currentSlot).not.toBeNull();
        expect(currentSlot!.pickOrder).toBe(1);
        expect(currentSlot!.draftRound).toBe(1);
    });

    it('returns next slot after some picks', () => {
        const draftOrder = generateRandomDraftOrder(mockPlayers, 12345);
        const firstPicker = draftOrder.find(e => e.pickOrder === 1)!;

        const completedPicks = [
            { userId: firstPicker.userId, draftRound: 1 },
        ];

        const currentSlot = getCurrentPickSlot(draftOrder, completedPicks);

        expect(currentSlot!.pickOrder).toBe(2);
    });

    it('returns null when draft is complete', () => {
        const draftOrder = generateRandomDraftOrder(mockPlayers, 12345);

        const completedPicks = draftOrder.map(e => ({
            userId: e.userId,
            draftRound: e.draftRound,
        }));

        const currentSlot = getCurrentPickSlot(draftOrder, completedPicks);

        expect(currentSlot).toBeNull();
    });
});

describe('canEditPick', () => {
    it('returns true when next player has not picked yet', () => {
        const draftOrder = generateRandomDraftOrder(mockPlayers, 12345);
        const firstPicker = draftOrder.find(e => e.pickOrder === 1)!;

        const completedPicks = [
            { userId: firstPicker.userId, draftRound: 1, pickOrder: 1 },
        ];

        const canEdit = canEditPick(draftOrder, completedPicks, firstPicker.userId, 1);

        expect(canEdit).toBe(true);
    });

    it('returns false when next player has already picked', () => {
        const draftOrder = generateRandomDraftOrder(mockPlayers, 12345);
        const firstPicker = draftOrder.find(e => e.pickOrder === 1)!;
        const secondPicker = draftOrder.find(e => e.pickOrder === 2)!;

        const completedPicks = [
            { userId: firstPicker.userId, draftRound: 1, pickOrder: 1 },
            { userId: secondPicker.userId, draftRound: 1, pickOrder: 2 },
        ];

        const canEdit = canEditPick(draftOrder, completedPicks, firstPicker.userId, 1);

        expect(canEdit).toBe(false);
    });

    it('returns true for last picker in round', () => {
        const draftOrder = generateRandomDraftOrder(mockPlayers, 12345);
        const lastRound1Picker = draftOrder
            .filter(e => e.draftRound === 1)
            .sort((a, b) => b.pickOrder - a.pickOrder)[0];

        const completedPicks = [
            { userId: lastRound1Picker.userId, draftRound: 1, pickOrder: lastRound1Picker.pickOrder },
        ];

        const canEdit = canEditPick(draftOrder, completedPicks, lastRound1Picker.userId, 1);

        expect(canEdit).toBe(true);
    });
});

describe('formatDraftOrderForTeams', () => {
    it('formats draft order as Teams-friendly text', () => {
        const draftOrder = generateRandomDraftOrder(mockPlayers, 12345);

        const formatted = formatDraftOrderForTeams(draftOrder);

        expect(formatted).toContain('🏎️ **F1 Sweepstakes Draft Order**');
        expect(formatted).toContain('**Round 1:**');
        expect(formatted).toContain('**Round 2:**');
        expect(formatted).toContain('1. ⬜'); // Unpicked
    });

    it('shows checkmarks for completed picks', () => {
        const draftOrder = generateRandomDraftOrder(mockPlayers, 12345);
        const firstPicker = draftOrder.find(e => e.pickOrder === 1)!;

        const completedPicks = [
            { userId: firstPicker.userId, draftRound: 1 },
        ];

        const formatted = formatDraftOrderForTeams(draftOrder, completedPicks);

        expect(formatted).toContain('1. ✅');
        expect(formatted).toContain('2. ⬜');
    });
});

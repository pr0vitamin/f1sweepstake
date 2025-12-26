import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

// Test data - unique per run
const SEASON_YEAR = 9900 + Math.floor(Math.random() * 99);
const RACE_NAME = `E2E Draft Config Test ${Date.now()}`;
let createdSeasonId: string | null = null;
let createdRaceId: string | null = null;

test.describe.serial('Admin Draft Configuration', () => {
    test.beforeAll(async () => {
        // Create test season
        const { data: season, error: seasonError } = await supabase
            .from('seasons')
            .insert({ year: SEASON_YEAR, is_current: false })
            .select()
            .single();

        if (seasonError) throw new Error(`Failed to create test season: ${seasonError.message}`);
        createdSeasonId = season.id;

        // Create test race
        const { data: race, error: raceError } = await supabase
            .from('races')
            .insert({
                season_id: createdSeasonId,
                name: RACE_NAME,
                location: 'Test Circuit',
                race_date: '2099-12-31',
                round_number: 1,
                picks_open: false
            })
            .select()
            .single();

        if (raceError) throw new Error(`Failed to create test race: ${raceError.message}`);
        createdRaceId = race.id;
    });

    test('admin can access draft configuration page', async ({ page }) => {
        await page.goto(`/admin/races/${createdRaceId}/draft`);

        await expect(page.getByText('Draft Configuration')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(RACE_NAME)).toBeVisible();
        await expect(page.getByText('No draft order generated yet')).toBeVisible();
    });

    test('admin can generate random draft order', async ({ page }) => {
        await page.goto(`/admin/races/${createdRaceId}/draft`);

        // Click Randomize button
        const randomizeButton = page.getByRole('button', { name: /Randomize/i });
        await expect(randomizeButton).toBeVisible({ timeout: 10000 });

        // Accept confirmation dialog
        page.on('dialog', dialog => dialog.accept());
        await randomizeButton.click();

        // Wait for draft order to appear - look for Round 1 text (CardTitle)
        await expect(page.getByText('Round 1')).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('Round 2')).toBeVisible();

        // Verify in database
        await expect.poll(async () => {
            const { data: race } = await supabase
                .from('races')
                .select('draft_order')
                .eq('id', createdRaceId)
                .single();
            return race?.draft_order != null;
        }, { timeout: 10000 }).toBe(true);
    });

    test('admin can clear draft order', async ({ page }) => {
        await page.goto(`/admin/races/${createdRaceId}/draft`);

        // Wait for page to load
        await page.waitForLoadState('networkidle');

        // Clear button should be visible if draft was generated
        const clearButton = page.getByRole('button', { name: /Clear/i });

        if (await clearButton.isVisible()) {
            page.on('dialog', dialog => dialog.accept());
            await clearButton.click();

            await expect(page.getByText('No draft order generated yet')).toBeVisible({ timeout: 10000 });
        }
    });

    test.afterAll(async () => {
        // Cleanup in order
        if (createdRaceId) {
            await supabase.from('races').delete().eq('id', createdRaceId);
            console.log('Cleaned up test race:', RACE_NAME);
        }
        if (createdSeasonId) {
            await supabase.from('seasons').delete().eq('id', createdSeasonId);
            console.log('Cleaned up test season:', SEASON_YEAR);
        }
    });
});

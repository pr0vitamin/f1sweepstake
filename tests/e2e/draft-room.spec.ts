import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

// Test data - make unique per run
const uniqueId = Date.now();
const TEST_SEASON_YEAR = 8800 + Math.floor(Math.random() * 99);
const TEST_RACE_NAME = `E2E Draft Room ${uniqueId}`;
const TEST_TEAM_NAME = `E2E Team ${uniqueId}`;
const TEST_ROUND_NUMBER = 50 + Math.floor(Math.random() * 49); // Random round 50-98
const TEST_DRIVER = {
    first_name: 'E2E',
    last_name: `Driver${uniqueId}`,
    abbreviation: 'E2D',
    driver_number: 98
};

let testSeasonId: string | null = null;
let testRaceId: string | null = null;
let testTeamId: string | null = null;
let testDriverId: string | null = null;
let testUserId: string | null = null;

test.describe.serial('Draft Room', () => {
    test.beforeAll(async () => {
        // Get the test user ID (e2e-admin@test.com)
        const { data: users } = await supabase.auth.admin.listUsers();
        const testUser = users.users.find(u => u.email === 'e2e-admin@test.com');
        if (!testUser) throw new Error('Test user not found');
        testUserId = testUser.id;

        // Create test season
        const { data: newSeason, error: seasonError } = await supabase
            .from('seasons')
            .insert({ year: TEST_SEASON_YEAR, is_current: false })
            .select()
            .single();
        if (seasonError) throw seasonError;
        testSeasonId = newSeason.id;

        // Create test team
        const { data: team, error: teamError } = await supabase
            .from('teams')
            .insert({
                season_id: testSeasonId,
                name: TEST_TEAM_NAME,
                color: '#FF0000',
                is_active: true
            })
            .select()
            .single();
        if (teamError) throw teamError;
        testTeamId = team.id;

        // Create test driver
        const { data: driver, error: driverError } = await supabase
            .from('drivers')
            .insert({
                team_id: testTeamId,
                first_name: TEST_DRIVER.first_name,
                last_name: TEST_DRIVER.last_name,
                abbreviation: TEST_DRIVER.abbreviation,
                driver_number: TEST_DRIVER.driver_number,
                is_active: true
            })
            .select()
            .single();
        if (driverError) throw driverError;
        testDriverId = driver.id;

        // Create test race with draft order and picks open
        const draftOrder = [
            { userId: testUserId, displayName: 'E2E Admin', pickOrder: 1, draftRound: 1 },
            { userId: testUserId, displayName: 'E2E Admin', pickOrder: 2, draftRound: 2 }
        ];

        const { data: race, error: raceError } = await supabase
            .from('races')
            .insert({
                season_id: testSeasonId,
                name: TEST_RACE_NAME,
                location: 'Test Circuit',
                race_date: '2099-12-31',
                round_number: TEST_ROUND_NUMBER,
                picks_open: true,
                draft_order: draftOrder
            })
            .select()
            .single();
        if (raceError) throw raceError;
        testRaceId = race.id;
    });

    test('draft room shows when picks are open', async ({ page }) => {
        await page.goto('/draft');

        // Should see the draft room with the race name
        await expect(page.getByText(TEST_RACE_NAME)).toBeVisible({ timeout: 15000 });
    });

    test('draft room shows "Your Turn" for current picker', async ({ page }) => {
        await page.goto('/draft');

        // Should see Your Turn indicator since test user is first
        await expect(page.getByText(/Your Turn/i)).toBeVisible({ timeout: 10000 });
    });

    test('draft room displays available drivers', async ({ page }) => {
        await page.goto('/draft');

        // Should see the test driver
        await expect(page.getByText(TEST_DRIVER.last_name)).toBeVisible({ timeout: 10000 });
    });

    test('copy for teams button works', async ({ page }) => {
        await page.goto('/draft');

        const copyButton = page.getByRole('button', { name: /Copy for Teams/i });
        await expect(copyButton).toBeVisible({ timeout: 10000 });

        await copyButton.click();
        await expect(page.getByText(/Copied/i)).toBeVisible();
    });

    test.afterAll(async () => {
        // Cleanup in reverse order of dependencies
        if (testRaceId) {
            await supabase.from('picks').delete().eq('race_id', testRaceId);
            await supabase.from('races').delete().eq('id', testRaceId);
            console.log('Cleaned up test race:', TEST_RACE_NAME);
        }
        if (testDriverId) {
            await supabase.from('drivers').delete().eq('id', testDriverId);
            console.log('Cleaned up test driver');
        }
        if (testTeamId) {
            await supabase.from('teams').delete().eq('id', testTeamId);
            console.log('Cleaned up test team:', TEST_TEAM_NAME);
        }
        if (testSeasonId) {
            await supabase.from('seasons').delete().eq('id', testSeasonId);
            console.log('Cleaned up test season:', TEST_SEASON_YEAR);
        }
    });
});

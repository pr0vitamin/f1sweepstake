import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Create Supabase admin client for test data setup/cleanup
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Unique identifier for this test run
const TEST_ID = Date.now();

test.describe.serial('Admin Season Filter', () => {
    let currentSeasonId: string;
    let pastSeasonId: string;
    let teamId: string;

    test.beforeAll(async () => {
        // Create a past season (not current)
        const { data: pastSeason, error: pastSeasonError } = await supabase
            .from('seasons')
            .insert({ year: 2020, is_current: false })
            .select()
            .single();

        if (pastSeasonError) throw pastSeasonError;
        pastSeasonId = pastSeason.id;

        // Get the current season
        const { data: currentSeason } = await supabase
            .from('seasons')
            .select('*')
            .eq('is_current', true)
            .single();

        if (currentSeason) {
            currentSeasonId = currentSeason.id;
        } else {
            // Create one if none exists
            const { data: newSeason } = await supabase
                .from('seasons')
                .insert({ year: 2025, is_current: true })
                .select()
                .single();
            currentSeasonId = newSeason!.id;
        }

        // Create a test team in past season
        const { data: team, error: teamError } = await supabase
            .from('teams')
            .insert({
                name: `Past Season Team ${TEST_ID}`,
                season_id: pastSeasonId,
                color: '#FF0000'
            })
            .select()
            .single();

        if (teamError) throw teamError;
        teamId = team.id;
    });

    test.afterAll(async () => {
        // Clean up test data
        if (teamId) {
            await supabase.from('teams').delete().eq('id', teamId);
            console.log(`Cleaned up test team: Past Season Team ${TEST_ID}`);
        }
        if (pastSeasonId) {
            await supabase.from('seasons').delete().eq('id', pastSeasonId);
            console.log('Cleaned up test season: 2020');
        }
    });

    test('season selector is visible on teams page', async ({ page }) => {
        await page.goto('/admin/teams');

        // Should see the season selector
        await expect(page.getByText('Season:')).toBeVisible({ timeout: 10000 });
        await expect(page.getByRole('combobox')).toBeVisible();
    });

    test('can switch seasons and URL updates', async ({ page }) => {
        await page.goto('/admin/teams');

        // Click the season dropdown
        await page.getByRole('combobox').click();

        // Select the 2020 season
        await page.getByRole('option', { name: '2020' }).click();

        // URL should update with season parameter
        await expect(page).toHaveURL(/season=/);

        // Should see our test team from 2020
        await expect(page.getByText(`Past Season Team ${TEST_ID}`)).toBeVisible({ timeout: 10000 });
    });

    test('Add button is hidden when viewing past season', async ({ page }) => {
        // Navigate directly to past season
        await page.goto(`/admin/teams?season=${pastSeasonId}`);

        // Wait for page to load
        await expect(page.getByText(`Past Season Team ${TEST_ID}`)).toBeVisible({ timeout: 10000 });

        // Add Team button should NOT be visible
        await expect(page.getByRole('link', { name: /Add Team/i })).not.toBeVisible();
    });

    test('Add button is visible when viewing current season', async ({ page }) => {
        // Navigate to current season
        await page.goto(`/admin/teams?season=${currentSeasonId}`);

        // Wait for page to load
        await expect(page.locator('h1').getByText('Teams')).toBeVisible({ timeout: 10000 });

        // Add Team button SHOULD be visible
        await expect(page.getByRole('link', { name: /Add Team/i })).toBeVisible();
    });

    test('admin header has back to app link', async ({ page }) => {
        await page.goto('/admin');

        // Should see back link
        const backLink = page.getByRole('link', { name: /Back to App/i });
        await expect(backLink).toBeVisible({ timeout: 10000 });

        // Click it and verify navigation
        await backLink.click();
        await expect(page).toHaveURL(/\/dashboard/);
    });
});

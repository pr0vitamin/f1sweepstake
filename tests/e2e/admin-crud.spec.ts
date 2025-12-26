import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars for direct DB access
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

// Use a unique name to avoid collisions if run multiple times
const TEAM_NAME = `Test Team ${Date.now()}`;
const TEAM_COLOR = '#FF5733';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

test('admin can create a new team (verified in DB)', async ({ page }) => {
    // 1. Navigate to Teams page
    await page.goto('/admin/teams');

    // 2. Click "Add Team"
    await page.getByRole('link', { name: 'Add Team' }).click();
    await expect(page).toHaveURL(/\/admin\/teams\/new/);

    // 3. Fill Form
    await page.getByLabel('Team Name').fill(TEAM_NAME);
    await page.getByLabel('Color (Hex)').fill(TEAM_COLOR);
    await page.getByLabel('Active').check(); // Ensure it's active

    // 4. Submit
    await page.getByRole('button', { name: 'Create Team' }).click();

    // 5. Verify Redirect
    await expect(page).toHaveURL(/\/admin\/teams/);

    // 6. Verify Data in Database (More reliable than UI flake)
    // Retry a few times using expect.poll to handle slight DB latency
    await expect.poll(async () => {
        const { data } = await supabase
            .from('teams')
            .select('*')
            .eq('name', TEAM_NAME)
            .single();
        return data ? data.name : null;
    }, {
        timeout: 10000,
    }).toBe(TEAM_NAME);
});

test.afterAll(async () => {
    // Cleanup: Delete the test team to avoid polluting the database
    const { error } = await supabase
        .from('teams')
        .delete()
        .eq('name', TEAM_NAME);

    if (error) {
        console.error('Failed to clean up test team:', error);
    } else {
        console.log('Cleaned up test team:', TEAM_NAME);
    }
});

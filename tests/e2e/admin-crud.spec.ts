import { test, expect } from '@playwright/test';

// Use a unique name to avoid collisions if run multiple times
const TEAM_NAME = `Test Team ${Date.now()}`;
const TEAM_COLOR = '#FF5733';

test('admin can create and verify a new team', async ({ page }) => {
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

    // 5. Verify Redirect and Data
    await expect(page).toHaveURL(/\/admin\/teams/);
    await expect(page.getByText(TEAM_NAME)).toBeVisible();

    // Optional: Cleanup? 
    // For now, we leave it. Ideally we'd use a separate cleanup step or transactional tests.
});

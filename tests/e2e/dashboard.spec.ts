import { test, expect } from '@playwright/test';

test.describe('Dashboard Pages', () => {
    test('dashboard home page loads with welcome message', async ({ page }) => {
        await page.goto('/dashboard');

        // Should see welcome message (user is authenticated via storageState)
        await expect(page.getByText(/Welcome back/i)).toBeVisible({ timeout: 10000 });
    });

    test('dashboard shows navigation links', async ({ page }) => {
        await page.goto('/dashboard');

        // Should see navigation
        await expect(page.getByRole('link', { name: 'Draft' })).toBeVisible({ timeout: 10000 });
        await expect(page.getByRole('link', { name: 'Leaderboard' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Races' })).toBeVisible();
    });

    test('dashboard home page shows overview content', async ({ page }) => {
        await page.goto('/dashboard');

        // Should see welcome heading and content
        await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
    });

    test('leaderboard page loads', async ({ page }) => {
        await page.goto('/leaderboard');

        // Should see leaderboard heading (first h1)
        await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
    });

    test('races calendar page loads', async ({ page }) => {
        await page.goto('/races');

        // Should see races heading (first h1)
        await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
    });

    test('draft page shows appropriate message', async ({ page }) => {
        await page.goto('/draft');

        // Page should load and have some content
        await expect(page.locator('body')).not.toBeEmpty();
    });

    test('navigation works between pages', async ({ page }) => {
        await page.goto('/dashboard');

        // Navigate to Leaderboard
        await page.getByRole('link', { name: 'Leaderboard' }).click();
        await expect(page).toHaveURL(/\/leaderboard/);

        // Navigate to Races
        await page.getByRole('link', { name: 'Races' }).click();
        await expect(page).toHaveURL(/\/races/);

        // Navigate back to Dashboard
        await page.getByRole('link', { name: 'Home' }).click();
        await expect(page).toHaveURL(/\/dashboard/);
    });

    test('admin link visible for admin users', async ({ page }) => {
        await page.goto('/dashboard');

        // The test user is an admin, so should see Admin link
        await expect(page.getByRole('link', { name: 'Admin' })).toBeVisible({ timeout: 10000 });
    });
});

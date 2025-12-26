import { test, expect } from '@playwright/test';

// This test uses the global storageState, so it should be authenticated as Admin
test('authenticated admin can access admin dashboard', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByText('Admin Dashboard')).toBeVisible();
});

test.describe('unauthenticated', () => {
    // Reset storage state for this group to simulate logged out user
    test.use({ storageState: { cookies: [], origins: [] } });

    test('unauthenticated user is redirected to login when accessing admin', async ({ page }) => {
        await page.goto('/admin');
        await expect(page).toHaveURL(/\/auth\/login/);
    });
});

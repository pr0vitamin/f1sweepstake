import { chromium, FullConfig } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

async function globalSetup(config: FullConfig) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Supabase URL or Service Role Key is missing. Please add SUPABASE_SERVICE_ROLE_KEY to .env.local');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

    const testEmail = 'e2e-admin@test.com';

    // 1. Ensure the user exists (or create them)
    const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
        email: testEmail,
        email_confirm: true,
        user_metadata: { full_name: 'E2E Admin' }
    });

    if (createError && createError.code !== 'email_exists') {
        console.error('Error creating test user:', createError);
        throw createError;
    }

    // Need to get the user ID if they already existed
    let userId = user?.id;

    if (!userId) {
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers.users.find(u => u.email === testEmail);
        if (existingUser) userId = existingUser.id;
    }

    // Ensure Admin Role
    if (userId) {
        const { error: profileError } = await supabase
            .from('profiles')
            .update({ is_admin: true })
            .eq('id', userId);

        if (profileError) {
            console.warn('Could not update profile to admin:', profileError);
        }
    }

    // 2. Generate Magic Link
    const { data, error } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: testEmail,
        options: {
            redirectTo: 'http://localhost:3000/auth/callback'
        }
    });

    if (error || !data.properties?.action_link) {
        throw new Error('Failed to generate magic link');
    }

    const actionLink = data.properties.action_link;
    console.log('Generated magic link for E2E:', actionLink);

    // 3. Login using Playwright to save storage state
    const browser = await chromium.launch();
    const page = await browser.newPage();

    await page.goto(actionLink);

    // Wait for the redirect and successful login
    try {
        // Wait until we are NO LONGER on the verifying URL
        await page.waitForURL((url) => {
            return !url.toString().includes('verify') && !url.toString().includes('callback');
        }, { timeout: 15000 });

        // Wait for a secure cookie to be set? Or just a small buffer
        await page.waitForTimeout(2000);

        // Specifically check if we are on login page again (failure)
        if (page.url().includes('/auth/login')) {
            console.error('Redirected back to login page. Auth failed.');
        } else {
            console.log('Successfully logged in, current URL:', page.url());
        }

    } catch (e) {
        console.error('Timed out waiting for login redirect. Current URL:', page.url());
    }

    // Save state
    await page.context().storageState({ path: path.join(__dirname, 'storage-state.json') });

    await browser.close();
}

export default globalSetup;

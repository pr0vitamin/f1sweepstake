import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock Supabase client for tests
vi.mock('@/lib/supabase/client', () => ({
    createClient: vi.fn(() => ({
        from: vi.fn(() => ({
            select: vi.fn(),
            insert: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        })),
        auth: {
            getUser: vi.fn(),
            signInWithOtp: vi.fn(),
            signOut: vi.fn(),
        },
    })),
}));

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(() => ({
        from: vi.fn(() => ({
            select: vi.fn(),
            insert: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        })),
        auth: {
            getUser: vi.fn(),
        },
    })),
}));

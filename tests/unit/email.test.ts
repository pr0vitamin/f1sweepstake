import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSendMail = vi.fn();

vi.mock('nodemailer', () => ({
    default: {
        createTransport: () => ({
            sendMail: mockSendMail,
        }),
    },
}));

import { sendDraftTurnEmail } from '@/lib/email';

describe('sendDraftTurnEmail', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSendMail.mockResolvedValue({ messageId: 'test-123' });
    });

    it('sends an email with correct parameters', async () => {
        const result = await sendDraftTurnEmail(
            'alice@test.com',
            'Alice',
            'Australian Grand Prix'
        );

        expect(result).toBe(true);
        expect(mockSendMail).toHaveBeenCalledOnce();

        const call = mockSendMail.mock.calls[0][0];
        expect(call.to).toBe('alice@test.com');
        expect(call.subject).toContain('Australian Grand Prix');
        expect(call.html).toContain('Alice');
        expect(call.html).toContain('Australian Grand Prix');
        expect(call.html).toContain('/draft');
    });

    it('returns false and does not throw on send failure', async () => {
        mockSendMail.mockRejectedValue(new Error('SMTP connection failed'));

        const result = await sendDraftTurnEmail(
            'alice@test.com',
            'Alice',
            'Australian Grand Prix'
        );

        expect(result).toBe(false);
    });

    it('includes the race emoji in the subject', async () => {
        await sendDraftTurnEmail('bob@test.com', 'Bob', 'Monaco Grand Prix');

        const call = mockSendMail.mock.calls[0][0];
        expect(call.subject).toBe('🏎️ Your Turn to Pick — Monaco Grand Prix');
    });
});

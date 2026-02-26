import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_PORT === '465',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }
    return transporter;
}

/**
 * Send a "your turn to pick" email to a player.
 * Errors are caught and logged — email failures must never block the draft.
 */
export async function sendDraftTurnEmail(
    to: string,
    playerName: string,
    raceName: string
): Promise<boolean> {
    const appUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';
    const draftUrl = `${appUrl}/draft`;

    try {
        await getTransporter().sendMail({
            from: process.env.SMTP_FROM || 'F1 Sweepstake <noreply@example.com>',
            to,
            subject: `🏎️ Your Turn to Pick — ${raceName}`,
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
                    <h1 style="font-size: 24px; margin: 0 0 16px;">Hey ${playerName}! 👋</h1>
                    <p style="font-size: 16px; color: #374151; line-height: 1.5; margin: 0 0 24px;">
                        It's your turn to pick a driver for the <strong>${raceName}</strong> draft. Don't keep everyone waiting!
                    </p>
                    <a href="${draftUrl}" style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                        Make Your Pick
                    </a>
                    <p style="font-size: 13px; color: #9ca3af; margin-top: 32px;">
                        This is an automated notification from F1 Sweepstake.
                    </p>
                </div>
            `,
        });
        console.log(`[email] Draft turn email sent to ${to} for race "${raceName}"`);
        return true;
    } catch (error) {
        console.error(`[email] Failed to send draft turn email to ${to}:`, error);
        return false;
    }
}

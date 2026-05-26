const { sendWhatsAppMessage } = require('./whatsapp');

// web-push is optional — gracefully skip if not installed yet
let webpush = null;
try {
    webpush = require('web-push');
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        webpush.setVapidDetails(
            `mailto:${process.env.SMTP_FROM || 'hello@tensee.my'}`,
            process.env.VAPID_PUBLIC_KEY,
            process.env.VAPID_PRIVATE_KEY
        );
        console.log('[Pager] Web Push configured ✓');
    }
} catch (e) {
    console.warn('[Pager] web-push not installed — browser push disabled. Run: npm install web-push');
}

// ── PUSH NOTIFICATION (browser) ──────────────────────────────────────────────
async function sendPush(agent, payload) {
    try {
        if (!webpush) return;
        if (!agent.pushSubscription) return;
        if (!process.env.VAPID_PUBLIC_KEY) return;

        await webpush.sendNotification(
            agent.pushSubscription,
            JSON.stringify(payload)
        );
        console.log(`[Pager] Push sent to ${agent.name || agent.username}`);
    } catch (err) {
        // Subscription expired or invalid — don't crash
        if (err.statusCode === 410) {
            console.log(`[Pager] Push subscription gone for ${agent.name || agent.username}`);
        } else {
            console.error('[Pager] Push error:', err.message);
        }
    }
}

// ── WHATSAPP PAGER ────────────────────────────────────────────────────────────
async function sendWhatsAppAlert(agent, session) {
    try {
        const phone = agent.notificationSettings?.phoneNumber;
        if (!phone) return;
        if (!agent.notificationSettings?.whatsappAlerts) return;

        const waitSecs = session.queueEnteredAt
            ? Math.round((Date.now() - new Date(session.queueEnteredAt).getTime()) / 1000)
            : 0;
        const waitStr = waitSecs > 60 ? `${Math.round(waitSecs / 60)}m` : `${waitSecs}s`;

        const msg = `🔔 *Ten&See Live Chat*\n\nVisitor: *${session.name || 'Anonymous'}*\nTopic: ${session.topic || 'General'}\nWaited: ${waitStr}\n\nOpen your dashboard to respond:\nhttps://tensee.my/admin\n\n_You have 90 seconds before the chat rotates._`;

        await sendWhatsAppMessage(phone, msg);
        console.log(`[Pager] WhatsApp sent to ${agent.name || agent.username} (${phone})`);
    } catch (err) {
        console.error('[Pager] WhatsApp error:', err.message);
    }
}

// ── EMAIL ALERT ───────────────────────────────────────────────────────────────
async function sendEmailAlert(agent, session) {
    try {
        if (!agent.email) return;
        if (!agent.notificationSettings?.emailAlerts) return;

        const html = `
        <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:20px;">
            <div style="background:#2C3830;padding:16px 20px;border-radius:8px 8px 0 0;">
                <h2 style="color:#c9a84c;margin:0;font-size:1rem;">🔔 Live Chat Assigned — Ten&amp;See</h2>
            </div>
            <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:20px;border-radius:0 0 8px 8px;">
                <p style="margin:0 0 12px 0;color:#374151;">A visitor has been assigned to you:</p>
                <table style="width:100%;border-collapse:collapse;">
                    <tr><td style="padding:6px 0;color:#6b7280;font-size:0.85rem;">Name</td><td style="padding:6px 0;font-weight:600;">${session.name || 'Anonymous'}</td></tr>
                    <tr><td style="padding:6px 0;color:#6b7280;font-size:0.85rem;">Email</td><td style="padding:6px 0;">${session.email || '—'}</td></tr>
                    <tr><td style="padding:6px 0;color:#6b7280;font-size:0.85rem;">Phone</td><td style="padding:6px 0;">${session.phone || '—'}</td></tr>
                    <tr><td style="padding:6px 0;color:#6b7280;font-size:0.85rem;">Topic</td><td style="padding:6px 0;">${session.topic || 'General'}</td></tr>
                </table>
                <div style="margin-top:20px;">
                    <a href="https://tensee.my/admin" style="background:#c9a84c;color:#1C2420;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:600;display:inline-block;">Open Chat Dashboard →</a>
                </div>
                <p style="margin-top:16px;font-size:0.8rem;color:#9ca3af;">You have 90 seconds to respond before the chat is reassigned.</p>
            </div>
        </div>`;

        // Use nodemailer directly via transporter
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        });

        await transporter.sendMail({
            from: process.env.SMTP_FROM || 'hello@tensee.my',
            to: agent.email,
            subject: `[Chat] ${session.name || 'Visitor'} is waiting — Ten&See`,
            html
        });
        console.log(`[Pager] Email sent to ${agent.email}`);
    } catch (err) {
        console.error('[Pager] Email error:', err.message);
    }
}

// ── SLA BREACH ESCALATION ─────────────────────────────────────────────────────
async function notifySLABreach(agent, session) {
    try {
        const pushPayload = {
            title: '⚠️ SLA Breach — Respond Now',
            body: `${session.name || 'Visitor'} is still waiting. Chat will rotate soon.`,
            tag: `sla_${session.sessionId}`,
            requireInteraction: true,
            url: 'https://tensee.my/admin',
            sessionId: session.sessionId
        };
        await sendPush(agent, pushPayload);

        // Re-send WhatsApp for SLA breach
        const phone = agent.notificationSettings?.phoneNumber;
        if (phone && agent.notificationSettings?.whatsappAlerts) {
            const msg = `⚠️ *SLA BREACH — Ten&See*\n\n${session.name || 'Visitor'} has been waiting too long. Chat will rotate to another agent.\n\nOpen now: https://tensee.my/admin`;
            await sendWhatsAppMessage(phone, msg).catch(() => {});
        }
    } catch (err) {
        console.error('[Pager] notifySLABreach error:', err.message);
    }
}

// ── MAIN NOTIFICATION DISPATCHER ─────────────────────────────────────────────
// Called by chatQueue.js when a chat is assigned to an agent
async function notifyAssignment(agent, session) {
    const promises = [];

    // Push notification (immediate)
    if (agent.notificationSettings?.pushEnabled !== false) {
        promises.push(sendPush(agent, {
            title: '💬 New Chat Assigned',
            body: `${session.name || 'Visitor'}: ${session.topic || 'General query'}`,
            tag: `assign_${session.sessionId}`,
            requireInteraction: true,
            url: 'https://tensee.my/admin',
            sessionId: session.sessionId,
            actions: [
                { action: 'accept', title: 'Open Chat' }
            ]
        }));
    }

    // WhatsApp (immediate)
    promises.push(sendWhatsAppAlert(agent, session));

    // Email (fire-and-forget, slight delay is fine)
    promises.push(sendEmailAlert(agent, session));

    await Promise.allSettled(promises);
}

module.exports = {
    notifyAssignment,
    notifySLABreach,
    sendPush,
    sendWhatsAppAlert,
    sendEmailAlert
};

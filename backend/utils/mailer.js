import nodemailer from 'nodemailer';

export function getTransport() {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
    return nodemailer.createTransport({
        host:   SMTP_HOST,
        port:   Number(SMTP_PORT) || 587,
        secure: Number(SMTP_PORT) === 465,
        auth:   { user: SMTP_USER, pass: SMTP_PASS },
    });
}

export async function sendMail({ to, subject, html }) {
    const transport = getTransport();
    if (!transport) {
        console.warn('[mailer] SMTP not configured – skipping email to:', to);
        return;
    }
    await transport.sendMail({
        from: `"InterviewIQ" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
    });
}

export async function sendPlacementQualificationEmails({ student, org, drive, bestScore }) {
    const scoreDisplay = typeof bestScore === 'number' ? bestScore.toFixed(1) : bestScore;

    const studentHtml = `
        <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">
            <h2 style="color:#2563eb;">Congratulations, ${student.name}!</h2>
            <p>You have qualified for the placement drive and earned your certificate.</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                <tr><td style="padding:8px;font-weight:bold;color:#374151;">Company</td><td style="padding:8px;">${drive.companyName}</td></tr>
                <tr style="background:#f9fafb;"><td style="padding:8px;font-weight:bold;color:#374151;">Job Role</td><td style="padding:8px;">${drive.jobRole}</td></tr>
                <tr><td style="padding:8px;font-weight:bold;color:#374151;">Your Best Score</td><td style="padding:8px;color:#16a34a;font-weight:bold;">${scoreDisplay}%</td></tr>
                <tr style="background:#f9fafb;"><td style="padding:8px;font-weight:bold;color:#374151;">Minimum Required Score</td><td style="padding:8px;">${drive.minScore}%</td></tr>
            </table>
            <p style="color:#6b7280;font-size:14px;">Keep up the great work! Log in to your dashboard to view your certificate.</p>
        </div>
    `;

    const adminHtml = `
        <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">
            <h2 style="color:#2563eb;">Placement Drive – New Qualified Candidate</h2>
            <p>A student has qualified for the following drive:</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                <tr><td style="padding:8px;font-weight:bold;color:#374151;">Student Name</td><td style="padding:8px;">${student.name}</td></tr>
                <tr style="background:#f9fafb;"><td style="padding:8px;font-weight:bold;color:#374151;">Student Email</td><td style="padding:8px;">${student.email}</td></tr>
                <tr><td style="padding:8px;font-weight:bold;color:#374151;">Company</td><td style="padding:8px;">${drive.companyName}</td></tr>
                <tr style="background:#f9fafb;"><td style="padding:8px;font-weight:bold;color:#374151;">Job Role</td><td style="padding:8px;">${drive.jobRole}</td></tr>
                <tr><td style="padding:8px;font-weight:bold;color:#374151;">Best Score</td><td style="padding:8px;color:#16a34a;font-weight:bold;">${scoreDisplay}%</td></tr>
                <tr style="background:#f9fafb;"><td style="padding:8px;font-weight:bold;color:#374151;">Minimum Required Score</td><td style="padding:8px;">${drive.minScore}%</td></tr>
            </table>
            <p style="color:#6b7280;font-size:14px;">Log in to your admin dashboard to view all qualified candidates.</p>
        </div>
    `;

    const sends = [];

    if (student.email) {
        sends.push(
            sendMail({
                to:      student.email,
                subject: `You've qualified for ${drive.companyName} – ${drive.jobRole}!`,
                html:    studentHtml,
            })
        );
    }

    const adminEmails = [];
    if (org?.contactEmail) adminEmails.push(org.contactEmail);
    if (org?.digestConfig?.emails?.length) {
        for (const e of org.digestConfig.emails) {
            if (e && !adminEmails.includes(e)) adminEmails.push(e);
        }
    }

    if (adminEmails.length === 0) {
        console.warn(
            `[mailer] No admin email configured for org ${drive.orgId} – skipping admin notification for drive ${drive._id}`
        );
    } else {
        for (const adminEmail of adminEmails) {
            sends.push(
                sendMail({
                    to:      adminEmail,
                    subject: `[Placement Drive] ${student.name} has qualified for ${drive.companyName}`,
                    html:    adminHtml,
                })
            );
        }
    }

    await Promise.allSettled(sends);
}

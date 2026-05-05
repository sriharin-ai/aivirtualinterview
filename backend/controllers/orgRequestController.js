import asyncHandler from 'express-async-handler';
import nodemailer from 'nodemailer';

const sendNotification = async (subject, html) => {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return;
    const transporter = nodemailer.createTransport({
        host:   process.env.SMTP_HOST,
        port:   Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to:   process.env.SMTP_FROM || process.env.SMTP_USER,
        subject,
        html,
    });
};

const sendConfirmation = async (to, name, subject, body) => {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return;
    const transporter = nodemailer.createTransport({
        host:   process.env.SMTP_HOST,
        port:   Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
        from:    process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
    <div style="background:#14b8a6;width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;">
      <span style="color:#0f172a;font-weight:900;font-size:16px;">AI</span>
    </div>
    <span style="font-weight:900;font-size:16px;color:#0f172a;letter-spacing:-0.5px;">AI <span style="color:#14b8a6;">INT</span>erviewer</span>
  </div>
  ${body}
  <p style="font-size:11px;color:#94a3b8;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:16px;">
    AI Interviewer · <a href="${process.env.APP_URL || ''}" style="color:#14b8a6;">${process.env.APP_URL || 'aiinterviewer.app'}</a>
  </p>
</div>`,
    });
};

export const submitOrgSignup = asyncHandler(async (req, res) => {
    const { orgName, orgType, country, contactEmail, adminName, phone, plan, teamSize, message } = req.body;
    if (!orgName || !contactEmail || !adminName) {
        res.status(400); throw new Error('Organization name, contact name, and email are required.');
    }

    try {
        await sendConfirmation(
            contactEmail, adminName,
            '✅ We received your AI Interviewer sign-up request',
            `<h2 style="color:#0f172a;margin-bottom:4px;">Thanks, ${adminName}!</h2>
<p style="color:#64748b;margin-top:0;">We've received your sign-up request for <strong>${orgName}</strong>.</p>
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:20px 0;">
  <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.06em;">Your Request Details</p>
  <table style="width:100%;font-size:13px;color:#475569;border-collapse:collapse;margin-top:8px;">
    <tr><td style="padding:4px 0;color:#94a3b8;width:120px;">Organization</td><td><strong style="color:#0f172a;">${orgName}</strong></td></tr>
    <tr><td style="padding:4px 0;color:#94a3b8;">Type</td><td style="text-transform:capitalize;">${orgType}</td></tr>
    <tr><td style="padding:4px 0;color:#94a3b8;">Plan</td><td style="text-transform:capitalize;">${plan}</td></tr>
    <tr><td style="padding:4px 0;color:#94a3b8;">Country</td><td>${country || '—'}</td></tr>
    <tr><td style="padding:4px 0;color:#94a3b8;">Team Size</td><td>${teamSize || '—'}</td></tr>
  </table>
</div>
<p style="color:#475569;font-size:14px;line-height:1.6;">Our team will review your request and send your <strong>org credentials (org code + admin login)</strong> to this email within <strong>24 hours</strong>.</p>
<p style="color:#475569;font-size:14px;">In the meantime, if you have any questions just reply to this email.</p>`
        );

        await sendNotification(
            `🆕 Org Sign-Up: ${orgName} (${plan} · ${orgType})`,
            `<h2>New Org Sign-Up Request</h2>
<table style="font-size:13px;color:#475569;border-collapse:collapse;">
  <tr><td style="padding:4px 8px 4px 0;color:#94a3b8;">Org Name</td><td><strong>${orgName}</strong></td></tr>
  <tr><td style="padding:4px 8px 4px 0;color:#94a3b8;">Type</td><td>${orgType}</td></tr>
  <tr><td style="padding:4px 8px 4px 0;color:#94a3b8;">Plan</td><td>${plan}</td></tr>
  <tr><td style="padding:4px 8px 4px 0;color:#94a3b8;">Contact</td><td>${adminName}</td></tr>
  <tr><td style="padding:4px 8px 4px 0;color:#94a3b8;">Email</td><td>${contactEmail}</td></tr>
  <tr><td style="padding:4px 8px 4px 0;color:#94a3b8;">Phone</td><td>${phone || '—'}</td></tr>
  <tr><td style="padding:4px 8px 4px 0;color:#94a3b8;">Country</td><td>${country || '—'}</td></tr>
  <tr><td style="padding:4px 8px 4px 0;color:#94a3b8;">Team Size</td><td>${teamSize || '—'}</td></tr>
  <tr><td style="padding:4px 8px 4px 0;color:#94a3b8;">Message</td><td>${message || '—'}</td></tr>
</table>`
        );
    } catch (e) {
        console.error('[org-signup email]', e.message);
    }

    res.status(201).json({ success: true, message: 'Sign-up request received. Check your email for confirmation.' });
});

export const submitDemoRequest = asyncHandler(async (req, res) => {
    const { name, email, company, country, phone, teamSize, interest, message } = req.body;
    if (!name || !email || !company) {
        res.status(400); throw new Error('Name, email, and company are required.');
    }

    try {
        await sendConfirmation(
            email, name,
            '📅 Your AI Interviewer demo is being scheduled',
            `<h2 style="color:#0f172a;margin-bottom:4px;">Thanks, ${name}!</h2>
<p style="color:#64748b;margin-top:0;">We've received your demo request for <strong>${company}</strong>.</p>
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:20px 0;">
  <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.06em;">Your Request</p>
  <table style="width:100%;font-size:13px;color:#475569;border-collapse:collapse;margin-top:8px;">
    <tr><td style="padding:4px 0;color:#94a3b8;width:120px;">Organization</td><td><strong style="color:#0f172a;">${company}</strong></td></tr>
    <tr><td style="padding:4px 0;color:#94a3b8;">Interest</td><td>${interest || '—'}</td></tr>
    <tr><td style="padding:4px 0;color:#94a3b8;">Team Size</td><td>${teamSize || '—'}</td></tr>
    <tr><td style="padding:4px 0;color:#94a3b8;">Country</td><td>${country || '—'}</td></tr>
  </table>
</div>
<p style="color:#475569;font-size:14px;line-height:1.6;">A member of our team will reach out to you at <strong>${email}</strong> within <strong>1 business day</strong> to schedule your personalized demo.</p>
<p style="color:#475569;font-size:14px;">Can't wait? Reply to this email and we'll get back to you even faster.</p>`
        );

        await sendNotification(
            `📅 Demo Request: ${company} — ${name}`,
            `<h2>New Demo Request</h2>
<table style="font-size:13px;color:#475569;border-collapse:collapse;">
  <tr><td style="padding:4px 8px 4px 0;color:#94a3b8;">Name</td><td><strong>${name}</strong></td></tr>
  <tr><td style="padding:4px 8px 4px 0;color:#94a3b8;">Email</td><td>${email}</td></tr>
  <tr><td style="padding:4px 8px 4px 0;color:#94a3b8;">Company</td><td>${company}</td></tr>
  <tr><td style="padding:4px 8px 4px 0;color:#94a3b8;">Country</td><td>${country || '—'}</td></tr>
  <tr><td style="padding:4px 8px 4px 0;color:#94a3b8;">Phone</td><td>${phone || '—'}</td></tr>
  <tr><td style="padding:4px 8px 4px 0;color:#94a3b8;">Team Size</td><td>${teamSize || '—'}</td></tr>
  <tr><td style="padding:4px 8px 4px 0;color:#94a3b8;">Interest</td><td>${interest || '—'}</td></tr>
  <tr><td style="padding:4px 8px 4px 0;color:#94a3b8;">Message</td><td>${message || '—'}</td></tr>
</table>`
        );
    } catch (e) {
        console.error('[demo-request email]', e.message);
    }

    res.status(201).json({ success: true, message: 'Demo request received. We\'ll be in touch within 1 business day.' });
});

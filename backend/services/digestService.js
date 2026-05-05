import mongoose from 'mongoose';
import Organization from '../models/OrganizationModel.js';
import User from '../models/User.js';
import Session from '../models/SessionModel.js';
import { getTransport } from '../utils/mailer.js';

// ─── Data fetcher ─────────────────────────────────────────────────────────────
async function fetchOrgData(orgId) {
    const id = new mongoose.Types.ObjectId(orgId);

    const students = await User.aggregate([
        { $match: { orgId: id } },
        { $lookup: { from: 'sessions', localField: '_id', foreignField: 'user', as: 'sessions' } },
        {
            $addFields: {
                completedSessions: { $size: { $filter: { input: '$sessions', as: 's', cond: { $eq: ['$$s.status', 'completed'] } } } },
                avgScore: {
                    $cond: {
                        if:   { $gt: [{ $size: { $filter: { input: '$sessions', as: 's', cond: { $gt: ['$$s.overallScore', 0] } } } }, 0] },
                        then: { $avg: { $map: { input: { $filter: { input: '$sessions', as: 's', cond: { $gt: ['$$s.overallScore', 0] } } }, as: 's', in: '$$s.overallScore' } } },
                        else: null,
                    },
                },
                roleSessions: {
                    $filter: {
                        input: '$sessions', as: 's',
                        cond: {
                            $and: [
                                { $eq: ['$$s.status', 'completed'] },
                                { $gt:  ['$$s.overallScore', 0] },
                                { $eq: ['$$s.role',  '$preferredRole'] },
                                { $eq: ['$$s.level', '$preferredLevel'] },
                            ],
                        },
                    },
                },
            },
        },
        {
            $addFields: {
                readinessScore: {
                    $cond: {
                        if:   { $gt: [{ $size: '$roleSessions' }, 0] },
                        then: { $avg: { $map: { input: '$roleSessions', as: 's', in: '$$s.overallScore' } } },
                        else: null,
                    },
                },
            },
        },
        { $project: { password: 0, sessions: 0, roleSessions: 0 } },
    ]);

    const sessionStats = await Session.aggregate([
        { $match: { orgId: id } },
        {
            $group: {
                _id: null,
                total:     { $sum: 1 },
                completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            },
        },
    ]);

    return { students, sessionStats: sessionStats[0] || { total: 0, completed: 0 } };
}

// ─── HTML builder ─────────────────────────────────────────────────────────────
function buildReportHTML(org, students, sessionStats) {
    const isCorporate  = org.type === 'corporate';
    const dateStr      = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const scoreLabel   = v => v == null ? '—' : `${Math.round(v)}%`;
    const scoreColor   = v => v == null ? '#94a3b8' : v >= 70 ? '#16a34a' : v >= 40 ? '#d97706' : '#dc2626';

    const withSessions  = students.filter(s => s.completedSessions > 0);
    const overallAvg    = withSessions.length ? Math.round(withSessions.reduce((a, s) => a + (s.avgScore || 0), 0) / withSessions.length) : null;
    const withReadiness = isCorporate ? students.filter(s => s.readinessScore != null) : [];
    const avgReadiness  = withReadiness.length ? Math.round(withReadiness.reduce((a, s) => a + s.readinessScore, 0) / withReadiness.length) : null;

    const topPerformers = [...students]
        .filter(s => isCorporate ? s.readinessScore != null : s.avgScore != null)
        .sort((a, b) => isCorporate ? b.readinessScore - a.readinessScore : b.avgScore - a.avgScore)
        .slice(0, 5);

    const needsCoaching = isCorporate
        ? students.filter(s => s.readinessScore == null || s.readinessScore < 50)
            .sort((a, b) => (a.readinessScore || 0) - (b.readinessScore || 0)).slice(0, 5)
        : [];

    const row = (label, value, color = '#1e293b') =>
        `<tr><td style="padding:7px 14px;font-size:13px;color:#64748b;border-bottom:1px solid #f1f5f9;">${label}</td><td style="padding:7px 14px;font-size:13px;font-weight:700;color:${color};text-align:right;border-bottom:1px solid #f1f5f9;">${value}</td></tr>`;

    const section = t =>
        `<p style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;margin:28px 0 10px;">${t}</p>`;

    let html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:640px;margin:24px auto;padding:0 16px;">`;

    // Header
    html += `<div style="background:linear-gradient(135deg,#0f172a,#1e293b);border-radius:16px;padding:28px;margin-bottom:4px;">
<p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#94a3b8;margin:0 0 6px;">${isCorporate ? '🏢 Corporate' : '🎓 College'} · AI Interviewer Weekly Digest</p>
<h1 style="font-size:22px;font-weight:900;color:#fff;margin:0 0 6px;">${org.name}</h1>
<p style="font-size:13px;color:#64748b;margin:0;">${dateStr}${org.country ? ' · ' + org.country : ''} · Code: ${org.orgCode}</p>
</div>`;

    // Overview
    html += section('Team Overview');
    html += `<table style="width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06);">`;
    html += row('Total Employees', students.length);
    html += row('With Completed Sessions', withSessions.length);
    html += row('Overall Avg Score', scoreLabel(overallAvg), scoreColor(overallAvg));
    if (isCorporate && avgReadiness != null) html += row('Avg Readiness Score', scoreLabel(avgReadiness), scoreColor(avgReadiness));
    html += row('Total Sessions', sessionStats.total);
    html += row('Completed Sessions', sessionStats.completed);
    if (sessionStats.total > 0) html += row('Completion Rate', `${Math.round(sessionStats.completed / sessionStats.total * 100)}%`);
    html += `</table>`;

    // Top performers
    if (topPerformers.length) {
        html += section(`Top Performers${isCorporate ? ' (Readiness)' : ' (Avg Score)'}`);
        html += `<table style="width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06);">`;
        const medals = ['🥇', '🥈', '🥉'];
        topPerformers.forEach((s, i) => {
            const score = isCorporate ? s.readinessScore : s.avgScore;
            const sub   = isCorporate && s.preferredRole ? `<br/><span style="font-size:11px;color:#94a3b8;">${s.preferredRole} · ${s.preferredLevel || ''}</span>` : '';
            html += `<tr>
<td style="padding:9px 14px;font-size:16px;border-bottom:1px solid #f1f5f9;width:36px;">${medals[i] || `#${i + 1}`}</td>
<td style="padding:9px 14px;font-size:13px;border-bottom:1px solid #f1f5f9;">${s.name}${sub}</td>
<td style="padding:9px 14px;font-size:15px;font-weight:900;text-align:right;color:${scoreColor(score)};border-bottom:1px solid #f1f5f9;">${scoreLabel(score)}</td>
</tr>`;
        });
        html += `</table>`;
    }

    // Needs coaching
    if (needsCoaching.length) {
        html += section('Needs Coaching (Readiness below 50%)');
        html += `<table style="width:100%;border-collapse:collapse;background:#fff8f8;border-radius:12px;overflow:hidden;border:1px solid #fecaca;box-shadow:0 1px 3px rgba(0,0,0,.06);">`;
        needsCoaching.forEach(s => {
            const roleInfo = s.preferredRole ? ` · ${s.preferredRole} (${s.preferredLevel || 'Junior'})` : '';
            html += `<tr>
<td style="padding:8px 14px;font-size:13px;border-bottom:1px solid #fee2e2;">${s.name}<br/><span style="font-size:11px;color:#94a3b8;">${s.email}${roleInfo}</span></td>
<td style="padding:8px 14px;font-size:14px;font-weight:900;text-align:right;color:${s.readinessScore != null ? '#dc2626' : '#94a3b8'};border-bottom:1px solid #fee2e2;">${s.readinessScore != null ? scoreLabel(s.readinessScore) : 'Not started'}</td>
</tr>`;
        });
        html += `</table>`;
    }

    // Footer
    html += `<p style="font-size:11px;color:#94a3b8;text-align:center;margin:28px 0 8px;padding-top:16px;border-top:1px solid #e2e8f0;">
This is an automated weekly digest from AI Interviewer · <a href="#" style="color:#94a3b8;">Manage digest settings</a>
</p>`;

    html += `</div></body></html>`;
    return html;
}

// ─── Public API ───────────────────────────────────────────────────────────────
export async function sendDigestForOrg(orgId) {
    const org = await Organization.findById(orgId);
    if (!org) throw new Error('Org not found');

    const emails = org.digestConfig?.emails?.filter(Boolean) || [];
    if (!emails.length) throw new Error('No recipient emails configured');

    const transport = getTransport();
    if (!transport) throw new Error('SMTP is not configured (SMTP_HOST / SMTP_USER / SMTP_PASS missing)');

    const { students, sessionStats } = await fetchOrgData(orgId);
    const html = buildReportHTML(org, students, sessionStats);
    const from  = process.env.SMTP_FROM || process.env.SMTP_USER;

    await transport.sendMail({
        from,
        to:      emails.join(', '),
        subject: `📊 Weekly Team Progress — ${org.name}`,
        html,
    });

    return { sentTo: emails, orgName: org.name };
}

export async function runScheduledDigests() {
    const now    = new Date();
    const day    = now.getUTCDay();
    const hour   = now.getUTCHours();

    const orgs = await Organization.find({
        'digestConfig.enabled': true,
        'digestConfig.dayOfWeek': day,
        'digestConfig.hour': hour,
    });

    const results = [];
    for (const org of orgs) {
        try {
            const r = await sendDigestForOrg(org._id);
            results.push({ orgId: org._id, status: 'sent', ...r });
            console.log(`[digest] Sent to ${org.name} → ${r.sentTo.join(', ')}`);
        } catch (err) {
            results.push({ orgId: org._id, status: 'error', error: err.message });
            console.error(`[digest] Failed for ${org.name}: ${err.message}`);
        }
    }
    return results;
}

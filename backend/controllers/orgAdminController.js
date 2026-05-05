import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Organization from '../models/OrganizationModel.js';
import User from '../models/User.js';
import Session from '../models/SessionModel.js';
import { buildUserResponse } from './userController.js';

const signToken = (org) => jwt.sign(
    { orgId: org._id, orgName: org.name, orgType: org.type, orgCode: org.orgCode, role: 'orgadmin' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
);

// POST /api/org-admin/login
const orgAdminLogin = asyncHandler(async (req, res) => {
    const { orgCode, adminUsername, adminPassword } = req.body;
    if (!orgCode || !adminUsername || !adminPassword) {
        res.status(400); throw new Error('Org code, username, and password are required.');
    }
    const org = await Organization.findOne({ orgCode: orgCode.toUpperCase().trim(), adminUsername: adminUsername.trim() });
    if (!org || !(await org.matchPassword(adminPassword))) {
        res.status(401); throw new Error('Invalid org code, username, or password.');
    }
    if (!org.isActive) {
        res.status(403); throw new Error('This organization account has been suspended. Contact your administrator.');
    }
    const userCount = await User.countDocuments({ orgId: org._id });
    res.json({
        token: signToken(org),
        orgId: org._id, orgName: org.name, orgType: org.type,
        orgCode: org.orgCode, country: org.country,
        plan: org.plan, maxUsers: org.maxUsers, userCount,
    });
});

// GET /api/org-admin/me
const getOrgInfo = asyncHandler(async (req, res) => {
    const org = await Organization.findById(req.orgAdmin.orgId).select('-adminPassword');
    if (!org) { res.status(404); throw new Error('Organization not found.'); }
    const userCount    = await User.countDocuments({ orgId: org._id });
    const sessionCount = await Session.countDocuments({ orgId: org._id });
    res.json({ ...org.toObject(), userCount, sessionCount });
});

// GET /api/org-admin/students  (optional ?department=X&batch=Y filters)
const getOrgStudents = asyncHandler(async (req, res) => {
    const matchBase = { orgId: new mongoose.Types.ObjectId(req.orgAdmin.orgId) };
    if (req.query.department) matchBase.department = req.query.department;
    if (req.query.batch)      matchBase.batch      = req.query.batch;

    const students = await User.aggregate([
        { $match: matchBase },
        { $lookup: { from: 'sessions', localField: '_id', foreignField: 'user', as: 'sessions' } },
        {
            $addFields: {
                totalSessions: { $size: '$sessions' },
                completedSessions: {
                    $size: { $filter: { input: '$sessions', as: 's', cond: { $eq: ['$$s.status', 'completed'] } } },
                },
                avgScore: {
                    $cond: {
                        if: { $gt: [{ $size: { $filter: { input: '$sessions', as: 's', cond: { $gt: ['$$s.overallScore', 0] } } } }, 0] },
                        then: { $avg: { $map: { input: { $filter: { input: '$sessions', as: 's', cond: { $gt: ['$$s.overallScore', 0] } } }, as: 's', in: '$$s.overallScore' } } },
                        else: null,
                    },
                },
                lastActive: { $max: '$sessions.createdAt' },
                roleSessions: {
                    $filter: {
                        input: '$sessions',
                        as: 's',
                        cond: {
                            $and: [
                                { $eq: ['$$s.status', 'completed'] },
                                { $gt:  ['$$s.overallScore', 0]   },
                                { $eq: ['$$s.role',  '$preferredRole']  },
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
                readinessCount: { $size: '$roleSessions' },
            },
        },
        { $project: { password: 0, sessions: 0, roleSessions: 0 } },
        { $sort: { createdAt: -1 } },
    ]);
    res.json(students);
});

// POST /api/org-admin/students
const addOrgStudent = asyncHandler(async (req, res) => {
    const { name, email, password, department, batch } = req.body;
    if (!name || !email || !password) {
        res.status(400); throw new Error('Name, email and password are required.');
    }
    const org = await Organization.findById(req.orgAdmin.orgId);
    const currentCount = await User.countDocuments({ orgId: req.orgAdmin.orgId });
    if (currentCount >= org.maxUsers) {
        res.status(400); throw new Error(`User limit reached (${org.maxUsers}). Upgrade your plan to add more.`);
    }
    const exists = await User.findOne({ email });
    if (exists) { res.status(400); throw new Error('A user with this email already exists.'); }
    const user = await User.create({
        name, email, password,
        orgId: req.orgAdmin.orgId,
        userType: req.orgAdmin.orgType,
        department: department || '',
        batch: batch || '',
    });
    const u = user.toObject();
    delete u.password;
    res.status(201).json({ ...u, totalSessions: 0, completedSessions: 0, avgScore: null, lastActive: null });
});

// PUT /api/org-admin/students/:id
const updateOrgStudent = asyncHandler(async (req, res) => {
    const user = await User.findOne({ _id: req.params.id, orgId: req.orgAdmin.orgId });
    if (!user) { res.status(404); throw new Error('Student not found in your organization.'); }
    const { name, email, password, department, batch } = req.body;
    if (name)  user.name = name;
    if (email && email !== user.email) {
        const exists = await User.findOne({ email, _id: { $ne: user._id } });
        if (exists) { res.status(400); throw new Error('Email already in use by another account.'); }
        user.email = email;
    }
    if (password) user.password = password;
    if (department !== undefined) user.department = department;
    if (batch      !== undefined) user.batch      = batch;
    await user.save();
    const u = user.toObject();
    delete u.password;
    res.json(u);
});

// DELETE /api/org-admin/students/:id
const deleteOrgStudent = asyncHandler(async (req, res) => {
    const user = await User.findOne({ _id: req.params.id, orgId: req.orgAdmin.orgId });
    if (!user) { res.status(404); throw new Error('Student not found in your organization.'); }
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Student removed.', id: req.params.id });
});

// POST /api/org-admin/students/bulk
const bulkAddOrgStudents = asyncHandler(async (req, res) => {
    const { students } = req.body;
    if (!students || !Array.isArray(students) || students.length === 0) {
        res.status(400); throw new Error('No student data provided.');
    }
    const org = await Organization.findById(req.orgAdmin.orgId);
    const currentCount = await User.countDocuments({ orgId: req.orgAdmin.orgId });
    if (currentCount + students.length > org.maxUsers) {
        res.status(400);
        throw new Error(`Adding ${students.length} students would exceed your limit of ${org.maxUsers}. Currently ${currentCount} users.`);
    }
    let created = 0, skipped = 0;
    const errors = [];
    for (const s of students) {
        if (!s.email?.trim()) { skipped++; continue; }
        const exists = await User.findOne({ email: s.email.trim() });
        if (exists) { skipped++; errors.push(`${s.email} already exists`); continue; }
        try {
            await User.create({
                name: s.name?.trim() || s.email.split('@')[0],
                email: s.email.trim(),
                password: s.password?.trim() || `${org.orgCode}@${Math.random().toString(36).slice(-6)}`,
                orgId: req.orgAdmin.orgId,
                userType: req.orgAdmin.orgType,
                department: s.department?.trim() || '',
                batch: s.batch?.trim() || '',
            });
            created++;
        } catch {
            skipped++;
            errors.push(`Failed to create ${s.email}`);
        }
    }
    res.json({ created, skipped, errors });
});

// GET /api/org-admin/analytics  (optional ?department=X&batch=Y)
const getOrgAnalytics = asyncHandler(async (req, res) => {
    const orgId = new mongoose.Types.ObjectId(req.orgAdmin.orgId);

    // Build user-level filter for dept/batch
    const userFilter = { orgId };
    if (req.query.department) userFilter.department = req.query.department;
    if (req.query.batch)      userFilter.batch      = req.query.batch;

    // When filtering by dept/batch, scope sessions to matching users
    let sessionMatch = { orgId };
    if (req.query.department || req.query.batch) {
        const filteredUsers = await User.find(userFilter).select('_id');
        const userIds = filteredUsers.map(u => u._id);
        sessionMatch.user = { $in: userIds };
    }

    const [totalStudents, totalSessions, completedSessions] = await Promise.all([
        User.countDocuments(userFilter),
        Session.countDocuments(sessionMatch),
        Session.countDocuments({ ...sessionMatch, status: 'completed' }),
    ]);
    const avgScoreAgg = await Session.aggregate([
        { $match: { ...sessionMatch, status: 'completed', overallScore: { $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: '$overallScore' } } },
    ]);
    const avgScore = avgScoreAgg[0]?.avg?.toFixed(1) || 0;
    const recentSessions = await Session.find(sessionMatch)
        .sort({ createdAt: -1 }).limit(10)
        .populate('user', 'name email')
        .select('role level status overallScore createdAt user');
    const last30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dailyActivity = await Session.aggregate([
        { $match: { ...sessionMatch, createdAt: { $gte: last30 } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
    ]);
    res.json({ totalStudents, totalSessions, completedSessions, avgScore, recentSessions, dailyActivity });
});

// GET /api/org-admin/students/:id/sessions
const getStudentSessions = asyncHandler(async (req, res) => {
    const user = await User.findOne({ _id: req.params.id, orgId: req.orgAdmin.orgId });
    if (!user) { res.status(404); throw new Error('Student not found in your organization.'); }
    const sessions = await Session.find({ user: req.params.id })
        .sort({ createdAt: -1 }).limit(20)
        .select('role level status overallScore interviewType skills createdAt metrics');
    res.json(sessions);
});

// GET /api/org-admin/subject-analytics  — college orgs, optional ?department=X&batch=Y
const getSubjectAnalytics = asyncHandler(async (req, res) => {
    const orgId = new mongoose.Types.ObjectId(req.orgAdmin.orgId);

    // Build user filter for department/batch
    const userFilter = { orgId };
    if (req.query.department) userFilter.department = req.query.department;
    if (req.query.batch)      userFilter.batch      = req.query.batch;

    // If filtering, get the matching user IDs first
    let sessionMatch = { orgId };
    if (req.query.department || req.query.batch) {
        const filteredUsers = await User.find(userFilter).select('_id');
        const userIds = filteredUsers.map(u => u._id);
        sessionMatch.user = { $in: userIds };
    }

    const bySemester = await Session.aggregate([
        { $match: sessionMatch },
        {
            $group: {
                _id: { subject: '$role', semester: '$level' },
                total: { $sum: 1 },
                completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                avgScore: {
                    $avg: {
                        $cond: [
                            { $and: [{ $eq: ['$status', 'completed'] }, { $gt: ['$overallScore', 0] }] },
                            '$overallScore',
                            null,
                        ]
                    }
                },
            }
        },
        { $sort: { '_id.subject': 1, '_id.semester': 1 } },
    ]);

    const top5Raw = await Session.aggregate([
        { $match: { ...sessionMatch, status: 'completed', overallScore: { $gt: 0 } } },
        { $group: {
            _id: { subject: '$role', user: '$user' },
            bestScore: { $max: '$overallScore' },
            sessions:  { $sum: 1 },
        }},
        { $sort: { '_id.subject': 1, bestScore: -1 } },
        { $group: {
            _id: '$_id.subject',
            entries: { $push: { user: '$_id.user', bestScore: '$bestScore', sessions: '$sessions' } },
        }},
        { $project: { subject: '$_id', top5: { $slice: ['$entries', 5] }, _id: 0 } },
    ]);

    const studentCounts = await Session.aggregate([
        { $match: sessionMatch },
        { $group: { _id: { subject: '$role', user: '$user' } } },
        { $group: { _id: '$_id.subject', uniqueStudents: { $sum: 1 } } },
    ]);

    const allUserIds = [...new Set(
        top5Raw.flatMap(s => s.top5.map(e => e.user?.toString()))
    )].filter(Boolean);
    const userDocs = await User.find({ _id: { $in: allUserIds } }).select('name');
    const userNameMap = {};
    for (const u of userDocs) userNameMap[u._id.toString()] = u.name;

    const top5Map = {};
    for (const row of top5Raw) {
        top5Map[row.subject] = row.top5.map((e, i) => ({
            rank:      i + 1,
            name:      userNameMap[e.user?.toString()] || 'Unknown',
            bestScore: Math.round(e.bestScore),
            sessions:  e.sessions,
        }));
    }

    const subjectMap = {};
    for (const row of bySemester) {
        const { subject, semester } = row._id;
        if (!subjectMap[subject]) {
            subjectMap[subject] = { subject, total: 0, completed: 0, scoreSum: 0, scoredCount: 0, semesters: [] };
        }
        const s = subjectMap[subject];
        s.total       += row.total;
        s.completed   += row.completed;
        if (row.avgScore != null) {
            s.scoreSum    += row.avgScore * row.completed;
            s.scoredCount += row.completed;
        }
        s.semesters.push({
            semester,
            total:     row.total,
            completed: row.completed,
            avgScore:  row.avgScore != null ? Math.round(row.avgScore * 10) / 10 : null,
        });
    }
    for (const sc of studentCounts) {
        if (subjectMap[sc._id]) subjectMap[sc._id].uniqueStudents = sc.uniqueStudents;
    }

    const subjects = Object.values(subjectMap).map(s => {
        const top5 = top5Map[s.subject] || [];
        return {
            subject:        s.subject,
            total:          s.total,
            completed:      s.completed,
            uniqueStudents: s.uniqueStudents || 0,
            avgScore:       s.scoredCount > 0 ? Math.round(s.scoreSum / s.scoredCount * 10) / 10 : null,
            topStudent:     top5[0] ? { name: top5[0].name, score: top5[0].bestScore } : null,
            top5,
            semesters:      s.semesters,
        };
    }).sort((a, b) => b.total - a.total);

    res.json({ subjects });
});

// GET /api/org-admin/role-analytics  — corporate orgs only
const getRoleAnalytics = asyncHandler(async (req, res) => {
    const orgId = new mongoose.Types.ObjectId(req.orgAdmin.orgId);

    const byLevel = await Session.aggregate([
        { $match: { orgId } },
        {
            $group: {
                _id: { role: '$role', level: '$level' },
                total: { $sum: 1 },
                completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                avgScore: {
                    $avg: {
                        $cond: [
                            { $and: [{ $eq: ['$status', 'completed'] }, { $gt: ['$overallScore', 0] }] },
                            '$overallScore',
                            null,
                        ]
                    }
                },
            }
        },
        { $sort: { '_id.role': 1, '_id.level': 1 } },
    ]);

    const top5Raw = await Session.aggregate([
        { $match: { orgId, status: 'completed', overallScore: { $gt: 0 } } },
        { $group: {
            _id: { role: '$role', user: '$user' },
            bestScore: { $max: '$overallScore' },
            sessions:  { $sum: 1 },
        }},
        { $sort: { '_id.role': 1, bestScore: -1 } },
        { $group: {
            _id: '$_id.role',
            entries: { $push: { user: '$_id.user', bestScore: '$bestScore', sessions: '$sessions' } },
        }},
        { $project: { role: '$_id', top5: { $slice: ['$entries', 5] }, _id: 0 } },
    ]);

    const employeeCounts = await Session.aggregate([
        { $match: { orgId } },
        { $group: { _id: { role: '$role', user: '$user' } } },
        { $group: { _id: '$_id.role', uniqueEmployees: { $sum: 1 } } },
    ]);

    const distribution = await User.aggregate([
        { $match: { orgId } },
        {
            $group: {
                _id: { role: '$preferredRole', level: '$preferredLevel' },
                count: { $sum: 1 },
            }
        },
        { $sort: { '_id.role': 1, '_id.level': 1 } },
    ]);

    const allUserIds = [...new Set(
        top5Raw.flatMap(r => r.top5.map(e => e.user?.toString()))
    )].filter(Boolean);
    const userDocs = await User.find({ _id: { $in: allUserIds } }).select('name preferredRole preferredLevel');
    const userMap = {};
    for (const u of userDocs) {
        userMap[u._id.toString()] = {
            name:           u.name,
            preferredRole:  u.preferredRole  || null,
            preferredLevel: u.preferredLevel || null,
        };
    }

    const top5Map = {};
    for (const row of top5Raw) {
        top5Map[row.role] = row.top5.map((e, i) => {
            const u = userMap[e.user?.toString()] || {};
            return {
                rank:           i + 1,
                name:           u.name           || 'Unknown',
                preferredRole:  u.preferredRole  || null,
                preferredLevel: u.preferredLevel || null,
                bestScore:      Math.round(e.bestScore),
                sessions:       e.sessions,
            };
        });
    }

    const LEVEL_ORDER = ['Junior', 'Mid-Level', 'Senior'];
    const roleMap = {};
    for (const row of byLevel) {
        const { role, level } = row._id;
        if (!roleMap[role]) {
            roleMap[role] = { role, total: 0, completed: 0, scoreSum: 0, scoredCount: 0, levels: [] };
        }
        const r = roleMap[role];
        r.total       += row.total;
        r.completed   += row.completed;
        if (row.avgScore != null) {
            r.scoreSum    += row.avgScore * row.completed;
            r.scoredCount += row.completed;
        }
        r.levels.push({
            level,
            total:     row.total,
            completed: row.completed,
            avgScore:  row.avgScore != null ? Math.round(row.avgScore * 10) / 10 : null,
        });
    }
    for (const ec of employeeCounts) {
        if (roleMap[ec._id]) roleMap[ec._id].uniqueEmployees = ec.uniqueEmployees;
    }

    const roles = Object.values(roleMap).map(r => {
        const top5 = top5Map[r.role] || [];
        const levels = [...r.levels].sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level));
        return {
            role:            r.role,
            total:           r.total,
            completed:       r.completed,
            uniqueEmployees: r.uniqueEmployees || 0,
            avgScore:        r.scoredCount > 0 ? Math.round(r.scoreSum / r.scoredCount * 10) / 10 : null,
            topEmployee:     top5[0] ? { name: top5[0].name, score: top5[0].bestScore } : null,
            top5,
            levels,
        };
    }).sort((a, b) => b.total - a.total);

    res.json({ roles, distribution });
});

// GET /api/org-admin/digest-config
const getDigestConfig = asyncHandler(async (req, res) => {
    const org = await Organization.findById(req.orgAdmin.orgId).select('digestConfig');
    if (!org) { res.status(404); throw new Error('Organization not found.'); }
    res.json(org.digestConfig || { enabled: false, emails: [], dayOfWeek: 1, hour: 8 });
});

// PUT /api/org-admin/digest-config
const updateDigestConfig = asyncHandler(async (req, res) => {
    const { enabled, emails, dayOfWeek, hour } = req.body;
    const org = await Organization.findById(req.orgAdmin.orgId);
    if (!org) { res.status(404); throw new Error('Organization not found.'); }

    org.digestConfig = {
        enabled:   Boolean(enabled),
        emails:    Array.isArray(emails) ? emails.filter(e => typeof e === 'string' && e.trim()) : [],
        dayOfWeek: Number.isInteger(dayOfWeek) ? Math.min(6, Math.max(0, dayOfWeek)) : 1,
        hour:      Number.isInteger(hour)      ? Math.min(23, Math.max(0, hour))      : 8,
    };
    await org.save();
    res.json(org.digestConfig);
});

// POST /api/org-admin/digest-send-now
const sendDigestNow = asyncHandler(async (req, res) => {
    const { sendDigestForOrg } = await import('../services/digestService.js');
    try {
        const result = await sendDigestForOrg(req.orgAdmin.orgId);
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(400); throw new Error(err.message);
    }
});

// ─── Departments ──────────────────────────────────────────────────────────────

// GET /api/org-admin/departments
const getDepartments = asyncHandler(async (req, res) => {
    const org = await Organization.findById(req.orgAdmin.orgId).select('departments');
    if (!org) { res.status(404); throw new Error('Organization not found.'); }
    res.json(org.departments || []);
});

// POST /api/org-admin/departments
const addDepartment = asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!name?.trim()) { res.status(400); throw new Error('Department name is required.'); }
    const org = await Organization.findById(req.orgAdmin.orgId);
    if (!org) { res.status(404); throw new Error('Organization not found.'); }
    if (org.departments.includes(name.trim())) {
        res.status(400); throw new Error('Department already exists.');
    }
    org.departments.push(name.trim());
    await org.save();
    res.json(org.departments);
});

// DELETE /api/org-admin/departments/:name
const deleteDepartment = asyncHandler(async (req, res) => {
    const name = decodeURIComponent(req.params.name);
    const org = await Organization.findById(req.orgAdmin.orgId);
    if (!org) { res.status(404); throw new Error('Organization not found.'); }
    org.departments = org.departments.filter(d => d !== name);
    await org.save();
    res.json(org.departments);
});

// ─── Batches ──────────────────────────────────────────────────────────────────

// GET /api/org-admin/batches
const getBatches = asyncHandler(async (req, res) => {
    const org = await Organization.findById(req.orgAdmin.orgId).select('batches');
    if (!org) { res.status(404); throw new Error('Organization not found.'); }
    res.json(org.batches || []);
});

// POST /api/org-admin/batches
const addBatch = asyncHandler(async (req, res) => {
    const { name, targetScore, targetDate } = req.body;
    if (!name?.trim()) { res.status(400); throw new Error('Batch name is required.'); }
    const org = await Organization.findById(req.orgAdmin.orgId);
    if (!org) { res.status(404); throw new Error('Organization not found.'); }
    if (org.batches.some(b => b.name === name.trim())) {
        res.status(400); throw new Error('Batch already exists.');
    }
    org.batches.push({ name: name.trim(), targetScore: targetScore || null, targetDate: targetDate || null });
    await org.save();
    res.json(org.batches);
});

// PUT /api/org-admin/batches/:id
const updateBatch = asyncHandler(async (req, res) => {
    const org = await Organization.findById(req.orgAdmin.orgId);
    if (!org) { res.status(404); throw new Error('Organization not found.'); }
    const batch = org.batches.id(req.params.id);
    if (!batch) { res.status(404); throw new Error('Batch not found.'); }
    const { name, targetScore, targetDate } = req.body;
    if (name) batch.name = name.trim();
    if (targetScore !== undefined) batch.targetScore = targetScore;
    if (targetDate  !== undefined) batch.targetDate  = targetDate;
    await org.save();
    res.json(org.batches);
});

// DELETE /api/org-admin/batches/:id
const deleteBatch = asyncHandler(async (req, res) => {
    const org = await Organization.findById(req.orgAdmin.orgId);
    if (!org) { res.status(404); throw new Error('Organization not found.'); }
    org.batches = org.batches.filter(b => b._id.toString() !== req.params.id);
    await org.save();
    res.json(org.batches);
});

// ─── Email Invite ──────────────────────────────────────────────────────────────

// POST /api/org-admin/invite
const sendInvites = asyncHandler(async (req, res) => {
    const { emails, department, batch } = req.body;
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
        res.status(400); throw new Error('At least one email address is required.');
    }

    const org = await Organization.findById(req.orgAdmin.orgId);
    if (!org) { res.status(404); throw new Error('Organization not found.'); }

    const appUrl = process.env.APP_URL || '';
    const sent = [], failed = [], notDelivered = [], alreadyExists = [];

    for (const email of emails) {
        const trimmed = email.trim().toLowerCase();
        if (!trimmed) continue;

        // Generate a 7-day invite token (include dept/batch when provided)
        const payload = { orgCode: org.orgCode, orgName: org.name, orgType: org.type, email: trimmed };
        if (department) payload.department = department;
        if (batch)      payload.batch      = batch;
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

        const inviteUrl = `${appUrl}/register?invite=${token}`;

        // Check if user already exists — they can still accept the invite if they have no org yet
        const existing = await User.findOne({ email: trimmed });
        if (existing && existing.orgId) { alreadyExists.push(trimmed); continue; }

        if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
            notDelivered.push(trimmed);
            continue;
        }

        try {
            const nodemailer = (await import('nodemailer')).default;
            const transporter = nodemailer.createTransport({
                host:   process.env.SMTP_HOST,
                port:   Number(process.env.SMTP_PORT) || 587,
                secure: Number(process.env.SMTP_PORT) === 465,
                auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
            });

            await transporter.sendMail({
                from:    process.env.SMTP_FROM || process.env.SMTP_USER,
                to:      trimmed,
                subject: `You're invited to join ${org.name} on AI Interviewer`,
                html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">
  <h2 style="color:#14b8a6;margin-bottom:4px;">You've been invited! 🎓</h2>
  <p style="color:#64748b;margin-top:0;"><strong>${org.name}</strong> has invited you to practice technical interviews on AI Interviewer.</p>
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:20px 0;">
    <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;font-weight:bold;text-transform:uppercase;letter-spacing:.06em;">Your Organization</p>
    <p style="font-size:20px;font-weight:900;color:#0f172a;margin:0;">${org.name}</p>
    <p style="font-size:13px;color:#64748b;margin:6px 0 0;text-transform:capitalize;">${org.type} · ${org.country || ''}</p>
  </div>
  <p style="color:#475569;font-size:14px;line-height:1.6;"><strong>New to AI Interviewer?</strong> Click below to create your account and join ${org.name}. The link expires in 7 days.</p>
  <a href="${inviteUrl}" style="display:inline-block;background:#14b8a6;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:bold;font-size:15px;margin-top:8px;">Accept Invite &amp; Register →</a>
  <div style="margin-top:20px;padding:16px;background:#f1f5f9;border-radius:10px;border:1px solid #e2e8f0;">
    <p style="margin:0 0 6px;font-size:12px;color:#64748b;font-weight:bold;">Already have an account?</p>
    <p style="margin:0;font-size:13px;color:#475569;line-height:1.5;">Log in first, then click the button above — we'll detect you're already signed in and link your existing account to ${org.name} automatically.</p>
  </div>
  <p style="font-size:11px;color:#94a3b8;margin-top:24px;">Sent by ${org.name} via AI Interviewer · This invite is for ${trimmed} only.</p>
</div>`,
            });
            sent.push(trimmed);
        } catch {
            failed.push(trimmed);
        }
    }

    res.json({ sent: sent.length, failed: failed.length, notDelivered: notDelivered.length, alreadyExists: alreadyExists.length, sentList: sent, failedList: failed, notDeliveredList: notDelivered, alreadyExistsList: alreadyExists });
});

// ─── Accept Invite (authenticated existing user) ───────────────────────────────

// POST /api/org-admin/invite/accept
const acceptInvite = asyncHandler(async (req, res) => {
    const { inviteToken } = req.body;
    if (!inviteToken) {
        res.status(400); throw new Error('Invite token is required.');
    }

    let payload;
    try {
        payload = jwt.verify(inviteToken, process.env.JWT_SECRET);
    } catch {
        res.status(400); throw new Error('Invalid or expired invite token.');
    }

    const org = await Organization.findOne({ orgCode: payload.orgCode, isActive: true });
    if (!org) { res.status(404); throw new Error('Organization not found or is no longer active.'); }

    const user = req.user;

    if (payload.email && payload.email !== user.email) {
        res.status(403); throw new Error('This invite was sent to a different email address.');
    }

    if (user.orgId) {
        res.status(409); throw new Error('Your account is already linked to an organization.');
    }

    const currentCount = await User.countDocuments({ orgId: org._id });
    if (currentCount >= org.maxUsers) {
        res.status(400); throw new Error('This organization has reached its user limit. Contact your admin.');
    }

    user.orgId    = org._id;
    user.userType = org.type === 'corporate' ? 'corporate' : 'college';
    if (payload.department) user.department = payload.department;
    if (payload.batch)      user.batch      = payload.batch;
    await user.save();

    const freshUser = await User.findById(user._id);
    res.json(await buildUserResponse(freshUser));
});

// ─── Team Goals (college + corporate) ────────────────────────────────────────

// GET /api/org-admin/team-goals  — works for both college and corporate
const getTeamGoals = asyncHandler(async (req, res) => {
    const orgId  = new mongoose.Types.ObjectId(req.orgAdmin.orgId);
    const orgType = req.orgAdmin.orgType;

    // Optional filters
    const userFilter = { orgId };
    if (req.query.department) userFilter.department = req.query.department;
    if (req.query.batch)      userFilter.batch      = req.query.batch;

    const users = await User.aggregate([
        { $match: userFilter },
        { $lookup: { from: 'sessions', localField: '_id', foreignField: 'user', as: 'sessions' } },
        {
            $addFields: {
                completedSessions: {
                    $filter: { input: '$sessions', as: 's', cond: { $and: [{ $eq: ['$$s.status', 'completed'] }, { $gt: ['$$s.overallScore', 0] }] } },
                },
                roleSessions: {
                    $filter: {
                        input: '$sessions',
                        as: 's',
                        cond: {
                            $and: [
                                { $eq: ['$$s.status', 'completed'] },
                                { $gt:  ['$$s.overallScore', 0]   },
                                { $eq: ['$$s.role',  '$preferredRole']  },
                                { $eq: ['$$s.level', '$preferredLevel'] },
                            ],
                        },
                    },
                },
            },
        },
        {
            $addFields: {
                avgScore: {
                    $cond: {
                        if:   { $gt: [{ $size: '$completedSessions' }, 0] },
                        then: { $avg: { $map: { input: '$completedSessions', as: 's', in: '$$s.overallScore' } } },
                        else: null,
                    },
                },
                readinessScore: {
                    $cond: {
                        if:   { $gt: [{ $size: '$roleSessions' }, 0] },
                        then: { $avg: { $map: { input: '$roleSessions', as: 's', in: '$$s.overallScore' } } },
                        else: null,
                    },
                },
            },
        },
        { $project: { password: 0, sessions: 0, completedSessions: 0, roleSessions: 0 } },
        { $sort: { name: 1 } },
    ]);

    // For college orgs: get the batch goal (targetScore/targetDate) from the org
    let batchGoalMap = {};
    if (orgType === 'college') {
        const org = await Organization.findById(orgId).select('batches');
        if (org?.batches) {
            for (const b of org.batches) {
                batchGoalMap[b.name] = { targetScore: b.targetScore, targetDate: b.targetDate };
            }
        }
    }

    const today = new Date(); today.setHours(0, 0, 0, 0);

    const result = users.map(u => {
        // For college: use the batch goal; for corporate: use the individual readinessGoal
        let goal = null;
        if (orgType === 'college') {
            goal = u.batch ? batchGoalMap[u.batch] : null;
        } else {
            goal = u.readinessGoal;
        }

        // Score: college uses avgScore (all subjects), corporate uses readinessScore (own role track)
        const currentScore = orgType === 'college'
            ? (u.avgScore != null ? Math.round(u.avgScore) : null)
            : (u.readinessScore != null ? Math.round(u.readinessScore) : null);

        if (!goal?.targetScore || !goal?.targetDate) {
            return { ...u, currentScore, goalStatus: 'no-goal', daysLeft: null, gap: null };
        }

        const target   = new Date(goal.targetDate); target.setHours(0, 0, 0, 0);
        const daysLeft = Math.ceil((target - today) / 86_400_000);
        const gap      = goal.targetScore - (currentScore ?? 0);

        let goalStatus;
        if (gap <= 0)          goalStatus = 'achieved';
        else if (daysLeft < 0) goalStatus = 'overdue';
        else if (daysLeft <= 7) goalStatus = 'urgent';
        else                   goalStatus = 'in-progress';

        return {
            ...u,
            currentScore,
            readinessScore: orgType === 'corporate' ? currentScore : u.readinessScore,
            batchGoal: orgType === 'college' ? goal : null,
            goalStatus, daysLeft, gap: Math.max(0, gap),
        };
    });

    res.json(result);
});

// POST /api/org-admin/students/:id/nudge — send a coaching nudge email to one student/employee
const sendNudgeToEmployee = asyncHandler(async (req, res) => {
    const user = await User.findOne({ _id: req.params.id, orgId: req.orgAdmin.orgId });
    if (!user) { res.status(404); throw new Error('Employee not found in your organization.'); }

    const orgType = req.orgAdmin.orgType;
    let goal = null;

    if (orgType === 'college') {
        // Get batch goal from org
        if (user.batch) {
            const org = await Organization.findById(req.orgAdmin.orgId).select('batches');
            const batchDoc = org?.batches?.find(b => b.name === user.batch);
            goal = batchDoc ? { targetScore: batchDoc.targetScore, targetDate: batchDoc.targetDate } : null;
        }
    } else {
        goal = user.readinessGoal;
    }

    if (!goal?.targetScore || !goal?.targetDate) {
        res.status(400); throw new Error('No readiness goal set for this student.');
    }

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
        return res.json({ success: true, emailSent: false, message: 'SMTP not configured — nudge noted.' });
    }

    const nodemailer = (await import('nodemailer')).default;
    const transporter = nodemailer.createTransport({
        host:   process.env.SMTP_HOST,
        port:   Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const target = new Date(goal.targetDate); target.setHours(0, 0, 0, 0);
    const daysLeft = Math.ceil((target - today) / 86_400_000);
    const formattedDate = new Date(goal.targetDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const statusMsg = daysLeft < 0
        ? `Your deadline of ${formattedDate} has passed.`
        : `You have <strong>${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong> remaining until your deadline of ${formattedDate}.`;

    const contextLine = orgType === 'college'
        ? `Your placement cell at <strong>${req.orgAdmin.orgName}</strong> sent you a nudge.`
        : `Your manager at <strong>${req.orgAdmin.orgName}</strong> sent you a nudge.`;

    await transporter.sendMail({
        from:    process.env.SMTP_FROM || process.env.SMTP_USER,
        to:      user.email,
        subject: `📣 Keep going, ${user.name.split(' ')[0]}! — ${req.orgAdmin.orgName}`,
        html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">
  <h2 style="color:#14b8a6;margin-bottom:4px;">Keep going, ${user.name.split(' ')[0]}! 💪</h2>
  <p style="color:#64748b;margin-top:0;">${contextLine}</p>
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:20px 0;">
    <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;font-weight:bold;text-transform:uppercase;letter-spacing:.06em;">Readiness Target</p>
    <p style="font-size:32px;font-weight:900;color:#0f172a;margin:0;">${goal.targetScore}%</p>
    <p style="font-size:13px;color:#64748b;margin:6px 0 0;">${statusMsg}</p>
  </div>
  <p style="color:#475569;font-size:14px;line-height:1.6;">Practice a session today to close the gap and hit your target. Every session counts.</p>
  <a href="${process.env.APP_URL || ''}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:bold;font-size:14px;margin-top:8px;">Practice Now →</a>
  <p style="font-size:11px;color:#94a3b8;margin-top:24px;">Sent by ${req.orgAdmin.orgName} via AI Interviewer</p>
</div>`,
    });

    res.json({ success: true, emailSent: true });
});

export {
    orgAdminLogin, getOrgInfo,
    getOrgStudents, addOrgStudent, updateOrgStudent, deleteOrgStudent, bulkAddOrgStudents,
    getOrgAnalytics, getStudentSessions, getSubjectAnalytics, getRoleAnalytics,
    getDigestConfig, updateDigestConfig, sendDigestNow,
    getDepartments, addDepartment, deleteDepartment,
    getBatches, addBatch, updateBatch, deleteBatch,
    sendInvites, acceptInvite,
    getTeamGoals, sendNudgeToEmployee,
};

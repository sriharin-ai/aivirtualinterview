import asyncHandler from 'express-async-handler';
import PlacementDrive from '../models/PlacementDriveModel.js';
import DriveEnrollment from '../models/DriveEnrollmentModel.js';
import DriveQuestionPack from '../models/DriveQuestionPackModel.js';
import Session from '../models/SessionModel.js';
import User from '../models/User.js';

// ─── Org Admin: Create Drive ────────────────────────────────────────────────
export const createDrive = asyncHandler(async (req, res) => {
    const { companyName, jobRole, visitDate, eligibleDepartments, eligibleBatches, minScore, interviewRole, interviewLevel, description, questionPackId } = req.body;
    if (!companyName || !jobRole || !visitDate) {
        res.status(400); throw new Error('companyName, jobRole, and visitDate are required.');
    }

    // Validate that the question pack belongs to this org
    let resolvedPackId = null;
    if (questionPackId) {
        const pack = await DriveQuestionPack.findOne({ _id: questionPackId, orgId: req.orgAdmin.orgId });
        if (!pack) { res.status(400); throw new Error('Question pack not found or does not belong to your organization.'); }
        resolvedPackId = pack._id;
    }

    const drive = await PlacementDrive.create({
        orgId: req.orgAdmin.orgId,
        companyName,
        jobRole,
        visitDate: new Date(visitDate),
        eligibleDepartments: eligibleDepartments || [],
        eligibleBatches: eligibleBatches || [],
        minScore: minScore ?? 60,
        interviewRole: interviewRole || jobRole,
        interviewLevel: interviewLevel || 'Mid-Level',
        description: description || '',
        questionPackId: resolvedPackId,
        status: 'open',
    });
    res.status(201).json(drive);
});

// ─── Org Admin: List Drives ─────────────────────────────────────────────────
export const listDrives = asyncHandler(async (req, res) => {
    const drives = await PlacementDrive.find({ orgId: req.orgAdmin.orgId })
        .populate('questionPackId', 'name interviewRole interviewLevel questions')
        .sort({ visitDate: -1 });

    const driveIds = drives.map(d => d._id);
    const enrollmentStats = await DriveEnrollment.aggregate([
        { $match: { driveId: { $in: driveIds } } },
        {
            $group: {
                _id: '$driveId',
                count:     { $sum: 1 },
                qualified: { $sum: { $cond: ['$certificateIssued', 1, 0] } },
                attempted: { $sum: { $cond: [{ $gt: ['$sessionsCompleted', 0] }, 1, 0] } },
                avgScore:  { $avg: { $cond: [{ $ne: ['$bestScore', null] }, '$bestScore', null] } },
            },
        },
    ]);
    const statMap = Object.fromEntries(enrollmentStats.map(e => [e._id.toString(), e]));

    const result = drives.map(d => {
        const s = statMap[d._id.toString()] || {};
        return {
            ...d.toObject(),
            enrollmentCount: s.count     || 0,
            qualifiedCount:  s.qualified || 0,
            attempted:       s.attempted || 0,
            avgScore:        s.avgScore  != null ? Math.round(s.avgScore) : null,
        };
    });
    res.json(result);
});

// ─── Org Admin: Update Drive ────────────────────────────────────────────────
export const updateDrive = asyncHandler(async (req, res) => {
    const drive = await PlacementDrive.findOne({ _id: req.params.id, orgId: req.orgAdmin.orgId });
    if (!drive) { res.status(404); throw new Error('Drive not found.'); }

    const fields = ['companyName', 'jobRole', 'visitDate', 'eligibleDepartments', 'eligibleBatches', 'minScore', 'interviewRole', 'interviewLevel', 'description'];
    fields.forEach(f => { if (req.body[f] !== undefined) drive[f] = req.body[f]; });
    if (req.body.visitDate) drive.visitDate = new Date(req.body.visitDate);

    // Validate and update questionPackId with org ownership check
    if ('questionPackId' in req.body) {
        if (req.body.questionPackId) {
            const pack = await DriveQuestionPack.findOne({ _id: req.body.questionPackId, orgId: req.orgAdmin.orgId });
            if (!pack) { res.status(400); throw new Error('Question pack not found or does not belong to your organization.'); }
            drive.questionPackId = pack._id;
        } else {
            drive.questionPackId = null;
        }
    }

    await drive.save();
    res.json(drive);
});

// ─── Org Admin: Delete Drive ────────────────────────────────────────────────
export const deleteDrive = asyncHandler(async (req, res) => {
    const drive = await PlacementDrive.findOne({ _id: req.params.id, orgId: req.orgAdmin.orgId });
    if (!drive) { res.status(404); throw new Error('Drive not found.'); }
    await DriveEnrollment.deleteMany({ driveId: drive._id });
    await drive.deleteOne();
    res.json({ message: 'Drive deleted.' });
});

// ─── Org Admin: Close Drive ─────────────────────────────────────────────────
export const closeDrive = asyncHandler(async (req, res) => {
    const drive = await PlacementDrive.findOne({ _id: req.params.id, orgId: req.orgAdmin.orgId });
    if (!drive) { res.status(404); throw new Error('Drive not found.'); }
    drive.status = 'closed';
    await drive.save();
    res.json(drive);
});

// ─── Org Admin: Drive Leaderboard ──────────────────────────────────────────
export const getDriveLeaderboard = asyncHandler(async (req, res) => {
    const drive = await PlacementDrive.findOne({ _id: req.params.id, orgId: req.orgAdmin.orgId });
    if (!drive) { res.status(404); throw new Error('Drive not found.'); }

    const enrollments = await DriveEnrollment.find({ driveId: drive._id })
        .populate('userId', 'name email department batch')
        .sort({ bestScore: -1 });

    const entries = enrollments.map((e, i) => ({
        rank: i + 1,
        name: e.userId?.name || 'Unknown',
        email: e.userId?.email || '',
        department: e.userId?.department || '',
        batch: e.userId?.batch || '',
        bestScore: e.bestScore ?? null,
        sessionsCompleted: e.sessionsCompleted,
        certificateIssued: e.certificateIssued,
        enrolledAt: e.enrolledAt,
    }));

    res.json({ drive, entries });
});

// ─── Org Admin: Drive Leaderboard CSV Export ────────────────────────────────
export const exportDriveLeaderboardCSV = asyncHandler(async (req, res) => {
    const drive = await PlacementDrive.findOne({ _id: req.params.id, orgId: req.orgAdmin.orgId });
    if (!drive) { res.status(404); throw new Error('Drive not found.'); }

    const enrollments = await DriveEnrollment.find({ driveId: drive._id })
        .populate('userId', 'name email department batch')
        .sort({ bestScore: -1 });

    const rows = [['Rank', 'Name', 'Email', 'Department', 'Batch', 'Best Score', 'Sessions', 'Qualified', 'Enrolled At']];
    enrollments.forEach((e, i) => {
        rows.push([
            i + 1,
            e.userId?.name || '',
            e.userId?.email || '',
            e.userId?.department || '',
            e.userId?.batch || '',
            e.bestScore ?? '',
            e.sessionsCompleted,
            e.certificateIssued ? 'Yes' : 'No',
            new Date(e.enrolledAt).toLocaleDateString(),
        ]);
    });

    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const filename = `drive-${drive.companyName.replace(/\s+/g, '-')}-${drive.jobRole.replace(/\s+/g, '-')}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
});

// ─── Org Admin: Drive Analytics ─────────────────────────────────────────────
export const getDriveAnalytics = asyncHandler(async (req, res) => {
    const drive = await PlacementDrive.findOne({ _id: req.params.id, orgId: req.orgAdmin.orgId });
    if (!drive) { res.status(404); throw new Error('Drive not found.'); }

    const enrollments = await DriveEnrollment.find({ driveId: drive._id });
    const totalEnrolled = enrollments.length;
    const qualified = enrollments.filter(e => e.certificateIssued).length;
    const attempted = enrollments.filter(e => e.sessionsCompleted > 0).length;
    const scores = enrollments.filter(e => e.bestScore !== null).map(e => e.bestScore);
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    const topScore = scores.length ? Math.max(...scores) : null;

    res.json({ drive, totalEnrolled, qualified, attempted, avgScore, topScore });
});

// ─── Student: Get Single Drive (public info) ────────────────────────────────
export const getDriveById = asyncHandler(async (req, res) => {
    const drive = await PlacementDrive.findById(req.params.id).select('companyName jobRole visitDate minScore interviewRole interviewLevel description status orgId');
    if (!drive) { res.status(404); throw new Error('Drive not found.'); }
    if (!drive.orgId.equals(req.user.orgId)) { res.status(403); throw new Error('Forbidden.'); }
    res.json(drive);
});

// ─── Student: List Eligible Drives ─────────────────────────────────────────
export const listEligibleDrives = asyncHandler(async (req, res) => {
    const user = req.user;
    if (!user.orgId) { return res.json([]); }

    const now = new Date();
    const drives = await PlacementDrive.find({ orgId: user.orgId, status: 'open', visitDate: { $gte: now } }).sort({ visitDate: 1 });

    const eligible = drives.filter(d => {
        const deptOk = !d.eligibleDepartments.length || (user.department && d.eligibleDepartments.includes(user.department));
        const batchOk = !d.eligibleBatches.length || (user.batch && d.eligibleBatches.includes(user.batch));
        return deptOk && batchOk;
    });

    const driveIds = eligible.map(d => d._id);
    const enrollments = await DriveEnrollment.find({ userId: user._id, driveId: { $in: driveIds } });
    const enrollMap = Object.fromEntries(enrollments.map(e => [e.driveId.toString(), e]));

    const result = eligible.map(d => ({
        ...d.toObject(),
        enrollment: enrollMap[d._id.toString()] || null,
    }));

    res.json(result);
});

// ─── Student: Enroll in Drive ────────────────────────────────────────────────
export const enrollInDrive = asyncHandler(async (req, res) => {
    const user = req.user;
    const drive = await PlacementDrive.findById(req.params.id);
    if (!drive) { res.status(404); throw new Error('Drive not found.'); }
    if (drive.status !== 'open') { res.status(400); throw new Error('Drive is closed.'); }
    if (!drive.orgId.equals(user.orgId)) { res.status(403); throw new Error('Not eligible for this drive.'); }

    const deptOk = !drive.eligibleDepartments.length || (user.department && drive.eligibleDepartments.includes(user.department));
    const batchOk = !drive.eligibleBatches.length || (user.batch && drive.eligibleBatches.includes(user.batch));
    if (!deptOk || !batchOk) { res.status(403); throw new Error('You are not eligible for this drive.'); }

    const existing = await DriveEnrollment.findOne({ userId: user._id, driveId: drive._id });
    if (existing) { return res.json(existing); }

    const enrollment = await DriveEnrollment.create({ userId: user._id, driveId: drive._id });
    res.status(201).json(enrollment);
});

// ─── Student: Drive Leaderboard (student view — org-scoped) ─────────────────
export const getStudentDriveLeaderboard = asyncHandler(async (req, res) => {
    const user = req.user;
    const drive = await PlacementDrive.findOne({ _id: req.params.id, orgId: user.orgId });
    if (!drive) { res.status(404); throw new Error('Drive not found.'); }

    const enrollments = await DriveEnrollment.find({ driveId: drive._id })
        .populate('userId', 'name department batch')
        .sort({ bestScore: -1 });

    const entries = enrollments.map((e, i) => ({
        rank: i + 1,
        name: e.userId?.name || 'Anonymous',
        department: e.userId?.department || '',
        batch: e.userId?.batch || '',
        bestScore: e.bestScore ?? null,
        sessionsCompleted: e.sessionsCompleted,
        certificateIssued: e.certificateIssued,
        isMe: e.userId && e.userId._id.equals(user._id),
    }));

    const myEntry = entries.find(e => e.isMe);
    res.json({ drive: { companyName: drive.companyName, jobRole: drive.jobRole, minScore: drive.minScore, visitDate: drive.visitDate }, entries, myRank: myEntry?.rank || null, totalEnrolled: entries.length });
});

// ─── Student: Get My Enrollments ────────────────────────────────────────────
export const getMyEnrollments = asyncHandler(async (req, res) => {
    const enrollments = await DriveEnrollment.find({ userId: req.user._id })
        .populate('driveId')
        .sort({ enrolledAt: -1 });
    res.json(enrollments);
});

// ─── Student: Get Single Enrollment ─────────────────────────────────────────
export const getEnrollment = asyncHandler(async (req, res) => {
    const enrollment = await DriveEnrollment.findOne({ userId: req.user._id, driveId: req.params.id });
    res.json(enrollment || null);
});

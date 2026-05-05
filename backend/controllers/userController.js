import asyncHandler from 'express-async-handler';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Organization from '../models/OrganizationModel.js';
import Template from '../models/TemplateModel.js';
import Role from '../models/RoleModel.js';
import Skill from '../models/SkillModel.js';
import Session from '../models/SessionModel.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1d' });

const buildUserResponse = async (user) => {
    let orgInfo = {};
    let batchGoal = null;
    if (user.orgId) {
        const org = await Organization.findById(user.orgId).select('name type country orgCode batches');
        if (org) {
            orgInfo = { orgName: org.name, orgType: org.type, orgCountry: org.country, orgCode: org.orgCode };
            if (user.userType === 'college' && user.batch && org.batches?.length) {
                const batchDoc = org.batches.find(b => b.name === user.batch);
                if (batchDoc) batchGoal = { targetScore: batchDoc.targetScore, targetDate: batchDoc.targetDate };
            }
        }
    }
    return {
        _id: user._id,
        name: user.name,
        email: user.email,
        preferredRole: user.preferredRole,
        preferredLevel: user.preferredLevel || 'Junior',
        orgId: user.orgId || null,
        userType: user.userType || 'b2c',
        readinessGoal: user.readinessGoal || null,
        department: user.department || '',
        batch: user.batch || '',
        batchGoal,
        ...orgInfo,
        token: generateToken(user._id),
    };
};

const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password, orgCode, inviteToken } = req.body;
    if (!name || !email || !password) {
        res.status(400); throw new Error('Please enter all required fields (Name, Email, Password).');
    }
    const userExists = await User.findOne({ email });
    if (userExists) { res.status(400); throw new Error('User already exists with this email address.'); }

    // Handle invite token — server verifies signature and extracts org + tagging metadata
    let resolvedOrgCode = orgCode;
    let inviteDepartment, inviteBatch;
    if (inviteToken) {
        try {
            const payload = jwt.verify(inviteToken, process.env.JWT_SECRET);
            resolvedOrgCode  = payload.orgCode;
            inviteDepartment = payload.department || undefined;
            inviteBatch      = payload.batch      || undefined;
            // Enforce that the registering email matches the invited email
            if (payload.email && payload.email.toLowerCase() !== email.toLowerCase()) {
                res.status(400);
                throw new Error('This invite link was sent to a different email address. Please use the email that received the invite.');
            }
        } catch (err) {
            // Re-throw our own descriptive errors; convert JWT errors generically
            if (err.message.includes('invite link') || err.message.includes('email address')) throw err;
            res.status(400); throw new Error('Invite link is invalid or has expired.');
        }
    }

    let orgId = null, userType = 'b2c';
    if (resolvedOrgCode) {
        const org = await Organization.findOne({ orgCode: resolvedOrgCode.toUpperCase().trim(), isActive: true });
        if (!org) { res.status(400); throw new Error(`Organization code "${resolvedOrgCode}" not found or is inactive.`); }
        const currentCount = await User.countDocuments({ orgId: org._id });
        if (currentCount >= org.maxUsers) {
            res.status(400); throw new Error(`This organization has reached its user limit. Contact your admin.`);
        }
        orgId = org._id;
        userType = org.type;
    }

    const preferredRole  = req.body.preferredRole  || undefined;
    const preferredLevel = req.body.preferredLevel || undefined;
    // For invite flows: use server-verified token claims for tagging (not client body)
    // For self-registration: validate department/batch against the org's configured lists
    let department, batch;
    if (inviteToken) {
        department = inviteDepartment;
        batch      = inviteBatch;
    } else if (orgId) {
        const org = await Organization.findById(orgId).select('departments batches');
        const reqDept  = req.body.department || '';
        const reqBatch = req.body.batch      || '';
        if (reqDept  && org?.departments?.includes(reqDept))  department = reqDept;
        if (reqBatch && org?.batches?.some(b => b.name === reqBatch)) batch = reqBatch;
    }
    const user = await User.create({ name, email, password, orgId, userType, preferredRole, preferredLevel, department, batch });
    if (user) {
        res.status(201).json(await buildUserResponse(user));
    } else {
        res.status(400); throw new Error('Invalid user data provided.');
    }
});

const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
        res.json(await buildUserResponse(user));
    } else {
        res.status(401); throw new Error('Invalid email or password.');
    }
});

const googleLogin = asyncHandler(async (req, res) => {
    const { token } = req.body;
    const ticket = await client.verifyIdToken({ idToken: token, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const { email_verified, name, email, sub: googleId } = payload;
    if (!email_verified) { res.status(401); throw new Error('Google email not verified. Login failed.'); }

    let user = await User.findOne({ email });
    if (user) {
        if (!user.googleId) { user.googleId = googleId; await user.save(); }
    } else {
        user = await User.create({ name, email, googleId, password: null });
    }
    if (user) {
        res.status(200).json(await buildUserResponse(user));
    } else {
        res.status(400); throw new Error('Could not process user creation or login via Google.');
    }
});

const getUserProfile = asyncHandler(async (req, res) => {
    if (req.user) {
        res.json(await buildUserResponse(req.user));
    } else {
        res.status(404); throw new Error('User not found');
    }
});

const updateUserProfile = asyncHandler(async (req, res) => {
    if (req.user) {
        const user = await User.findById(req.user._id);
        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        user.preferredRole  = req.body.preferredRole  || user.preferredRole;
        user.preferredLevel = req.body.preferredLevel || user.preferredLevel;
        if (req.body.password) user.password = req.body.password;
        await user.save();
        res.status(200).json(await buildUserResponse(user));
    } else {
        res.status(404); throw new Error('User not found');
    }
});

// GET /api/users/org-preview/:code  — public: preview an org by code
const getOrgPreview = asyncHandler(async (req, res) => {
    const org = await Organization.findOne({
        orgCode: req.params.code.toUpperCase(),
        isActive: true,
    }).select('name type country orgCode');
    if (!org) { res.status(404); throw new Error('Organization not found.'); }
    res.json(org);
});

// GET /api/users/org-departments/:orgCode  — public: get departments and batches for an org
const getOrgDepartments = asyncHandler(async (req, res) => {
    const org = await Organization.findOne({
        orgCode: req.params.orgCode.toUpperCase(),
        isActive: true,
    }).select('departments batches');
    if (!org) { res.status(404); throw new Error('Organization not found.'); }
    res.json({
        departments: org.departments || [],
        batches: (org.batches || []).map(b => b.name),
    });
});

const getPublicTemplates = asyncHandler(async (req, res) => {
    const templates = await Template.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(templates);
});

const getPublicRoles = asyncHandler(async (req, res) => {
    const roles = await Role.find({ isActive: true }).sort({ name: 1 }).select('name levels levelConfigs hasCoding');
    res.json(roles);
});

const getPublicSkills = asyncHandler(async (req, res) => {
    const skills = await Skill.find({ isActive: true }).sort({ name: 1 }).select('name category roles');
    res.json(skills);
});

// PUT /api/users/goal  — save the user's personal readiness goal
const saveGoal = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) { res.status(404); throw new Error('User not found'); }
    const { targetScore, targetDate } = req.body;
    user.readinessGoal = {
        targetScore: targetScore != null ? Number(targetScore) : null,
        targetDate:  targetDate || null,
    };
    await user.save();
    res.json(user.readinessGoal);
});

// GET /api/users/batch-leaderboard — auth required; top performers in caller's org+batch
const getBatchLeaderboard = asyncHandler(async (req, res) => {
    const me = req.user;
    if (!me.orgId || !me.batch) {
        return res.json({ entries: [], myRank: null, myEntry: null, totalInBatch: 0, totalWithSessions: 0 });
    }

    const batchUsers = await User.find({
        orgId: me.orgId,
        batch: me.batch,
        userType: 'college',
    }).select('_id name');

    if (!batchUsers.length) {
        return res.json({ entries: [], myRank: null, myEntry: null, totalInBatch: 0, totalWithSessions: 0 });
    }

    const userIds = batchUsers.map(u => u._id);

    const sessionAgg = await Session.aggregate([
        { $match: { user: { $in: userIds }, status: 'completed', overallScore: { $gt: 0 } } },
        { $group: {
            _id: '$user',
            avgScore: { $avg: '$overallScore' },
            sessionCount: { $sum: 1 },
            subjects: { $addToSet: '$role' },
        }},
    ]);

    const userMap = Object.fromEntries(batchUsers.map(u => [u._id.toString(), u.name]));
    const meId = me._id.toString();

    const withScores = sessionAgg
        .map(s => ({
            userId: s._id.toString(),
            avgScore: Math.round(s.avgScore),
            sessionCount: s.sessionCount,
            subjects: s.subjects,
        }))
        .sort((a, b) => b.avgScore - a.avgScore);

    const ranked = withScores.map((entry, i) => {
        const isMe = entry.userId === meId;
        return {
            rank: i + 1,
            name: isMe ? userMap[entry.userId] : `Peer ${i + 1}`,
            avgScore: entry.avgScore,
            sessionCount: entry.sessionCount,
            subjects: entry.subjects,
            isMe,
        };
    });

    const myEntry = ranked.find(e => e.isMe) || null;
    const top5    = ranked.slice(0, 5);

    res.json({
        entries: top5,
        myRank: myEntry?.rank || null,
        myEntry,
        totalInBatch: batchUsers.length,
        totalWithSessions: withScores.length,
    });
});

export {
    buildUserResponse,
    registerUser, loginUser, googleLogin,
    getUserProfile, updateUserProfile,
    getOrgPreview, getOrgDepartments, saveGoal,
    getPublicTemplates, getPublicRoles, getPublicSkills,
    getBatchLeaderboard,
};

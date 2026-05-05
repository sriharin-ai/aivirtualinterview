import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import Role from '../models/RoleModel.js';
import Skill from '../models/SkillModel.js';
import QuestionBank from '../models/QuestionBankModel.js';
import Template from '../models/TemplateModel.js';
import Session from '../models/SessionModel.js';
import User from '../models/User.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

const adminLogin = asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        const token = jwt.sign({ role: 'admin', username }, process.env.JWT_SECRET, { expiresIn: '8h' });
        res.json({ token, username });
    } else {
        res.status(401);
        throw new Error('Invalid admin credentials.');
    }
});

// ─── ROLES ───────────────────────────────────────────────────────────────────
const getRoles = asyncHandler(async (req, res) => {
    const roles = await Role.find().sort({ createdAt: -1 });
    res.json(roles);
});

const createRole = asyncHandler(async (req, res) => {
    const { name, description, levels, levelConfigs } = req.body;
    if (!name) { res.status(400); throw new Error('Role name is required.'); }
    const exists = await Role.findOne({ name });
    if (exists) { res.status(400); throw new Error('Role already exists.'); }
    const role = await Role.create({ name, description, levels: levels || ['Junior','Mid-Level','Senior','Lead','Staff'], levelConfigs: levelConfigs || [] });
    res.status(201).json(role);
});

const updateRole = asyncHandler(async (req, res) => {
    const role = await Role.findById(req.params.id);
    if (!role) { res.status(404); throw new Error('Role not found.'); }
    const { name, description, levels, levelConfigs, isActive } = req.body;
    if (name) role.name = name;
    if (description !== undefined) role.description = description;
    if (levels) role.levels = levels;
    if (levelConfigs) role.levelConfigs = levelConfigs;
    if (isActive !== undefined) role.isActive = isActive;
    await role.save();
    res.json(role);
});

const deleteRole = asyncHandler(async (req, res) => {
    const role = await Role.findByIdAndDelete(req.params.id);
    if (!role) { res.status(404); throw new Error('Role not found.'); }
    res.json({ message: 'Role deleted.' });
});

// ─── SKILLS ──────────────────────────────────────────────────────────────────
const getSkills = asyncHandler(async (req, res) => {
    const skills = await Skill.find().sort({ name: 1 });
    res.json(skills);
});

const createSkill = asyncHandler(async (req, res) => {
    const { name, category, roles, description } = req.body;
    if (!name) { res.status(400); throw new Error('Skill name is required.'); }
    const exists = await Skill.findOne({ name });
    if (exists) { res.status(400); throw new Error('Skill already exists.'); }
    const skill = await Skill.create({ name, category, roles: roles || [], description });
    res.status(201).json(skill);
});

const updateSkill = asyncHandler(async (req, res) => {
    const skill = await Skill.findById(req.params.id);
    if (!skill) { res.status(404); throw new Error('Skill not found.'); }
    const { name, category, roles, description, isActive } = req.body;
    if (name) skill.name = name;
    if (category !== undefined) skill.category = category;
    if (roles) skill.roles = roles;
    if (description !== undefined) skill.description = description;
    if (isActive !== undefined) skill.isActive = isActive;
    await skill.save();
    res.json(skill);
});

const deleteSkill = asyncHandler(async (req, res) => {
    const skill = await Skill.findByIdAndDelete(req.params.id);
    if (!skill) { res.status(404); throw new Error('Skill not found.'); }
    res.json({ message: 'Skill deleted.' });
});

// ─── QUESTION BANK ────────────────────────────────────────────────────────────
const getQuestions = asyncHandler(async (req, res) => {
    const { role, level, difficulty, type, skill, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (level) filter.level = level;
    if (difficulty) filter.difficulty = difficulty;
    if (type) filter.questionType = type;
    if (skill) filter.skills = skill;

    const skip = (Number(page) - 1) * Number(limit);
    const [questions, total] = await Promise.all([
        QuestionBank.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        QuestionBank.countDocuments(filter),
    ]);
    res.json({ questions, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
});

const createQuestion = asyncHandler(async (req, res) => {
    const { questionText, questionType, difficulty, role, level, skills, idealAnswer } = req.body;
    if (!questionText || !questionType || !difficulty || !role || !level) {
        res.status(400); throw new Error('Missing required fields.');
    }
    const q = await QuestionBank.create({ questionText, questionType, difficulty, role, level, skills: skills || [], idealAnswer, source: 'manual' });
    res.status(201).json(q);
});

const updateQuestion = asyncHandler(async (req, res) => {
    const q = await QuestionBank.findById(req.params.id);
    if (!q) { res.status(404); throw new Error('Question not found.'); }
    Object.assign(q, req.body);
    await q.save();
    res.json(q);
});

const deleteQuestion = asyncHandler(async (req, res) => {
    const q = await QuestionBank.findByIdAndDelete(req.params.id);
    if (!q) { res.status(404); throw new Error('Question not found.'); }
    res.json({ message: 'Question deleted.' });
});

// ─── AI QUESTION GENERATION ───────────────────────────────────────────────────
const generateQuestions = asyncHandler(async (req, res) => {
    const { role, level, skills, count = 5, difficulty = 'medium', questionType = 'oral' } = req.body;
    if (!role || !level) { res.status(400); throw new Error('Role and level are required.'); }

    const aiResp = await fetch(`${AI_SERVICE_URL}/generate-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            role,
            level,
            count: Number(count),
            interview_type: questionType === 'coding' ? 'coding-mix' : 'oral-only',
            skills: skills || [],
        }),
    });
    const aiData = await aiResp.json();

    const rawQuestions = aiData.questions || [];

    const saved = await Promise.all(
        rawQuestions.map((text, i) => {
            const qType = questionType === 'coding' ? (i < Math.ceil(count * 0.4) ? 'coding' : 'oral') : 'oral';
            return QuestionBank.create({
                questionText: text,
                questionType: qType,
                difficulty,
                role,
                level,
                skills: skills || [],
                source: 'ai-generated',
            });
        })
    );

    res.status(201).json({ generated: saved.length, questions: saved });
});

// ─── TEMPLATES ────────────────────────────────────────────────────────────────
const getTemplates = asyncHandler(async (req, res) => {
    const templates = await Template.find().sort({ createdAt: -1 });
    res.json(templates);
});

const createTemplate = asyncHandler(async (req, res) => {
    const { name, description, role, level, interviewType, skills, easyCount, mediumCount, hardCount, codingCount, oralCount } = req.body;
    if (!name || !role || !level) { res.status(400); throw new Error('Name, role, and level are required.'); }
    const exists = await Template.findOne({ name });
    if (exists) { res.status(400); throw new Error('Template name already exists.'); }
    const t = await Template.create({ name, description, role, level, interviewType, skills: skills || [], easyCount, mediumCount, hardCount, codingCount, oralCount });
    res.status(201).json(t);
});

const updateTemplate = asyncHandler(async (req, res) => {
    const t = await Template.findById(req.params.id);
    if (!t) { res.status(404); throw new Error('Template not found.'); }
    Object.assign(t, req.body);
    await t.save();
    res.json(t);
});

const deleteTemplate = asyncHandler(async (req, res) => {
    const t = await Template.findByIdAndDelete(req.params.id);
    if (!t) { res.status(404); throw new Error('Template not found.'); }
    res.json({ message: 'Template deleted.' });
});

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
const getAnalytics = asyncHandler(async (req, res) => {
    const [totalSessions, totalUsers, completedSessions, totalQuestions] = await Promise.all([
        Session.countDocuments(),
        User.countDocuments(),
        Session.countDocuments({ status: 'completed' }),
        QuestionBank.countDocuments(),
    ]);

    const avgScoreAgg = await Session.aggregate([
        { $match: { status: 'completed', overallScore: { $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: '$overallScore' } } },
    ]);
    const avgScore = avgScoreAgg[0]?.avg?.toFixed(1) || 0;

    const byRole = await Session.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 }, avgScore: { $avg: '$overallScore' } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
    ]);

    const byLevel = await Session.aggregate([
        { $group: { _id: '$level', count: { $sum: 1 }, avgScore: { $avg: '$overallScore' } } },
        { $sort: { count: -1 } },
    ]);

    const recentSessions = await Session.find({ status: 'completed' })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('user', 'name email')
        .select('role level overallScore createdAt user');

    const last30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dailyActivity = await Session.aggregate([
        { $match: { createdAt: { $gte: last30 } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
    ]);

    const topSkills = await Session.aggregate([
        { $unwind: '$skills' },
        { $group: { _id: '$skills', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
    ]);

    res.json({ totalSessions, totalUsers, completedSessions, totalQuestions, avgScore, byRole, byLevel, recentSessions, dailyActivity, topSkills });
});

// ─── STUDENTS ─────────────────────────────────────────────────────────────────
const getStudents = asyncHandler(async (req, res) => {
    const students = await User.aggregate([
        {
            $lookup: {
                from: 'sessions',
                localField: '_id',
                foreignField: 'user',
                as: 'sessions',
            },
        },
        {
            $addFields: {
                totalSessions: { $size: '$sessions' },
                completedSessions: {
                    $size: {
                        $filter: { input: '$sessions', as: 's', cond: { $eq: ['$$s.status', 'completed'] } },
                    },
                },
                avgScore: {
                    $cond: {
                        if: { $gt: [{ $size: { $filter: { input: '$sessions', as: 's', cond: { $gt: ['$$s.overallScore', 0] } } } }, 0] },
                        then: {
                            $avg: {
                                $map: {
                                    input: { $filter: { input: '$sessions', as: 's', cond: { $gt: ['$$s.overallScore', 0] } } },
                                    as: 's',
                                    in: '$$s.overallScore',
                                },
                            },
                        },
                        else: null,
                    },
                },
                lastActive: { $max: '$sessions.createdAt' },
                lastRole: {
                    $arrayElemAt: [
                        {
                            $map: {
                                input: { $slice: [{ $sortArray: { input: '$sessions', sortBy: { createdAt: -1 } } }, 1] },
                                as: 's',
                                in: '$$s.role',
                            },
                        },
                        0,
                    ],
                },
            },
        },
        { $project: { password: 0, sessions: 0 } },
        { $sort: { lastActive: -1, createdAt: -1 } },
    ]);
    res.json(students);
});

const getStudentSessions = asyncHandler(async (req, res) => {
    const sessions = await Session.find({ user: req.params.id })
        .sort({ createdAt: -1 })
        .limit(20)
        .select('role level status overallScore interviewType skills createdAt endTime metrics');
    res.json(sessions);
});

// ─── SEED DEFAULTS ────────────────────────────────────────────────────────────
const DEFAULT_ROLES = [
    { name: 'MERN Stack Developer',          levels: ['Junior','Mid-Level','Senior'], hasCoding: true  },
    { name: 'MEAN Stack Developer',          levels: ['Junior','Mid-Level','Senior'], hasCoding: true  },
    { name: 'Full Stack Python',             levels: ['Junior','Mid-Level','Senior'], hasCoding: true  },
    { name: 'Full Stack Java',               levels: ['Junior','Mid-Level','Senior'], hasCoding: true  },
    { name: 'Frontend Developer',            levels: ['Junior','Mid-Level','Senior'], hasCoding: true  },
    { name: 'Backend Developer',             levels: ['Junior','Mid-Level','Senior'], hasCoding: true  },
    { name: 'Data Scientist',                levels: ['Junior','Mid-Level','Senior'], hasCoding: true  },
    { name: 'Data Analyst',                  levels: ['Junior','Mid-Level','Senior'], hasCoding: true  },
    { name: 'Machine Learning Engineer',     levels: ['Junior','Mid-Level','Senior'], hasCoding: true  },
    { name: 'DevOps Engineer',               levels: ['Junior','Mid-Level','Senior'], hasCoding: true  },
    { name: 'Cloud Engineer (AWS/Azure/GCP)',levels: ['Junior','Mid-Level','Senior'], hasCoding: true  },
    { name: 'Cybersecurity Engineer',        levels: ['Junior','Mid-Level','Senior'], hasCoding: true  },
    { name: 'Blockchain Developer',          levels: ['Junior','Mid-Level','Senior'], hasCoding: true  },
    { name: 'Mobile Developer (iOS/Android)',levels: ['Junior','Mid-Level','Senior'], hasCoding: true  },
    { name: 'Game Developer',                levels: ['Junior','Mid-Level','Senior'], hasCoding: true  },
    { name: 'UI/UX Designer',                levels: ['Junior','Mid-Level','Senior'], hasCoding: false },
    { name: 'QA Automation Engineer',        levels: ['Junior','Mid-Level','Senior'], hasCoding: true  },
    { name: 'Product Manager',               levels: ['Junior','Mid-Level','Senior'], hasCoding: false },
];

const DEFAULT_SKILLS = [
    { name: 'React.js',       category: 'Frontend',   roles: ['MERN Stack Developer','MEAN Stack Developer','Frontend Developer'] },
    { name: 'Node.js',        category: 'Backend',    roles: ['MERN Stack Developer','MEAN Stack Developer','Backend Developer'] },
    { name: 'MongoDB',        category: 'Database',   roles: ['MERN Stack Developer','MEAN Stack Developer','Backend Developer'] },
    { name: 'Express.js',     category: 'Backend',    roles: ['MERN Stack Developer','MEAN Stack Developer','Backend Developer'] },
    { name: 'Angular',        category: 'Frontend',   roles: ['MEAN Stack Developer','Frontend Developer'] },
    { name: 'Python',         category: 'Language',   roles: ['Full Stack Python','Data Scientist','Machine Learning Engineer','Data Analyst'] },
    { name: 'Django',         category: 'Backend',    roles: ['Full Stack Python','Backend Developer'] },
    { name: 'FastAPI',        category: 'Backend',    roles: ['Full Stack Python','Backend Developer'] },
    { name: 'Java',           category: 'Language',   roles: ['Full Stack Java','Backend Developer'] },
    { name: 'Spring Boot',    category: 'Backend',    roles: ['Full Stack Java','Backend Developer'] },
    { name: 'TypeScript',     category: 'Language',   roles: ['Frontend Developer','Backend Developer','MERN Stack Developer'] },
    { name: 'Vue.js',         category: 'Frontend',   roles: ['Frontend Developer'] },
    { name: 'Next.js',        category: 'Frontend',   roles: ['Frontend Developer','MERN Stack Developer'] },
    { name: 'PostgreSQL',     category: 'Database',   roles: ['Backend Developer','Full Stack Python','Full Stack Java'] },
    { name: 'Docker',         category: 'DevOps',     roles: ['DevOps Engineer','Backend Developer'] },
    { name: 'Kubernetes',     category: 'DevOps',     roles: ['DevOps Engineer','Cloud Engineer (AWS/Azure/GCP)'] },
    { name: 'AWS',            category: 'Cloud',      roles: ['Cloud Engineer (AWS/Azure/GCP)','DevOps Engineer'] },
    { name: 'CI/CD',          category: 'DevOps',     roles: ['DevOps Engineer'] },
    { name: 'Machine Learning',category: 'AI/ML',    roles: ['Machine Learning Engineer','Data Scientist'] },
    { name: 'TensorFlow',     category: 'AI/ML',      roles: ['Machine Learning Engineer','Data Scientist'] },
    { name: 'SQL',            category: 'Database',   roles: ['Data Analyst','Data Scientist','Backend Developer'] },
    { name: 'Pandas',         category: 'AI/ML',      roles: ['Data Analyst','Data Scientist'] },
    { name: 'React Native',   category: 'Mobile',     roles: ['Mobile Developer (iOS/Android)'] },
    { name: 'Swift',          category: 'Mobile',     roles: ['Mobile Developer (iOS/Android)'] },
    { name: 'Kotlin',         category: 'Mobile',     roles: ['Mobile Developer (iOS/Android)'] },
    { name: 'Unity',          category: 'Game',       roles: ['Game Developer'] },
    { name: 'Solidity',       category: 'Blockchain', roles: ['Blockchain Developer'] },
    { name: 'Figma',          category: 'Design',     roles: ['UI/UX Designer'] },
    { name: 'Selenium',       category: 'Testing',    roles: ['QA Automation Engineer'] },
    { name: 'Jest',           category: 'Testing',    roles: ['QA Automation Engineer','Frontend Developer'] },
];

const seedDefaults = asyncHandler(async (req, res) => {
    let rolesCreated = 0, rolesSkipped = 0, skillsCreated = 0, skillsSkipped = 0;

    for (const r of DEFAULT_ROLES) {
        const exists = await Role.findOne({ name: r.name });
        if (!exists) {
            await Role.create(r);
            rolesCreated++;
        } else {
            // Patch hasCoding on existing seed roles so previously-seeded data
            // reflects the correct value (e.g. UI/UX Designer → false)
            if (exists.hasCoding !== r.hasCoding) {
                await Role.updateOne({ _id: exists._id }, { hasCoding: r.hasCoding });
            }
            rolesSkipped++;
        }
    }

    for (const s of DEFAULT_SKILLS) {
        const exists = await Skill.findOne({ name: s.name });
        if (!exists) { await Skill.create(s); skillsCreated++; }
        else skillsSkipped++;
    }

    res.json({ message: 'Seed complete.', rolesCreated, rolesSkipped, skillsCreated, skillsSkipped });
});

export {
    adminLogin,
    getRoles, createRole, updateRole, deleteRole,
    getSkills, createSkill, updateSkill, deleteSkill,
    getQuestions, createQuestion, updateQuestion, deleteQuestion,
    generateQuestions,
    getTemplates, createTemplate, updateTemplate, deleteTemplate,
    getAnalytics,
    getStudents, getStudentSessions,
    seedDefaults,
};

import asyncHandler from 'express-async-handler';
import DriveQuestionPack from '../models/DriveQuestionPackModel.js';
import QuestionBank from '../models/QuestionBankModel.js';

// ─── Org Admin: List Question Packs ─────────────────────────────────────────
export const listQuestionPacks = asyncHandler(async (req, res) => {
    const packs = await DriveQuestionPack.find({ orgId: req.orgAdmin.orgId })
        .populate('questions', 'questionText questionType difficulty role level')
        .sort({ createdAt: -1 });
    res.json(packs);
});

// ─── Org Admin: Create Question Pack ────────────────────────────────────────
export const createQuestionPack = asyncHandler(async (req, res) => {
    const { name, description, interviewRole, interviewLevel, questionIds } = req.body;
    if (!name) { res.status(400); throw new Error('Pack name is required.'); }

    const questions = questionIds && questionIds.length
        ? await QuestionBank.find({ _id: { $in: questionIds }, isActive: true }).distinct('_id')
        : [];

    const pack = await DriveQuestionPack.create({
        orgId: req.orgAdmin.orgId,
        name,
        description: description || '',
        interviewRole: interviewRole || '',
        interviewLevel: interviewLevel || '',
        questions,
    });
    res.status(201).json(pack);
});

// ─── Org Admin: Update Question Pack ────────────────────────────────────────
export const updateQuestionPack = asyncHandler(async (req, res) => {
    const pack = await DriveQuestionPack.findOne({ _id: req.params.id, orgId: req.orgAdmin.orgId });
    if (!pack) { res.status(404); throw new Error('Question pack not found.'); }

    const { name, description, interviewRole, interviewLevel, questionIds } = req.body;
    if (name !== undefined) pack.name = name;
    if (description !== undefined) pack.description = description;
    if (interviewRole !== undefined) pack.interviewRole = interviewRole;
    if (interviewLevel !== undefined) pack.interviewLevel = interviewLevel;
    if (questionIds !== undefined) {
        pack.questions = questionIds.length
            ? await QuestionBank.find({ _id: { $in: questionIds }, isActive: true }).distinct('_id')
            : [];
    }
    await pack.save();
    const populated = await DriveQuestionPack.findById(pack._id).populate('questions', 'questionText questionType difficulty role level');
    res.json(populated);
});

// ─── Org Admin: Delete Question Pack ────────────────────────────────────────
export const deleteQuestionPack = asyncHandler(async (req, res) => {
    const pack = await DriveQuestionPack.findOneAndDelete({ _id: req.params.id, orgId: req.orgAdmin.orgId });
    if (!pack) { res.status(404); throw new Error('Question pack not found.'); }
    res.json({ message: 'Pack deleted.' });
});

// ─── Org Admin: List Available Questions from Question Bank ─────────────────
export const listAvailableQuestions = asyncHandler(async (req, res) => {
    const { role, level, type, difficulty, search } = req.query;
    const filter = { isActive: true };
    if (role)       filter.role       = { $regex: role, $options: 'i' };
    if (level)      filter.level      = { $regex: level, $options: 'i' };
    if (type)       filter.questionType = type;
    if (difficulty) filter.difficulty = difficulty;
    if (search)     filter.questionText = { $regex: search, $options: 'i' };

    const questions = await QuestionBank.find(filter)
        .select('questionText questionType difficulty role level skills usageCount')
        .sort({ usageCount: 1, createdAt: -1 })
        .limit(200);
    res.json(questions);
});

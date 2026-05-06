// backend/controllers/sessionController.js
import asyncHandler from 'express-async-handler';
import Session from '../models/SessionModel.js';
import User from '../models/User.js';
import Role from '../models/RoleModel.js';
import QuestionBank from '../models/QuestionBankModel.js';
import DriveQuestionPack from '../models/DriveQuestionPackModel.js';
import PlacementDrive from '../models/PlacementDriveModel.js';
import DriveEnrollment from '../models/DriveEnrollmentModel.js';
import { sendPlacementQualificationEmails } from '../utils/mailer.js';
import Organization from '../models/OrganizationModel.js';
import fetch from 'node-fetch';
import fs from 'fs';
import FormData from 'form-data';
import path from 'path';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
// URL for the Python AI Microservice (Must match Step 6 setup)
const AI_SERVICE_URL = 'http://localhost:8000';

// Helper function to send an update via Socket.io
const pushSocketUpdate = (io, userId, sessionId, status, message, session = null) => {
    // We target the user by their ID, assuming the user's socket is joined to a room named after their userId
    // (This room setup must be done on socket connection, which we will address later in server.js)
    io.to(userId.toString()).emit('sessionUpdate', {
        sessionId,
        status, // e.g., 'AI_GENERATING_QUESTIONS', 'QUESTIONS_READY', 'EVALUATION_FAILED'
        message,
        session,
    });
};

// @desc    Create a new interview session and start AI question generation
// @route   POST /api/sessions/
// @access  Private
const extractResumeText = async (filePath) => {
    try {
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.pdf') {
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdfParse(dataBuffer);
            return data.text || '';
        } else {
            return fs.readFileSync(filePath, 'utf-8');
        }
    } catch (err) {
        console.error('Resume extraction error:', err.message);
        return '';
    } finally {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
};

const createSession = asyncHandler(async (req, res) => {
    const { role, level, interviewType, count, skills, templateId, driveId } = req.body;
    const userId = req.user._id;

    if (!role || !level || !interviewType || !count) {
        res.status(400);
        throw new Error('Please specify role, level, interview type, and question count.');
    }

    // Validate drive eligibility if driveId is provided
    if (driveId) {
        const drive = await PlacementDrive.findById(driveId);
        if (!drive || drive.status !== 'open') {
            res.status(400);
            throw new Error('Placement drive not found or is closed.');
        }
        const enrollment = await DriveEnrollment.findOne({ userId, driveId });
        if (!enrollment) {
            res.status(403);
            throw new Error('You must enroll in the drive before starting a drive session.');
        }
    }

    // Parse skills — may come as comma-separated string or JSON array
    let skillsArray = [];
    if (skills) {
        if (typeof skills === 'string') {
            skillsArray = skills.split(',').map(s => s.trim()).filter(Boolean);
        } else if (Array.isArray(skills)) {
            skillsArray = skills;
        }
    }

    // Extract resume text if a file was uploaded
    let resumeText = '';
    if (req.file) {
        const filePath = path.join(process.cwd(), req.file.path);
        resumeText = await extractResumeText(filePath);
    }

    // 1. Create the session placeholder in MongoDB
    let session = await Session.create({
        user: userId,
        orgId: req.user.orgId || null,
        role,
        level,
        interviewType,
        skills: skillsArray,
        resumeText,
        status: 'pending',
        templateId: templateId || null,
        driveId: driveId || null,
    });

    const io = req.app.get('io');

    // 2. Immediately respond to the client (Latency Management)
    res.status(202).json({
        message: 'Session created. Generating questions asynchronously...',
        sessionId: session._id,
        status: 'processing',
    });

    // --- ASYNCHRONOUS BACKGROUND TASK START ---

    (async () => {
        try {
            // A. Notify the user via Socket.io that processing has started
            pushSocketUpdate(io, userId, session._id, 'AI_GENERATING_QUESTIONS', `Generating ${count} questions for ${role}...`);

            // A2. Look up role-level config from DB for question difficulty/type breakdown
            const roleDoc = await Role.findOne({ name: role, isActive: true });
            const levelCfg = roleDoc?.levelConfigs?.find(lc => lc.level === level);

            // hasCoding=false on the role means no coding questions ever, regardless of interviewType
            const roleAllowsCoding = roleDoc?.hasCoding !== false;
            const defaultCodingCount = roleAllowsCoding && interviewType === 'coding-mix' ? Math.floor(count * 0.2) : 0;
            const defaultOralCount = count - defaultCodingCount;
            const defaultEasy = Math.round(count * 0.34);
            const defaultMedium = Math.round(count * 0.33);
            const defaultHard = count - defaultEasy - defaultMedium;

            // When a levelConfig exists, codingCount comes directly from the config —
            // not from interviewType. codingCount=0 means fully oral regardless of what
            // the student selected.
            const cfgCodingCount = levelCfg ? levelCfg.codingCount : defaultCodingCount;
            const cfgOralCount   = levelCfg ? levelCfg.oralCount   : defaultOralCount;
            const cfgEasyCount   = levelCfg ? levelCfg.easyCount   : defaultEasy;
            const cfgMediumCount = levelCfg ? levelCfg.mediumCount : defaultMedium;
            const cfgHardCount   = levelCfg ? levelCfg.hardCount   : defaultHard;
            // Derive effective interview type from the config — admin controls this
            const effectiveInterviewType = cfgCodingCount > 0 ? 'coding-mix' : 'oral-only';

            // When a levelConfig exists, its total (easy+medium+hard) is authoritative —
            // it overrides the count the student chose in the form.
            const cfgTotal = cfgEasyCount + cfgMediumCount + cfgHardCount;
            const effectiveCount = levelCfg ? cfgTotal : count;

            // B. Source questions — from question bank (if drive uses bank) or AI service
            let questionsArray;

            const driveDoc = driveId ? await PlacementDrive.findById(driveId) : null;
            const packId   = driveDoc?.questionPackId;

            if (packId) {
                // B-pack. Draw questions from the drive's attached question pack
                const pack = await DriveQuestionPack.findById(packId)
                    .populate('questions');

                if (!pack) throw new Error('The question pack attached to this drive no longer exists.');

                const pool = pack.questions.filter(q => q.isActive);
                if (!pool.length) {
                    throw new Error(`The question pack "${pack.name}" has no active questions. Please update the pack or remove it from the drive.`);
                }

                // Shuffle and pick effectiveCount
                for (let i = pool.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [pool[i], pool[j]] = [pool[j], pool[i]];
                }
                const picked = pool.slice(0, effectiveCount);

                // Increment usage count in background
                QuestionBank.updateMany({ _id: { $in: picked.map(q => q._id) } }, { $inc: { usageCount: 1 } }).exec();

                questionsArray = picked.map(q => ({
                    questionText: q.questionText,
                    questionType: q.questionType || 'oral',
                    difficulty:   q.difficulty   || 'medium',
                    idealAnswer:  q.idealAnswer  || '',
                    isEvaluated: false,
                    isSubmitted: false,
                }));
            } else {
                // B-ai. Call the Python AI Microservice
                const aiResponse = await fetch(`${AI_SERVICE_URL}/generate-questions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        role,
                        level,
                        count: effectiveCount,
                        interview_type: effectiveInterviewType,
                        skills: skillsArray.length > 0 ? skillsArray : undefined,
                        resume_context: resumeText || undefined,
                        coding_count: cfgCodingCount,
                        oral_count: cfgOralCount,
                        easy_count: cfgEasyCount,
                        medium_count: cfgMediumCount,
                        hard_count: cfgHardCount,
                    }),
                });

                if (!aiResponse.ok) {
                    const errorBody = await aiResponse.text();
                    throw new Error(`AI Service error: ${aiResponse.status} - ${errorBody}`);
                }

                const aiData = await aiResponse.json();

                // Map questions with config-aware difficulty and type assignment
                const easyEnd   = cfgEasyCount;
                const mediumEnd = cfgEasyCount + cfgMediumCount;
                const codingEnd = cfgCodingCount;
                questionsArray = aiData.questions.map((qText, index) => {
                    const difficulty = index < easyEnd ? 'easy' : index < mediumEnd ? 'medium' : 'hard';
                    return {
                        questionText: qText,
                        questionType: index < codingEnd ? 'coding' : 'oral',
                        difficulty,
                        isEvaluated: false,
                        isSubmitted: false,
                    };
                });
            }

            // C. (shared) questionsArray is ready

            // D. Update the session in MongoDB
            session.questions = questionsArray;
            session.status = 'in-progress';
            await session.save();

            // E. Push final result back to the client via Socket.io
            pushSocketUpdate(io, userId, session._id, 'QUESTIONS_READY', 'Questions generated successfully. Starting session.', session);

        } catch (error) {
            console.error(`Session Creation Failure for ${session._id}:`, error.message);

            // F. Handle failure: Update status and notify client
            session.status = 'failed';
            await session.save();
            pushSocketUpdate(io, userId, session._id, 'GENERATION_FAILED', `Question generation failed. Reason: ${error.message}.`);
        }
    })();
});

// @desc    Get all interview sessions for the current user
// @route   GET /api/sessions/
// @access  Private
const getSessions = asyncHandler(async (req, res) => {
    // Find all sessions for the logged-in user, sorted by newest first
    const sessions = await Session.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .select('-questions.userAnswerText -questions.userSubmittedCode'); // Exclude heavy data for list view
    res.json(sessions);
});

// @desc    Get a specific session detail
// @route   GET /api/sessions/:id
// @access  Private
const getSessionById = asyncHandler(async (req, res) => {
    // Find session by ID and ensure it belongs to the logged-in user
    const session = await Session.findOne({ _id: req.params.id, user: req.user._id });

    if (session) {
        res.json(session);
    } else {
        res.status(404);
        throw new Error('Session not found or user unauthorized.');
    }
});

// @desc    Delete a session
// @route   DELETE /api/sessions/:id
// @access  Private
const deleteSession = asyncHandler(async (req, res) => {
    const session = await Session.findById(req.params.id);

    if (!session) {
        res.status(404);
        throw new Error('Session not found');
    }

    // Check if the user owns this session
    if (session.user.toString() !== req.user.id) {
        res.status(401);
        throw new Error('Not authorized');
    }

    await session.deleteOne();

    res.status(200).json({ id: req.params.id });
});

const evaluateAnswerAsync = async (io, userId, sessionId, questionIndex, audioFilePath = null, code = null) => {
    // Initialize transcription as an empty string instead of null to avoid "null" text in AI prompts
    let transcription = ""; 

    const questionIdx = typeof questionIndex === 'string' ? parseInt(questionIndex, 10) : questionIndex;

    const session = await Session.findById(sessionId);
    if (!session) {
        console.error(`Session ${sessionId} not found`);
        return;
    }

    const question = session.questions[questionIdx];
    if (!question) {
        pushSocketUpdate(io, userId, sessionId, 'EVALUATION_FAILED', `Q${questionIdx + 1} not found.`, null);
        return;
    }

    // --- Phase 1: Transcription (Only if audio exists) ---
    if (audioFilePath) {
        try {
            pushSocketUpdate(io, userId, sessionId, 'AI_TRANSCRIBING', `Transcribing audio for Q${questionIdx + 1}...`);
            const formData = new FormData();
            formData.append('file', fs.createReadStream(audioFilePath));

            const transResponse = await fetch(`${AI_SERVICE_URL}/transcribe`, {
                method: 'POST',
                body: formData,
                headers: formData.getHeaders(),
            });

            if (!transResponse.ok) throw new Error('Transcription service failed');

            const transData = await transResponse.json();
            transcription = transData.transcription || "";
        } catch (error) {
            console.error(`Transcription Error: ${error.message}`);
            // We continue even if transcription fails so the code can still be evaluated
        } finally {
            if (audioFilePath && fs.existsSync(audioFilePath)) fs.unlinkSync(audioFilePath);
        }
    }

    // --- Phase 2: AI Evaluation ---
    try {
        pushSocketUpdate(io, userId, sessionId, 'AI_EVALUATING', `AI is analyzing Q${questionIdx + 1}...`);

        const evalResponse = await fetch(`${AI_SERVICE_URL}/evaluate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question: question.questionText,
                question_type: question.questionType, // Tells AI if it should expect code
                role: session.role,
                level: session.level,
                user_answer: transcription, // Dedicated transcription field
                user_code: code || "",      // Dedicated code field
            }),
        });

        if (!evalResponse.ok) throw new Error('AI Evaluation service failed');

        const evalData = await evalResponse.json();

        // --- Phase 3: Correct MongoDB Mapping ---
        // Store them strictly in their respective fields
        question.userAnswerText = transcription; 
        question.userSubmittedCode = code || ""; 

        question.technicalScore = evalData.technicalScore;
        question.confidenceScore = evalData.confidenceScore;
        question.aiFeedback = evalData.aiFeedback;
        question.idealAnswer = evalData.idealAnswer;
        question.isEvaluated = true;

        // Check if all questions in the entire session are now evaluated
        const allQuestionsEvaluated = session.questions.every(q => q.isEvaluated);

        // RECALCULATION LOGIC: 
        if (session.status === 'completed' || allQuestionsEvaluated) {
            const scoreSummary = await calculateOverallScore(sessionId);

            session.overallScore = scoreSummary.overallScore || 0;
            session.metrics = {
                avgTechnical: scoreSummary.avgTechnical,
                avgConfidence: scoreSummary.avgConfidence,
            };

            if (allQuestionsEvaluated) {
                session.status = 'completed';
                session.endTime = session.endTime || new Date();
            }

            // Save the session (includes question update + global score update)
            await session.save();

            pushSocketUpdate(io, userId, sessionId, 'SESSION_COMPLETED', 'Scores finalized.', session);
        } else {
            // Normal behavior: User is still in the interview
            await session.save();
            pushSocketUpdate(io, userId, sessionId, 'EVALUATION_COMPLETE', `Feedback for Q${questionIdx + 1} is ready!`, session);
        }

    } catch (error) {
        console.error(`Evaluation Error: ${error.message}`);
        pushSocketUpdate(io, userId, sessionId, 'EVALUATION_FAILED', `Evaluation failed.`, session);
    }
};

// @desc    Submit an answer (Audio or Code)
// @route   POST /api/sessions/:id/submit-answer
// @access  Private
const submitAnswer = asyncHandler(async (req, res) => {
    const sessionId = req.params.id;
    const { questionIndex, code, timeSpent } = req.body;
    const userId = req.user._id;

    const session = await Session.findById(sessionId);

    if (!session || session.user.toString() !== userId.toString()) {
        res.status(404);
        throw new Error('Session not found or user unauthorized.');
    }

    const questionIdx = parseInt(questionIndex, 10);
    const question = session.questions[questionIdx];

    if (!question) {
        res.status(400);
        throw new Error(`Question at index ${questionIdx} not found.`);
    }

    // --- NEW UNIFIED LOGIC ---
    let audioFilePath = null;
    if (req.file) {
        audioFilePath = path.join(process.cwd(), req.file.path);
    }

    // We no longer error out if one is missing; 
    // we take whatever is provided (audio, code, or both).
    const codeSubmission = code || null;

    // 1. Update status in DB
    question.isSubmitted = true;
    if (timeSpent) question.timeSpent = parseInt(timeSpent, 10);
    await session.save();

    // 2. Respond immediately
    res.status(202).json({
        message: 'Answer received. Processing asynchronously...',
        status: 'received',
    });

    const io = req.app.get('io');

    // 3. Start AI processing with BOTH potential inputs
    evaluateAnswerAsync(io, userId, sessionId, questionIdx, audioFilePath, codeSubmission);
});


const calculateOverallScore = async (sessionId) => {
    const results = await Session.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(sessionId) } },
        { $unwind: '$questions' },
        // REMOVED: { $match: { 'questions.isSubmitted': true } } 
        // We now keep all questions to ensure they are part of the average.
        {
            $group: {
                _id: '$_id',
                // If a question is evaluated, use its score; otherwise, use 0.
                avgTechnical: {
                    $avg: { $cond: [{ $eq: ['$questions.isEvaluated', true] }, '$questions.technicalScore', 0] }
                },
                avgConfidence: {
                    $avg: { $cond: [{ $eq: ['$questions.isEvaluated', true] }, '$questions.confidenceScore', 0] }
                }
            }
        },
        {
            $project: {
                _id: 0,
                // Overall score is the average of the technical and confidence averages across ALL questions.
                overallScore: { $round: [{ $avg: ['$avgTechnical', '$avgConfidence'] }, 0] },
                avgTechnical: { $round: ['$avgTechnical', 0] },
                avgConfidence: { $round: ['$avgConfidence', 0] },
            }
        }
    ]);

    return results[0] || { overallScore: 0, avgTechnical: 0, avgConfidence: 0 };
};
// @desc    End the session early
// @route   POST /api/sessions/:id/end
// @access  Private
const endSession = asyncHandler(async (req, res) => {
    const sessionId = req.params.id;
    const userId = req.user._id;

    const session = await Session.findById(sessionId);

    if (!session || session.user.toString() !== userId.toString()) {
        res.status(404);
        throw new Error('Session not found or user unauthorized.');
    }
    const isProcessing = session.questions.some(q => q.isSubmitted && !q.isEvaluated);
    if (isProcessing) {
        res.status(400);
        throw new Error('Cannot end interview while AI is processing answers.');
    }
    if (session.status === 'completed') {
        res.status(400);
        throw new Error('Session is already completed.');
    }

    // Calculate scores for evaluated questions
    const scoreSummary = await calculateOverallScore(sessionId);

    session.overallScore = scoreSummary.overallScore || 0;
    session.status = 'completed';
    session.endTime = new Date();
    session.metrics = {
        avgTechnical: scoreSummary.avgTechnical,
        avgConfidence: scoreSummary.avgConfidence,
    };

    await session.save();

    // Update DriveEnrollment if this session belongs to a drive
    let justQualifiedDrive = null;
    if (session.driveId) {
        try {
            const drive = await PlacementDrive.findById(session.driveId);
            if (drive) {
                const enrollment = await DriveEnrollment.findOne({ userId, driveId: session.driveId });
                if (enrollment) {
                    enrollment.sessionsCompleted += 1;
                    if (enrollment.bestScore === null || session.overallScore > enrollment.bestScore) {
                        enrollment.bestScore = session.overallScore;
                    }
                    const justQualified = !enrollment.certificateIssued && enrollment.bestScore >= drive.minScore;
                    if (justQualified) {
                        enrollment.certificateIssued = true;
                        justQualifiedDrive = {
                            driveId: String(drive._id),
                            companyName: drive.companyName,
                            jobRole: drive.jobRole,
                            bestScore: enrollment.bestScore,
                            minScore: drive.minScore,
                        };
                    }
                    await enrollment.save();

                    if (justQualified) {
                        try {
                            const [student, org] = await Promise.all([
                                User.findById(userId).select('name email'),
                                Organization.findById(drive.orgId).select('contactEmail digestConfig'),
                            ]);
                            await sendPlacementQualificationEmails({
                                student,
                                org,
                                drive,
                                bestScore: enrollment.bestScore,
                            });
                        } catch (mailErr) {
                            console.error('[mailer] Failed to send placement qualification emails:', mailErr.message);
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Drive enrollment update error:', err.message);
        }
    }

    const io = req.app.get('io');
    pushSocketUpdate(io, userId, sessionId, 'SESSION_COMPLETED', 'Interview session ended early.', session);

    res.json({ message: 'Session ended successfully.', session, justQualifiedDrive });
});

// @desc    Toggle sharing on/off for a completed session
// @route   POST /api/sessions/:id/share
// @access  Private
const toggleShare = asyncHandler(async (req, res) => {
    const session = await Session.findOne({ _id: req.params.id, user: req.user._id });

    if (!session) {
        res.status(404);
        throw new Error('Session not found or user unauthorized.');
    }
    if (session.status !== 'completed') {
        res.status(400);
        throw new Error('Only completed sessions can be shared.');
    }

    if (session.isShared) {
        session.isShared = false;
        session.shareToken = null;
    } else {
        session.isShared = true;
        session.shareToken = crypto.randomBytes(24).toString('hex');
    }

    await session.save();
    res.json({ isShared: session.isShared, shareToken: session.shareToken });
});

// @desc    Get a shared session by its public token (no auth)
// @route   GET /api/sessions/shared/:token
// @access  Public
const getSharedSession = asyncHandler(async (req, res) => {
    const session = await Session.findOne({
        shareToken: req.params.token,
        isShared: true,
        status: 'completed',
    }).select('-user');

    if (!session) {
        res.status(404);
        throw new Error('Shared report not found or sharing has been disabled.');
    }

    res.json(session);
});

// @desc    Get global leaderboard grouped by template
// @route   GET /api/sessions/leaderboard
// @access  Private
const getLeaderboard = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const raw = await Session.aggregate([
        { $match: { status: 'completed', templateId: { $ne: null }, overallScore: { $gt: 0 } } },
        {
            $group: {
                _id: { templateId: '$templateId', userId: '$user' },
                bestScore: { $max: '$overallScore' },
            },
        },
        { $sort: { '_id.templateId': 1, bestScore: -1 } },
        {
            $group: {
                _id: '$_id.templateId',
                entries: { $push: { userId: '$_id.userId', bestScore: '$bestScore' } },
            },
        },
        { $lookup: { from: 'templates', localField: '_id', foreignField: '_id', as: 'template' } },
        { $unwind: '$template' },
        { $match: { 'template.isActive': true } },
        { $sort: { 'template.name': 1 } },
    ]);

    const leaderboard = await Promise.all(raw.map(async (item) => {
        const sorted = [...item.entries].sort((a, b) => b.bestScore - a.bestScore).slice(0, 10);
        const userIds = sorted.map(e => e.userId);
        const users = await User.find({ _id: { $in: userIds } }).select('name _id');
        const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u.name]));

        const ranked = sorted.map((e, i) => {
            const isCurrentUser = e.userId.toString() === userId.toString();
            const fullName = userMap[e.userId.toString()] || 'Anonymous';
            const parts = fullName.trim().split(' ');
            const displayName = isCurrentUser
                ? fullName
                : parts.length > 1
                    ? `${parts[0]} ${parts[1][0]}.`
                    : parts[0];
            return { rank: i + 1, name: displayName, score: e.bestScore, isCurrentUser };
        });

        const userEntry = ranked.find(e => e.isCurrentUser);
        return {
            templateId: item._id,
            templateName: item.template.name,
            templateRole: item.template.role,
            templateLevel: item.template.level,
            entries: ranked,
            userRank: userEntry?.rank ?? null,
            userBest: userEntry?.score ?? null,
        };
    }));

    res.json(leaderboard.filter(lb => lb.entries.length > 0));
});

export {
    createSession,
    getSessionById,
    getSessions,
    submitAnswer,
    endSession,
    calculateOverallScore,
    deleteSession,
    toggleShare,
    getSharedSession,
    getLeaderboard,
};




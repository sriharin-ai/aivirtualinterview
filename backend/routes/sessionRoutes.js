import express from "express";
import { 
    createSession, 
    deleteSession, 
    endSession, 
    getSessionById, 
    getSessions, 
    submitAnswer,
    toggleShare,
    getSharedSession,
    getLeaderboard,
} from "../controllers/sessionController.js";
import { protect } from "../middleware/authMiddleware.js";
import { uploadSingleAudio, uploadResume } from "../middleware/uploadMiddleware.js";

const router = express.Router();

// Public route — must come BEFORE protect middleware
router.get("/shared/:token", getSharedSession);

// Apply auth protection to all routes below
router.use(protect);

// Leaderboard route (must come before /:id)
router.get("/leaderboard", getLeaderboard);

// 1. Root Routes ("/")
router.route("/")
    .get(getSessions)
    .post(uploadResume, createSession);

// 2. ID Routes ("/:id")
router.route("/:id")
    .get(getSessionById)
    .delete(deleteSession);

// 3. Action Routes
router.route("/:id/submit-answer").post(uploadSingleAudio, submitAnswer);
router.route("/:id/end").post(endSession);
router.route("/:id/share").post(toggleShare);

export default router;

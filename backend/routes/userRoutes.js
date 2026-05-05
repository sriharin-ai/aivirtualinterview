import express from "express";
import { registerUser, loginUser, googleLogin, getUserProfile, updateUserProfile, getOrgPreview, getOrgDepartments, saveGoal, getPublicTemplates, getPublicRoles, getPublicSkills, getBatchLeaderboard } from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/google", googleLogin);
router.get("/org-preview/:code", getOrgPreview);
router.get("/org-departments/:orgCode", getOrgDepartments);
router.get("/templates", getPublicTemplates);
router.get("/roles", getPublicRoles);
router.get("/skills", getPublicSkills);
router.route("/profile").get(protect, getUserProfile).put(protect, updateUserProfile);
router.route("/goal").put(protect, saveGoal);
router.get("/batch-leaderboard", protect, getBatchLeaderboard);

export default router;
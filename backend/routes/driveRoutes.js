import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { listEligibleDrives, enrollInDrive, getMyEnrollments, getEnrollment, getDriveById, getStudentDriveLeaderboard } from '../controllers/driveController.js';

const router = express.Router();

router.get('/',                      protect, listEligibleDrives);
router.get('/my-enrollments',        protect, getMyEnrollments);
router.get('/:id',                   protect, getDriveById);
router.get('/:id/enrollment',        protect, getEnrollment);
router.get('/:id/leaderboard',       protect, getStudentDriveLeaderboard);
router.post('/:id/enroll',           protect, enrollInDrive);

export default router;

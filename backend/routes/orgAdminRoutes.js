import express from 'express';
import { orgAdminProtect } from '../middleware/orgAdminMiddleware.js';
import { protect } from '../middleware/authMiddleware.js';
import {
    orgAdminLogin, getOrgInfo,
    getOrgStudents, addOrgStudent, updateOrgStudent, deleteOrgStudent, bulkAddOrgStudents,
    getOrgAnalytics, getStudentSessions, getSubjectAnalytics, getRoleAnalytics,
    getDigestConfig, updateDigestConfig, sendDigestNow,
    getDepartments, addDepartment, deleteDepartment,
    getBatches, addBatch, updateBatch, deleteBatch,
    sendInvites, acceptInvite,
    getTeamGoals, sendNudgeToEmployee,
} from '../controllers/orgAdminController.js';
import {
    createDrive, listDrives, updateDrive, deleteDrive, closeDrive,
    getDriveLeaderboard, exportDriveLeaderboardCSV, getDriveAnalytics,
} from '../controllers/driveController.js';
import {
    listQuestionPacks, createQuestionPack, updateQuestionPack, deleteQuestionPack, listAvailableQuestions,
} from '../controllers/questionPackController.js';

const router = express.Router();

router.post('/login', orgAdminLogin);

router.get('/me',                          orgAdminProtect, getOrgInfo);
router.get('/students',                    orgAdminProtect, getOrgStudents);
router.post('/students',                   orgAdminProtect, addOrgStudent);
router.post('/students/bulk',              orgAdminProtect, bulkAddOrgStudents);
router.put('/students/:id',                orgAdminProtect, updateOrgStudent);
router.delete('/students/:id',             orgAdminProtect, deleteOrgStudent);
router.get('/students/:id/sessions',       orgAdminProtect, getStudentSessions);
router.get('/analytics',                   orgAdminProtect, getOrgAnalytics);
router.get('/subject-analytics',           orgAdminProtect, getSubjectAnalytics);
router.get('/role-analytics',              orgAdminProtect, getRoleAnalytics);

router.get('/digest-config',               orgAdminProtect, getDigestConfig);
router.put('/digest-config',               orgAdminProtect, updateDigestConfig);
router.post('/digest-send-now',            orgAdminProtect, sendDigestNow);

router.get('/departments',                 orgAdminProtect, getDepartments);
router.post('/departments',                orgAdminProtect, addDepartment);
router.delete('/departments/:name',        orgAdminProtect, deleteDepartment);

router.get('/batches',                     orgAdminProtect, getBatches);
router.post('/batches',                    orgAdminProtect, addBatch);
router.put('/batches/:id',                 orgAdminProtect, updateBatch);
router.delete('/batches/:id',              orgAdminProtect, deleteBatch);

router.post('/invite',                     orgAdminProtect, sendInvites);
router.post('/invite/accept',              protect, acceptInvite);

router.get('/team-goals',                  orgAdminProtect, getTeamGoals);
router.post('/students/:id/nudge',         orgAdminProtect, sendNudgeToEmployee);

router.get('/drives',                            orgAdminProtect, listDrives);
router.post('/drives',                           orgAdminProtect, createDrive);
router.put('/drives/:id',                        orgAdminProtect, updateDrive);
router.delete('/drives/:id',                     orgAdminProtect, deleteDrive);
router.post('/drives/:id/close',                 orgAdminProtect, closeDrive);
router.get('/drives/:id/leaderboard',            orgAdminProtect, getDriveLeaderboard);
router.get('/drives/:id/leaderboard/export',     orgAdminProtect, exportDriveLeaderboardCSV);
router.get('/drives/:id/analytics',              orgAdminProtect, getDriveAnalytics);

router.get('/question-packs',                    orgAdminProtect, listQuestionPacks);
router.post('/question-packs',                   orgAdminProtect, createQuestionPack);
router.put('/question-packs/:id',                orgAdminProtect, updateQuestionPack);
router.delete('/question-packs/:id',             orgAdminProtect, deleteQuestionPack);
router.get('/question-bank',                     orgAdminProtect, listAvailableQuestions);

export default router;

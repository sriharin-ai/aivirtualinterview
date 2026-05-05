import express from 'express';
import { adminProtect } from '../middleware/adminMiddleware.js';
import {
    adminLogin,
    getRoles, createRole, updateRole, deleteRole,
    getSkills, createSkill, updateSkill, deleteSkill,
    getQuestions, createQuestion, updateQuestion, deleteQuestion,
    generateQuestions,
    getTemplates, createTemplate, updateTemplate, deleteTemplate,
    getAnalytics,
    getStudents, getStudentSessions,
    seedDefaults,
} from '../controllers/adminController.js';
import {
    getOrganizations, createOrganization, updateOrganization, deleteOrganization,
} from '../controllers/organizationController.js';

const router = express.Router();

router.post('/login', adminLogin);

router.get('/roles',         adminProtect, getRoles);
router.post('/roles',        adminProtect, createRole);
router.put('/roles/:id',     adminProtect, updateRole);
router.delete('/roles/:id',  adminProtect, deleteRole);

router.get('/skills',        adminProtect, getSkills);
router.post('/skills',       adminProtect, createSkill);
router.put('/skills/:id',    adminProtect, updateSkill);
router.delete('/skills/:id', adminProtect, deleteSkill);

router.get('/questions',         adminProtect, getQuestions);
router.post('/questions',        adminProtect, createQuestion);
router.put('/questions/:id',     adminProtect, updateQuestion);
router.delete('/questions/:id',  adminProtect, deleteQuestion);
router.post('/questions/generate', adminProtect, generateQuestions);

router.get('/templates',         adminProtect, getTemplates);
router.post('/templates',        adminProtect, createTemplate);
router.put('/templates/:id',     adminProtect, updateTemplate);
router.delete('/templates/:id',  adminProtect, deleteTemplate);

router.get('/organizations',        adminProtect, getOrganizations);
router.post('/organizations',       adminProtect, createOrganization);
router.put('/organizations/:id',    adminProtect, updateOrganization);
router.delete('/organizations/:id', adminProtect, deleteOrganization);

router.get('/analytics', adminProtect, getAnalytics);
router.get('/students', adminProtect, getStudents);
router.get('/students/:id/sessions', adminProtect, getStudentSessions);
router.post('/seed', adminProtect, seedDefaults);

export default router;

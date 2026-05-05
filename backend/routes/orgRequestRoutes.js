import express from 'express';
import { submitOrgSignup, submitDemoRequest } from '../controllers/orgRequestController.js';

const router = express.Router();

router.post('/',      submitOrgSignup);
router.post('/demo',  submitDemoRequest);

export default router;

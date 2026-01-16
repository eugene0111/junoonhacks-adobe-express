import express from 'express';
import { planFixesEndpoint, executeFixes } from '../controllers/fix.js';

const router = express.Router();

router.post('/plan', planFixesEndpoint);
router.post('/execute', executeFixes);

export default router;

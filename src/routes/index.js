import express from 'express';
import { healthCheck } from '../controllers/index.js';

const router = express.Router();

router.get('/', healthCheck);

export default router;

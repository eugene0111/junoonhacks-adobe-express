import express from 'express';
import { addTexture, applyGradient } from '../controllers/tools.js';

const router = express.Router();

router.post('/add-texture', addTexture);
router.post('/apply-gradient', applyGradient);

export default router;

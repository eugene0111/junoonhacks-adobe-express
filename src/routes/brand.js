import express from 'express';
import { generateBrandProfile } from '../controllers/brand.js';
import { validateBrandRequest } from '../middleware/validation.js';

const router = express.Router();

router.post('/generate', validateBrandRequest, generateBrandProfile);

export default router;

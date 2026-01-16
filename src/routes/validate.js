import express from 'express';
import { validateDesign } from '../controllers/validate.js';

const router = express.Router();

router.post('/', validateDesign);

export default router;

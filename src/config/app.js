import express from 'express';
import cors from 'cors';
import indexRoutes from '../routes/index.js';
import brandRoutes from '../routes/brand.js';
import validateRoutes from '../routes/validate.js';
import fixRoutes from '../routes/fix.js';
import { errorHandler } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

export function createApp() {
    const app = express();

    
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey || geminiApiKey.trim() === "") {
        console.warn("⚠️  WARNING: GEMINI_API_KEY is not set in .env file");
        console.warn("   AI-powered brand generation will use fallback defaults");
        console.warn("   Get your API key from: https://makersuite.google.com/app/apikey");
    } else {
        console.log("✓ GEMINI_API_KEY loaded successfully");
        console.log(`   Key length: ${geminiApiKey.length} characters`);
        console.log(`   Key starts with: ${geminiApiKey.substring(0, 10)}...`);
    }

    app.use(cors());
    app.use(express.json());

    app.use((req, res, next) => {
        logger.info('Incoming request', {
            method: req.method,
            path: req.path,
            ip: req.ip
        });
        next();
    });

    app.use('/', indexRoutes);
    app.use('/brand', brandRoutes);
    app.use('/brand/validate', validateRoutes);
    app.use('/fix', fixRoutes);

    app.use(errorHandler);

    return app;
}

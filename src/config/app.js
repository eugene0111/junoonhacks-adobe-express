import express from 'express';
import cors from 'cors';
import indexRoutes from '../routes/index.js';
import brandRoutes from '../routes/brand.js';
import { errorHandler } from '../middleware/errorHandler.js';

export function createApp() {
    const app = express();

    app.use(cors());
    app.use(express.json());

    app.use('/', indexRoutes);
    app.use('/brand', brandRoutes);

    app.use(errorHandler);

    return app;
}

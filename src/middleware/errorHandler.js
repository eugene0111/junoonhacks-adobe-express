import logger from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
    logger.error('Error occurred', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    });

    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || 'Internal server error';
    const errorName = err.name || 'ServerError';

    const response = {
        success: false,
        error: errorName,
        message: message
    };

    if (process.env.NODE_ENV === 'development' && err.stack) {
        response.stack = err.stack;
    }

    if (err.details) {
        response.details = err.details;
    }

    res.status(statusCode).json(response);
}

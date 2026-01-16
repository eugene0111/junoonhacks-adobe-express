export function errorHandler(err, req, res) {
    console.error('Error:', err);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal server error';

    res.status(statusCode).json({
        error: 'Failed to generate brand profile',
        message: message
    });
}

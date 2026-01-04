import logger from './logger.js';

/**
 * Standard API Error Handler
 * @param {Error} error 
 * @param {import('express').Response} res 
 * @param {string} context 
 */
export const handleApiError = (error, res, context = 'API') => {
    // Log the error
    logger.error(`[${context}] Error:`, error);

    // Default status and message
    let status = 500;
    let message = 'Internal Server Error';

    // Handle known error types or patterns
    if (error.status) {
        status = error.status;
        message = error.message;
    } else if (error.message && error.message.includes('not found')) {
        status = 404;
        message = 'Resource not found';
    } else if (error.message && (error.message.includes('permission') || error.message.includes('denied') || error.message.includes('forbidden'))) {
        status = 403;
        message = 'Forbidden';
    } else if (error.code === '23505') { // Postgres unique violation
        status = 409;
        message = 'Resource already exists';
    }

    // Send response
    return res.status(status).json({
        error: message,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
};

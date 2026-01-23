import { log } from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
    // 1. Identify Error Type
    const status = err.status || 500;
    const code = err.code || 'INTERNAL_SERVER_ERROR';
    const message = err.message || 'An unexpected error occurred';
    
    // 2. Structured Log
    const safeUrl = req.originalUrl.replace(/\/webhooks\/whatsapp\/([^\/]+)\/([^\/?]+)/, '/webhooks/whatsapp/$1/[MASKED]');
    log.error(`[ERROR] ${code}: ${message}`, {
        requestId: req.context?.requestId,
        stack: err.stack,
        path: safeUrl,
        method: req.method,
        userId: req.user?.id
    });

    // 3. Clean Response (Hide internals in production)
    const response = {
        error: {
            code,
            message,
            ...(process.env.NODE_ENV !== 'production' && { details: err.details, stack: err.stack })
        }
    };

    if (res.headersSent) {
        return next(err);
    }

    res.status(status).json(response);
};

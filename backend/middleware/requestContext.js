import { v4 as uuidv4 } from 'uuid';
import { metrics } from '../services/metricsService.js';
import log from '../utils/logger.js';

/**
 * Middleware to track request context and performance metrics
 */
export const requestContext = (req, res, next) => {
    req.context = {
        requestId: uuidv4(),
        startTime: Date.now()
    };
    
    // Helper to mask secrets in URL
    const safeUrl = req.originalUrl.replace(/\/webhooks\/whatsapp\/([^\/]+)\/([^\/?]+)/, '/webhooks/whatsapp/$1/[MASKED]');

    // Log Request Start
    log.info(`[REQ] ${req.method} ${safeUrl}`, { 
        requestId: req.context.requestId,
        ip: req.ip 
    });

    // Hook into response finish
    res.on('finish', () => {
        const duration = Date.now() - req.context.startTime;
        const unitId = req.unitId || req.user?.unitId || 'anon';
        const userId = req.user?.id || 'anon';
        
        log.info(`[RES] ${req.method} ${safeUrl}`, { 
            requestId: req.context.requestId,
            status: res.statusCode,
            duration,
            unitId,
            userId
        });

        // Record Metrics
        if (unitId) {
            metrics.increment(unitId, 'api_requests_count');
            // metrics.recordLatency(unitId, duration); // Future: latency tracking
        }
    });

    next();
};

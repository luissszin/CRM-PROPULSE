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
    
    // Log Request Start
    // log.info(`[REQ] ${req.method} ${req.originalUrl}`, { requestId: req.context.requestId });

    // Hook into response finish
    res.on('finish', () => {
        const duration = Date.now() - req.context.startTime;
        const unitId = req.unitId || req.user?.unitId;
        const userId = req.user?.id;
        
        // Log Request End
        // log.info(`[RES] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`, { 
        //     requestId: req.context.requestId,
        //     unitId,
        //     userId
        // });

        // Record Metrics
        if (unitId) {
            metrics.increment(unitId, 'api_requests_count');
            // metrics.recordLatency(unitId, duration); // Future: latency tracking
        }
    });

    next();
};

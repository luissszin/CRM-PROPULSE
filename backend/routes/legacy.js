import express from 'express';
import { log } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

const handleLegacy = (req, res) => {
    const requestId = req.context?.requestId || uuidv4();
    log.warn(`[LEGACY ROUTE] Access attempted on ${req.originalUrl}`, {
        requestId,
        ip: req.ip,
        method: req.method
    });

    res.status(410).json({
        error: 'Gone',
        message: 'This webhook endpoint is deprecated and has been removed.',
        instruction: 'Please update your webhook URL to: /webhooks/whatsapp/:provider/:secret',
        deprecationDate: '2026-01-22'
    });
};

// Old Z-API route
router.all('/zapi/webhook', handleLegacy);

// Generic old webhooks
router.all('/webhooks', handleLegacy);

export default router;

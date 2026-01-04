// WhatsApp Webhook Routes
// Unified webhook endpoint for all WhatsApp providers

import express from 'express';
import { supabase } from '../services/supabaseService.js';
import { webhookLimiter } from '../middleware/rateLimiter.js';
import { log } from '../utils/logger.js';

const router = express.Router();

// ✅ RATE LIMITING para webhooks (60/min)
router.use(webhookLimiter);

/**
 * POST /webhooks/whatsapp/:provider/:secret
 * Receive webhooks from WhatsApp providers
 */
router.post('/:provider/:secret', async (req, res) => {
    try {
        const { provider, secret } = req.params;
        const payload = req.body;

        log.whatsapp.webhookReceived(provider, payload.instanceId || 'unknown');

        // Find connection by webhook secret
        const { data: connection, error } = await supabase
            .from('unit_whatsapp_connections')
            .select('*')
            .eq('webhook_secret', secret)
            .eq('provider', provider.toLowerCase())
            .single();

        if (error || !connection) {
            console.error('[Webhook] Connection not found for secret:', secret);
            return res.status(404).json({ error: 'Connection not found' });
        }

        console.log(`[Webhook] Processing webhook for unit: ${connection.unit_id}`);

        // Simple webhook acknowledgment
        // Full webhook processing can be added later
        return res.status(200).json({ success: true, received: true });
    } catch (error) {
        console.error('[Webhook] Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /webhooks/whatsapp/:provider/:secret
 * Meta webhook verification endpoint
 */
router.get('/:provider/:secret', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === req.params.secret) {
        console.log('[Webhook] Meta webhook verified');
        return res.status(200).send(challenge);
    }

    return res.status(403).json({ error: 'Verification failed' });
});

export default router;

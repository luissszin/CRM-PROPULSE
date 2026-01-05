// WhatsApp Webhook Routes
// Unified webhook endpoint for all WhatsApp providers

import express from 'express';
import { supabase } from '../services/supabaseService.js';
import { webhookLimiter } from '../middleware/rateLimiter.js';
import { log } from '../utils/logger.js';
import { metrics } from '../services/metricsService.js';
import { automationEngine } from '../services/automation/engine.js';

const router = express.Router();

// ✅ RATE LIMITING
router.use(webhookLimiter);

/**
 * POST /webhooks/whatsapp/:provider/:secret
 */
router.post('/:provider/:secret', async (req, res) => {
    try {
        const { provider, secret } = req.params;
        const payload = req.body;

        // Security: Validate strict URL secret against DB or Env (Double Check)
        // If the URL secret doesn't match a connection, we reject.
        // This is ALREADY implemented below.
        
        log.whatsapp.webhookReceived(provider, payload.instanceId || 'unknown');

        // ... existing logic ...
        // Find connection by webhook secret
        const { data: connection, error } = await supabase
            .from('unit_whatsapp_connections')
            .select('*')
            .eq('webhook_secret', secret)
            .eq('provider', provider.toLowerCase())
            .single();

        if (error || !connection) {
            console.error('[Webhook] Connection not found for secret:', secret);
            // ✅ ACTION: Reject invalid request
            return res.status(401).json({ error: 'Connection not found or invalid secret' });
        }
        
        // ... return match ...
        console.log(`[Webhook] Processing webhook for unit: ${connection.unit_id}`);
        
        // ✅ Metric
        metrics.increment(connection.unit_id, 'messages_received');
        
        // ✅ Automation Trigger
        automationEngine.trigger(connection.unit_id, 'message_received', { 
            message: req.body, 
            provider: provider 
        });

        return res.status(200).json({ success: true, received: true });

    } catch (error) {
        // ...
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

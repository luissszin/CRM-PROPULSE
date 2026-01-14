// WhatsApp Webhook Routes
// Unified webhook endpoint for all WhatsApp providers

import express from 'express';
import { supabase } from '../services/supabaseService.js';
import { webhookLimiter } from '../middleware/rateLimiter.js';
import { log } from '../utils/logger.js';
import { metrics } from '../services/metricsService.js';
import { automationEngine } from '../services/automation/engine.js';

import { messageHandlerService } from '../services/whatsapp/messageHandler.service.js';

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

        // 1. Find connection by webhook secret
        const { data: connection, error } = await supabase
            .from('unit_whatsapp_connections')
            .select('*')
            .eq('webhook_secret', secret)
            .eq('provider', provider.toLowerCase())
            .single();

        if (error || !connection) {
            console.error('[Webhook] Connection not found for secret:', secret);
            return res.status(401).json({ error: 'Connection not found or invalid secret' });
        }
        
        log.whatsapp.webhookReceived(provider, payload.instanceId || 'unknown');
        
        // 2. Route payload based on content/event
        const isStatusUpdate = (provider === 'evolution' && payload.event === 'connection.update') || 
                              (provider === 'zapi' && payload.connected !== undefined);

        if (isStatusUpdate) {
            await messageHandlerService.handleStatusUpdate(connection.unit_id, provider.toLowerCase(), payload);
        } else {
            // Process Message via Service
            // Metrics and Automations are handled inside the service now for consistency
            await messageHandlerService.handleIncoming(connection.unit_id, provider.toLowerCase(), payload);
            
            // 3. Update Metrics
            metrics.increment(connection.unit_id, 'messages_received');
        }

        return res.status(200).json({ success: true, received: true });


    } catch (error) {
        console.error('[Webhook] Error:', error);
        // We return 200 even on error to some providers to stop retries, 
        // but 500 is technically more correct for debugging.
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

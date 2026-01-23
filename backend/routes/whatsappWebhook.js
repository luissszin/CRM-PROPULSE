// WhatsApp Webhook Routes
// Unified webhook endpoint for all WhatsApp providers

import express from 'express';
import { supabase } from '../services/supabaseService.js';
import { webhookLimiter } from '../middleware/rateLimiter.js';
import { log } from '../utils/logger.js';
import { metrics } from '../services/metricsService.js';
import { automationEngine } from '../services/automation/engine.js';

import { messageHandlerService } from '../services/whatsapp/messageHandler.service.js';
import { extractInstanceName, maskPhone, maskUrlSecrets } from '../utils/webhookHelper.js';

const router = express.Router();

// ✅ RATE LIMITING
router.use(webhookLimiter);

/**
 * POST /webhooks/whatsapp/:provider/:secret
 * Production-grade webhook handler with:
 * - Instance-based routing (no DB lookup for instance)
 * - Secure logging (masked secrets/phones)
 * - Graceful unknown instance handling
 */
router.post('/:provider/:secret', async (req, res) => {
    const requestId = req.requestId || 'no-id';
    const { provider, secret  } = req.params;
    const payload = req.body;
    
    try {
        // 1. Provider Validation
        const validProviders = ['evolution', 'zapi', 'meta'];
        if (!validProviders.includes(provider.toLowerCase())) {
            log.security.authFailed(`webhook_${requestId}`, `Invalid provider: ${provider}`);
            return res.status(400).json({ error: 'Invalid provider' });
        }

        // 2. Extract Instance Name (Critical: this maps to unit)
        const instanceName = extractInstanceName(payload);
        
        if (!instanceName) {
            // Log but return 200 (don't retry malformed payloads)
            console.warn(`[Webhook:${requestId}] No instance in payload, event=${payload.event}`);
            return res.status(200).json({ received: true, warning: 'no_instance' });
        }

        // 3. Resolve Instance -> Unit via DB
        const { data: connection, error: connError } = await supabase
            .from('unit_whatsapp_connections')
            .select('*')
            .eq('instance_id', instanceName)
            .eq('provider', provider.toLowerCase())
            .eq('webhook_secret', secret)
            .single();

        if (connError || !connection) {
            // CRITICAL: Return 200 to avoid Evolution retries for unknown instances
            // But log for security monitoring
            if (connError?.code !== 'PGRST116') { // Not "not found"
                console.error(`[Webhook:${requestId}] DB error:`, connError);
            }
            
            console.warn(`[Webhook:${requestId}] Unknown instance: ${instanceName}, provider: ${provider}`);
            log.security.authFailed(`webhook_${requestId}`, `Unknown instance: ${instanceName}`);
            
            return res.status(200).json({ received: true, warning: 'unknown_instance' });
        }

        // 4. Secure Logging (NO sensitive data)
        const logContext = {
            requestId,
            unitId: connection.unit_id,
            provider: provider.toLowerCase(),
            event: payload.event || 'message',
            instance: instanceName
        };
        
        log.whatsapp.webhookReceived(provider, instanceName);
        
        // 5. Route by Event Type
        const isConnectionUpdate = 
            (provider === 'evolution' && (payload.event === 'connection.update' || payload.event === 'qrcode.updated')) ||
            (provider === 'zapi' && payload.connected !== undefined);
        
        const isMessageStatusUpdate = 
            (provider === 'evolution' && payload.event === 'messages.update');

        if (isConnectionUpdate) {
            await messageHandlerService.handleStatusUpdate(
                connection.unit_id, 
                provider.toLowerCase(), 
                payload
            );
            console.log(`[Webhook:${requestId}] Status updated for unit ${connection.unit_id}`);
        } 
        else if (isMessageStatusUpdate) {
            await messageHandlerService.handleMessageStatusUpdate(
                connection.unit_id,
                provider.toLowerCase(),
                payload
            );
            console.log(`[Webhook:${requestId}] Message status updated`);
        }
        else {
            // Inbound Message
            const result = await messageHandlerService.handleIncoming(
                connection.unit_id,
                provider.toLowerCase(),
                payload,
                connection.id
            );
            
            if (result?.dedup) {
                console.log(`[Webhook:${requestId}] Message deduplicated`);
            } else {
                console.log(`[Webhook:${requestId}] Message created: ${result?.messageId}`);
                metrics.increment(connection.unit_id, 'messages_received');
            }
        }

        return res.status(200).json({ success: true, received: true });

    } catch (error) {
        // CRITICAL: Always return 200 to avoid webhook storms
        // Log error internally for monitoring
        console.error(`[Webhook:${requestId}] Processing error:`, {
            error: error.message,
            provider,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
        
        // Return success to Evolution API (we logged the error)
        return res.status(200).json({ 
            received: true, 
            error: 'processing_failed',
            requestId 
        });
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

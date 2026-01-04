// WhatsApp Connection Routes
// Unified routes for connecting, managing, and sending messages via WhatsApp

import express from 'express';
import { requireAuth, requireUnitContext } from '../middleware/auth.js';
import { supabase } from '../services/supabaseService.js';
import { whatsappService } from '../services/whatsapp/whatsapp.service.js';
import crypto from 'crypto';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

/**
 * Helper to get connection from DB and validate Unit ownership
 */
async function getConnection(unitId) {
    const { data, error } = await supabase
        .from('unit_whatsapp_connections')
        .select('*')
        .eq('unit_id', unitId)
        .single();
    
    // No error throw if not found, just return null, let route handle
    if (error && error.code !== 'PGRST116') throw error; 
    return data;
}

/**
 * POST /units/:unitId/whatsapp/connect
 * Connect WhatsApp to a unit (Create Instance/Get QR)
 */
router.post('/:unitId/whatsapp/connect', requireUnitContext, async (req, res) => {
    try {
        const { unitId } = req.params; // Verified vs req.unitId by middleware? 
        // Middleware `requireUnitContext` enforces `req.unitId`.
        // We really should use `req.unitId` to be 100% safe or check match.
        if (req.unitId !== unitId) return res.status(403).json({ error: 'Unit mismatch' });

        const { provider, credentials } = req.body;

        if (!provider) return res.status(400).json({ error: 'Provider is required' });

        // 1. Check existing DB entry
        let connection = await getConnection(unitId);
        
        // 2. Setup Config
        const instanceName = credentials?.instanceId || `unit_${unitId}`;
        const config = {
            apiKey: credentials.apiKey || process.env.EVOLUTION_API_KEY,
            apiUrl: credentials.apiUrl || process.env.EVOLUTION_API_BASE_URL,
            ...credentials
        };

        // 3. Call Service to Create/Init Instance
        // Note: For Evolution, 'createInstance' usually returns success if created.
        const result = await whatsappService.createInstance(provider, config, instanceName);

        // 4. Update/Insert into DB
        const payload = {
            unit_id: unitId,
            provider: provider.toLowerCase(),
            instance_id: result.instanceId || instanceName,
            status: result.status || 'disconnected',
            qr_code: result.qrcode || null,
            provider_config: config,
            webhook_secret: connection?.webhook_secret || crypto.randomBytes(32).toString('hex')
        };

        if (connection) {
            const { data: updated } = await supabase
                .from('unit_whatsapp_connections')
                .update(payload)
                .eq('id', connection.id)
                .select()
                .single();
            connection = updated;
        } else {
            const { data: inserted } = await supabase
                .from('unit_whatsapp_connections')
                .insert(payload)
                .select()
                .single();
            connection = inserted;
        }

        return res.status(201).json({
            success: true,
            connection: {
                id: connection.id,
                status: connection.status,
                qrCode: connection.qr_code
            }
        });

    } catch (error) {
        console.error('[Connect] Error:', error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * GET /units/:unitId/whatsapp/qrcode
 * Explicitly request a QR Code generation (Connect)
 */
router.get('/:unitId/whatsapp/qrcode', requireUnitContext, async (req, res) => {
    try {
        const { unitId } = req.params;
        if (req.unitId !== unitId) return res.status(403).json({ error: 'Unit mismatch' });

        const connection = await getConnection(unitId);
        if (!connection) return res.status(404).json({ error: 'No configuration found. Configure first.' });

        const { provider, instance_id, provider_config } = connection;

        // Call Service
        const result = await whatsappService.connect(provider, provider_config, instance_id);

        // Update DB
        if (result.qrcode) {
             await supabase.from('unit_whatsapp_connections')
                .update({ 
                    qr_code: result.qrcode,
                    status: 'connecting' // or 'waiting_qr'
                })
                .eq('id', connection.id);
        }

        return res.json({
            qrcode: result.qrcode,
            status: 'connecting'
        });

    } catch (error) {
        console.error('[GetQR] Error:', error);
        return res.status(500).json({ error: error.message });
    }
});


/**
 * GET /units/:unitId/whatsapp/status
 * Get Real-time Status
 */
router.get('/:unitId/whatsapp/status', requireUnitContext, async (req, res) => {
    try {
        const { unitId } = req.params;
        if (req.unitId !== unitId) return res.status(403).json({ error: 'Unit mismatch' });

        const connection = await getConnection(unitId);
        if (!connection) return res.json({ status: 'not_configured' });

        // 1. Get Live Status from Provider
        const liveStatus = await whatsappService.getStatus(connection.provider, connection.provider_config, connection.instance_id);

        // 2. Update DB if changed
        if (liveStatus.status && liveStatus.status !== connection.status) {
             await supabase.from('unit_whatsapp_connections')
                .update({ 
                    status: liveStatus.status,
                    phone_number: liveStatus.phone || connection.phone_number
                })
                .eq('id', connection.id);
             
             connection.status = liveStatus.status;
        }

        return res.json({
            id: connection.id,
            status: connection.status,
            phone: connection.phone_number,
            qrCode: connection.status === 'connected' ? null : connection.qr_code, // Keep QR if not connected
            provider: connection.provider
        });

    } catch (error) {
        console.error('[GetStatus] Error:', error);
        return res.status(500).json({ error: error.message });
    }
});


/**
 * DELETE /units/:unitId/whatsapp/disconnect
 */
router.delete('/:unitId/whatsapp/disconnect', requireUnitContext, async (req, res) => {
     try {
        const { unitId } = req.params;
        if (req.unitId !== unitId) return res.status(403).json({ error: 'Unit mismatch' });

        const connection = await getConnection(unitId);
        if (!connection) return res.status(404).json({ error: 'Connection not found' });

        // Call Service
        await whatsappService.disconnect(connection.provider, connection.provider_config, connection.instance_id);

        // Update DB
        await supabase.from('unit_whatsapp_connections')
            .update({ status: 'disconnected', qr_code: null })
            .eq('id', connection.id);

        return res.json({ success: true });

    } catch (error) {
        console.error('[Disconnect] Error:', error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * POST /units/:unitId/whatsapp/send
 */
router.post('/:unitId/whatsapp/send', requireUnitContext, async (req, res) => {
     try {
        const { unitId } = req.params;
        const { phone, message } = req.body;
        if (req.unitId !== unitId) return res.status(403).json({ error: 'Unit mismatch' });

        const connection = await getConnection(unitId);
        if (!connection || connection.status !== 'connected') {
            return res.status(400).json({ error: 'WhatsApp not connected' });
        }

        const result = await whatsappService.sendMessage(
            connection.provider,
            connection.provider_config,
            connection.instance_id,
            phone,
            message,
            unitId // ✅ Metrics tracking
        );

        return res.json({ success: true, id: result.id });
     } catch (error) {
         console.error('[Send] Error:', error);
         return res.status(500).json({ error: error.message });
     }
});

export default router;


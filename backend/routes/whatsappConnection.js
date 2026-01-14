// WhatsApp Connection Routes
// Unified routes for connecting, managing, and sending messages via WhatsApp

import express from 'express';
import { requireAuth, requireUnitContext } from '../middleware/auth.js';
import { supabase } from '../services/supabaseService.js';
import { whatsappService } from '../services/whatsapp/whatsapp.service.js';
import crypto from 'crypto';
import { log } from '../utils/logger.js';


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
    const { unitId: unitParam } = req.params;
    let unitId = null;
    let instanceName = null;

    try {
        // 1. Resolve Unit (ID or Slug)
        const { data: unit, error: unitError } = await supabase
            .from('units')
            .select('id, slug')
            .or(`id.eq.${unitParam},slug.eq.${unitParam}`)
            .single();

        if (unitError || !unit) {
            return res.status(404).json({ error: 'Unit not found' });
        }

        unitId = unit.id;
        if (req.user.role !== 'super_admin' && req.unitId !== unitId) {
            return res.status(403).json({ error: 'Unit access denied' });
        }

        const { provider, credentials = {} } = req.body || {};
        if (!provider) return res.status(400).json({ error: 'Provider is required' });

        // 1.5 Fetch existing connection
        let connection = await getConnection(unitId);

        // 2. Setup Config safely and Sanitize InstanceName
        instanceName = credentials?.instanceId || `unit_${unitId.substring(0, 8)}`;
        instanceName = instanceName.replace(/[^a-zA-Z0-9_-]/g, '_');

        const config = {
            apiKey: credentials?.apiKey || process.env.EVOLUTION_API_KEY,
            apiUrl: credentials?.apiUrl || process.env.EVOLUTION_API_BASE_URL,
            ...credentials
        };

        // 3. Call Service
        const result = await whatsappService.createInstance(provider, config, instanceName);

        // 4. Update/Insert into DB
        const payload = {
            unit_id: unitId,
            provider: provider.toLowerCase(),
            instance_id: result.instanceId || instanceName,
            status: result.status || 'disconnected',
            qr_code: result.status === 'connected' ? null : (result.qrcode || null),
            provider_config: config,
            webhook_secret: connection?.webhook_secret || crypto.randomBytes(32).toString('hex')
        };

        if (connection) {
            const { data: updated, error: updateError } = await supabase
                .from('unit_whatsapp_connections')
                .update(payload)
                .eq('id', connection.id)
                .select()
                .single();
            if (updateError) throw updateError;
            connection = updated;
        } else {
            const { data: inserted, error: insertError } = await supabase
                .from('unit_whatsapp_connections')
                .insert(payload)
                .select()
                .single();
            if (insertError) throw insertError;
            connection = inserted;
        }

        if (!connection) {
            throw new Error('Failed to save connection to database');
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
        let status = 500;
        let message = error.message;
        let details = error.response?.data;

        // If it's an axios error or similar with a response
        if (error.response?.status) {
            status = error.response.status;
        } 
        // If it's the wrapped error from provider: Error: Failed to create... {"status":401...}
        else if (message.includes('"status":')) {
            try {
                const innerDetailsSnippet = message.substring(message.indexOf('{'));
                const innerDetails = JSON.parse(innerDetailsSnippet);
                if (innerDetails.status) status = innerDetails.status;
            } catch (e) { /* ignore parse error */ }
        }

        console.error('[WhatsApp Connect] ERROR:', {
            unitParam,
            unitId,
            instanceName,
            status,
            errorMessage: message,
            details
        });

        return res.status(status).json({ 
            error: message,
            details: details
        });
    }

});


/**
 * GET /units/:unitId/whatsapp/qrcode
 * Explicitly request a QR Code generation (Connect)
 */
router.get('/:unitId/whatsapp/qrcode', requireUnitContext, async (req, res) => {
    const { unitId: unitParam } = req.params;
    let currentUnitId = null;

    try {
        const { data: unit } = await supabase.from('units').select('id').or(`id.eq.${unitParam},slug.eq.${unitParam}`).single();
        if (!unit) return res.status(404).json({ error: 'Unit not found' });
        currentUnitId = unit.id;

        if (req.user.role !== 'super_admin' && req.unitId !== currentUnitId) {
            return res.status(403).json({ error: 'Unit access denied' });
        }

        const connection = await getConnection(currentUnitId);
        if (!connection) return res.status(404).json({ error: 'No configuration found. Configure first.' });

        const { provider, instance_id, provider_config } = connection;

        // 1. Check current status first
        const liveStatus = await whatsappService.getStatus(provider, provider_config, instance_id);
        if (liveStatus.status === 'connected') {
            await supabase.from('unit_whatsapp_connections')
                .update({ status: 'connected', qr_code: null })
                .eq('id', connection.id);
            
            return res.json({
                status: 'connected',
                message: 'Já está conectado'
            });
        }

        // 2. Call Service to get QR
        const result = await whatsappService.connect(provider, provider_config, instance_id);

        // Update DB
        if (result.qrcode) {
             await supabase.from('unit_whatsapp_connections')
                .update({ 
                    qr_code: result.qrcode,
                    status: 'connecting'
                })
                .eq('id', connection.id);
        }

        return res.json({
            qrcode: result.qrcode,
            status: result.qrcode ? 'connecting' : (liveStatus.status || 'disconnected')
        });


    } catch (error) {
        console.error('[WhatsApp QR] ERROR:', {
            unitParam,
            currentUnitId,
            errorMessage: error.message,
            stack: error.stack
        });
        return res.status(500).json({ error: error.message });
    }
});



/**
 * GET /units/:unitId/whatsapp/status
 * Get Real-time Status
 */
router.get('/:unitId/whatsapp/status', requireUnitContext, async (req, res) => {
    const { unitId: unitParam } = req.params;
    let currentUnitId = null;

    try {
        const { data: unit } = await supabase.from('units').select('id').or(`id.eq.${unitParam},slug.eq.${unitParam}`).single();
        if (!unit) return res.status(404).json({ error: 'Unit not found' });
        currentUnitId = unit.id;

        if (req.user.role !== 'super_admin' && req.unitId !== currentUnitId) {
            return res.status(403).json({ error: 'Unit access denied' });
        }

        const connection = await getConnection(currentUnitId);
        if (!connection) return res.json({ status: 'not_configured' });

        // 1. Get Live Status from Provider
        const liveStatus = await whatsappService.getStatus(connection.provider, connection.provider_config, connection.instance_id);

        // 2. Update DB if changed
        if (liveStatus.status && liveStatus.status !== connection.status) {
             const updatePayload = { 
                status: liveStatus.status,
                phone_number: liveStatus.phone || connection.phone_number
             };
             
             // If connected, clear QR code
             if (liveStatus.status === 'connected') {
                 updatePayload.qr_code = null;
             }

             await supabase.from('unit_whatsapp_connections')
                .update(updatePayload)
                .eq('id', connection.id);
             
             connection.status = liveStatus.status;
             if (liveStatus.status === 'connected') connection.qr_code = null;
        }

        return res.json({
            id: connection.id,
            status: connection.status,
            phone: connection.phone_number,
            qrCode: connection.status === 'connected' ? null : connection.qr_code,
            provider: connection.provider
        });

    } catch (error) {
        console.error('[WhatsApp Status] ERROR:', {
            unitParam,
            currentUnitId,
            errorMessage: error.message,
            stack: error.stack
        });
        return res.status(500).json({ error: error.message });
    }
});



/**
 * DELETE /units/:unitId/whatsapp/disconnect
 */
router.delete('/:unitId/whatsapp/disconnect', requireUnitContext, async (req, res) => {
     const { unitId: unitParam } = req.params;
     let unitId = null;

     try {
        const { data: unit } = await supabase.from('units').select('id').or(`id.eq.${unitParam},slug.eq.${unitParam}`).single();
        if (!unit) return res.status(404).json({ error: 'Unit not found' });
        unitId = unit.id;

        const connection = await getConnection(unitId);
        if (!connection) return res.status(404).json({ error: 'Connection not found' });

        // Call Service
        try {
            await whatsappService.disconnect(connection.provider, connection.provider_config, connection.instance_id);
        } catch (discErr) {
            console.warn(`[WhatsApp Disconnect] Provider disconnect failed, but proceeding to clear DB: ${discErr.message}`);
        }


        // Update DB
        const { error: dbError } = await supabase.from('unit_whatsapp_connections')
            .update({ status: 'disconnected', qr_code: null })
            .eq('id', connection.id);

        if (dbError) throw dbError;

        return res.json({ success: true });

    } catch (error) {
        console.error('[WhatsApp Disconnect] ERROR:', {
            unitParam,
            unitId,
            errorMessage: error.message,
            stack: error.stack
        });
        return res.status(500).json({ error: error.message });
    }
});


/**
 * POST /units/:unitId/whatsapp/send
 */
router.post('/:unitId/whatsapp/send', requireUnitContext, async (req, res) => {
     let currentUnitId = null;
     try {
        const { unitId: unitParam } = req.params;
        const { phone, message } = req.body;
        
        const { data: unit } = await supabase.from('units').select('id').or(`id.eq.${unitParam},slug.eq.${unitParam}`).single();
        if (!unit) return res.status(404).json({ error: 'Unit not found' });
        currentUnitId = unit.id;

        if (req.user.role !== 'super_admin' && req.unitId !== currentUnitId) {
            return res.status(403).json({ error: 'Unit access denied' });
        }

        const connection = await getConnection(currentUnitId);
        if (!connection || connection.status !== 'connected') {
            return res.status(400).json({ error: 'WhatsApp not connected' });
        }


        const result = await whatsappService.sendMessage(
            connection.provider,
            connection.provider_config,
            connection.instance_id,
            phone,
            message,
            currentUnitId // ✅ Metrics tracking
        );


        return res.json({ success: true, id: result.id });
     } catch (error) {
         console.error('[Send] Error:', error);
         return res.status(500).json({ error: error.message });
     }
});

export default router;


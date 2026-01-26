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
 * Note: Does NOT use requireUnitContext to allow super_admin to configure any unit
 */
router.post('/:unitId/whatsapp/connect', async (req, res) => {
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
        
        // 2. Authorization check: super_admin can access any unit, others must match their unitId
        console.log('[WhatsApp Connect] Authorization check:', {
            requestedUnitId: unitId,
            userRole: req.user.role,
            userUnitId: req.user.unitId,
            userEmail: req.user.email,
            isSuperAdmin: req.user.role === 'super_admin',
            hasUnitId: !!req.user.unitId,
            unitIdsMatch: req.user.unitId === unitId
        });
        
        if (req.user.role !== 'super_admin') {
            if (!req.user.unitId) {
                console.error('[WhatsApp Connect] 403: User has no assigned unit');
                return res.status(403).json({ error: 'User has no assigned unit' });
            }
            if (req.user.unitId !== unitId) {
                console.error('[WhatsApp Connect] 403: Unit mismatch', {
                    requested: unitId,
                    userBelongsTo: req.user.unitId
                });
                log.security.authFailed(req.user.email, `Attempted to configure unit ${unitId} but belongs to ${req.user.unitId}`);
                return res.status(403).json({ error: 'Unit access denied' });
            }
        }
        
        console.log('[WhatsApp Connect] ✅ Authorization passed');

        const { provider, credentials = {} } = req.body || {};
        if (!provider) return res.status(400).json({ error: 'Provider is required' });

        // 1.5 Fetch existing connection and prepare secrets
        console.log('[WhatsApp Connect] Fetching connection from DB...');
        let connection = await getConnection(unitId);
        const webhookSecret = connection?.webhook_secret || crypto.randomBytes(32).toString('hex');
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        const webhookConfig = {
            url: `${baseUrl}/webhooks/whatsapp/evolution/${webhookSecret}`
        };

        console.log('[WhatsApp Connect] Connection found:', !!connection);

        // 2. Setup Config safely and Sanitize InstanceName
        instanceName = credentials?.instanceId || `unit_${unitId.substring(0, 8)}`;
        instanceName = instanceName.replace(/[^a-zA-Z0-9_-]/g, '_');

        // Sanitize credentials - treat empty strings as undefined to use env defaults
        const sanitizedApiKey = credentials?.apiKey?.trim() || undefined;
        const sanitizedApiUrl = credentials?.apiUrl?.trim() || undefined;

        const config = {
            apiKey: sanitizedApiKey || process.env.EVOLUTION_API_KEY,
            apiUrl: sanitizedApiUrl || process.env.EVOLUTION_API_BASE_URL,
        };

        // Log para debug
        console.log('[WhatsApp Connect] Config:', {
            unitId,
            instanceName,
            provider,
            apiUrl: config.apiUrl,
            hasApiKey: !!config.apiKey,
            webhookUrl: webhookConfig.url
        });

        // 3. Call Service
        console.log('[WhatsApp Connect] Calling whatsappService.createInstance...');
        const result = await whatsappService.createInstance(provider, config, instanceName, webhookConfig);
        console.log('[WhatsApp Connect] whatsappService.createInstance completed:', {
            status: result.status,
            hasQR: !!result.qrcode
        });

        // 4. Update/Insert into DB
        const payload = {
            unit_id: unitId,
            provider: provider.toLowerCase(),
            instance_id: result.instanceId || instanceName,
            status: result.status || 'disconnected',
            qr_code: result.status === 'connected' ? null : (result.qrcode || null),
            provider_config: config,
            webhook_secret: webhookSecret
        };

        if (connection) {
            console.log('[WhatsApp Connect] Updating existing connection in DB...');
            const { data: updated, error: updateError } = await supabase
                .from('unit_whatsapp_connections')
                .update(payload)
                .eq('id', connection.id)
                .select()
                .single();
            if (updateError) throw updateError;
            connection = updated;
            console.log('[WhatsApp Connect] DB Update successful');
        } else {
            console.log('[WhatsApp Connect] Inserting new connection in DB...');
            const { data: inserted, error: insertError } = await supabase
                .from('unit_whatsapp_connections')
                .insert(payload)
                .select()
                .single();
            if (insertError) throw insertError;
            connection = inserted;
            console.log('[WhatsApp Connect] DB Insert successful');
        }

        if (!connection) {
            throw new Error('Failed to save connection to database');
        }

        // 5. Check if we actually got a QR code (standardized error)
        if (result.status === 'failed' || (result.status === 'connecting' && !result.qrcode)) {
            return res.status(424).json({
                error: {
                    code: result.error || 'PROVIDER_QR_NOT_READY',
                    message: result.message || 'WhatsApp instance created but QR Code is not yet ready. Please try again in a few seconds.',
                    details: 'Evolution API background initialization (Baileys) might take a few moments.'
                }
            });
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
        console.error('[WhatsApp Connect] FULL ERROR:', error);
        let status = 500;
        let message = error.message;
        let details = error.response?.data;

        // If it's an axios error or similar with a response
        if (error.response?.status) {
            status = error.response.status;
            
            // CRITICAL: Mask Provider 401/403 as 424 (Failed Dependency)
            // If we return 401, the CRM Frontend might log the user out!
            if (status === 401 || status === 403) {
                console.warn(`[WhatsApp Connect] Handler intercepted Provider ${status}. Masking as 424.`);
                status = 424;
                message = `Provider Authentication Failed. Please check EVOLUTION_API_KEY in Railway.`;
                details = { providerStatus: error.response.status };
            }
        } 
        // Handle Connection Refused (Provider Down)
        else if (error.code === 'ECONNREFUSED' || error.message.includes('fetch failed')) {
             status = 502; // Bad Gateway
             message = 'Provider Unavailable (Evolution API is likely offline). Check PORT=8080 in Railway.';
        }
        // If it's the wrapped error from provider: Error: Failed to create... {"status":401...}
        else if (message.includes('"status":')) {
            try {
                const innerDetailsSnippet = message.substring(message.indexOf('{'));
                const innerDetails = JSON.parse(innerDetailsSnippet);
                if (innerDetails.status) {
                    status = innerDetails.status;
                    if (status === 401 || status === 403) {
                        status = 424;
                        message = 'Provider Auth Failed (Check API Key)';
                    }
                }
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
router.get('/:unitId/whatsapp/qrcode', async (req, res) => {
    const { unitId: unitParam } = req.params;
    let currentUnitId = null;

    try {
        const { data: unit } = await supabase.from('units').select('id').or(`id.eq.${unitParam},slug.eq.${unitParam}`).single();
        if (!unit) return res.status(404).json({ error: 'Unit not found' });
        currentUnitId = unit.id;

        // Authorization: super_admin can access any unit
        if (req.user.role !== 'super_admin' && req.user.unitId !== currentUnitId) {
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

        if (!result.qrcode) {
            return res.status(424).json({
                error: {
                    code: result.error || 'QR_UNAVAILABLE',
                    message: result.message || 'QR Code could not be generated at this moment. Evolution API might be initializing.',
                    details: result.details || 'Check Evolution logs for "error in validating connection"'
                }
            });
        }

        return res.json({
            qrcode: result.qrcode,
            status: 'connecting'
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
router.get('/:unitId/whatsapp/status', async (req, res) => {
    const { unitId: unitParam } = req.params;
    let currentUnitId = null;

    try {
        const { data: unit } = await supabase.from('units').select('id').or(`id.eq.${unitParam},slug.eq.${unitParam}`).single();
        if (!unit) return res.status(404).json({ error: 'Unit not found' });
        currentUnitId = unit.id;

        // Authorization: super_admin can access any unit
        if (req.user.role !== 'super_admin' && req.user.unitId !== currentUnitId) {
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
            reason: connection.status_reason || null,
            phone: connection.phone_number,
            qrCode: connection.status === 'connected' ? null : connection.qr_code,
            provider: connection.provider,
            connectedAt: connection.connected_at,
            disconnectedAt: connection.disconnected_at,
            qrUpdatedAt: connection.qr_updated_at,
            lastUpdate: connection.updated_at
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
router.delete('/:unitId/whatsapp/disconnect', async (req, res) => {
     const { unitId: unitParam } = req.params;
     let unitId = null;

     try {
        const { data: unit } = await supabase.from('units').select('id').or(`id.eq.${unitParam},slug.eq.${unitParam}`).single();
        if (!unit) return res.status(404).json({ error: 'Unit not found' });
        unitId = unit.id;

        // Authorization: super_admin can access any unit
        if (req.user.role !== 'super_admin' && req.user.unitId !== unitId) {
            return res.status(403).json({ error: 'Unit access denied' });
        }

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
router.post('/:unitId/whatsapp/send', async (req, res) => {
     let currentUnitId = null;
     try {
        const { unitId: unitParam } = req.params;
        const { phone, message } = req.body;
        
        const { data: unit } = await supabase.from('units').select('id').or(`id.eq.${unitParam},slug.eq.${unitParam}`).single();
        if (!unit) return res.status(404).json({ error: 'Unit not found' });
        currentUnitId = unit.id;

        // Authorization: super_admin can access any unit
        if (req.user.role !== 'super_admin' && req.user.unitId !== currentUnitId) {
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


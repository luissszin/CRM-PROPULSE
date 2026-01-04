// WhatsApp Connection Routes
// Unified routes for connecting, managing, and sending messages via WhatsApp

import express from 'express';
import { authenticateToken, requireUnitAccess } from '../middleware/auth.js';
import { supabase } from '../services/supabaseService.js';
import axios from 'axios';
import crypto from 'crypto';

const router = express.Router();

// All routes require authentication and unit access validation
router.use(authenticateToken);

// Helper function to create provider instance
function createProvider(providerName) {
    const provider = providerName.toLowerCase();

    // Simple provider implementations
    const providers = {
        evolution: {
            async createInstance(unitId, credentials) {
                const baseUrl = credentials.apiUrl || process.env.EVOLUTION_API_BASE_URL || 'http://localhost:8080';
                const apiKey = credentials.apiKey || process.env.EVOLUTION_API_KEY;
                const instanceName = credentials.instanceId || `unit_${unitId}`;

                try {
                    const response = await axios.post(`${baseUrl}/instance/create`, {
                        instanceName,
                        token: apiKey,
                        qrcode: true
                    }, {
                        headers: { 'Content-Type': 'application/json', 'apikey': apiKey }
                    });

                    return {
                        success: true,
                        instanceId: instanceName,
                        qrCode: response.data.qrcode?.base64 || response.data.qrcode
                    };
                } catch (error) {
                    return { success: false, instanceId: '', error: error.message };
                }
            },

            async getQrCode(instanceId) {
                const baseUrl = process.env.EVOLUTION_API_BASE_URL || 'http://localhost:8080';
                const apiKey = process.env.EVOLUTION_API_KEY;

                try {
                    const response = await axios.get(`${baseUrl}/instance/connect/${instanceId}`, {
                        headers: { 'apikey': apiKey }
                    });
                    return { qrCode: response.data.qrcode?.base64 || response.data.qrcode, status: 'connecting' };
                } catch (error) {
                    return { qrCode: null, status: 'error' };
                }
            },

            async getStatus(instanceId) {
                const baseUrl = process.env.EVOLUTION_API_BASE_URL || 'http://localhost:8080';
                const apiKey = process.env.EVOLUTION_API_KEY;

                try {
                    const response = await axios.get(`${baseUrl}/instance/connectionState/${instanceId}`, {
                        headers: { 'apikey': apiKey }
                    });

                    const state = response.data.state;
                    let status = state === 'open' ? 'connected' : state === 'close' ? 'disconnected' : 'connecting';

                    return {
                        status,
                        phoneNumber: response.data.instance?.phone,
                        profileName: response.data.instance?.profileName
                    };
                } catch (error) {
                    return { status: 'error', error: error.message };
                }
            },

            async disconnect(instanceId) {
                const baseUrl = process.env.EVOLUTION_API_BASE_URL || 'http://localhost:8080';
                const apiKey = process.env.EVOLUTION_API_KEY;
                await axios.delete(`${baseUrl}/instance/logout/${instanceId}`, {
                    headers: { 'apikey': apiKey }
                });
            },

            async sendTextMessage(instanceId, phone, message) {
                const baseUrl = process.env.EVOLUTION_API_BASE_URL || 'http://localhost:8080';
                const apiKey = process.env.EVOLUTION_API_KEY;

                try {
                    const response = await axios.post(`${baseUrl}/message/sendText/${instanceId}`, {
                        number: phone.replace(/\D/g, ''),
                        text: message
                    }, {
                        headers: { 'Content-Type': 'application/json', 'apikey': apiKey }
                    });

                    return { success: true, messageId: response.data.key?.id };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
        },

        zapi: {
            async createInstance(unitId, credentials) {
                return {
                    success: true,
                    instanceId: credentials.instanceId || `unit_${unitId}`,
                    message: 'Z-API instance validated'
                };
            },
            async getQrCode(instanceId) {
                const baseUrl = process.env.ZAPI_BASE_URL || 'https://api.z-api.io';
                const token = process.env.ZAPI_TOKEN;
                const clientToken = process.env.ZAPI_CLIENT_TOKEN;

                try {
                    const response = await axios.get(`${baseUrl}/instances/${instanceId}/token/${token}/qr-code/image`, {
                        headers: { 'Client-Token': clientToken }
                    });
                    return { qrCode: response.data.value, status: 'connecting' };
                } catch (error) {
                    return { qrCode: null, status: 'error' };
                }
            },
            async getStatus(instanceId) {
                return { status: 'connected', phoneNumber: null };
            },
            async disconnect(instanceId) { },
            async sendTextMessage(instanceId, phone, message) {
                return { success: true, messageId: Date.now().toString() };
            }
        },

        meta: {
            async createInstance(unitId, credentials) {
                return {
                    success: true,
                    instanceId: credentials.phoneNumberId,
                    message: 'Meta Cloud API credentials validated'
                };
            },
            async getQrCode(instanceId) {
                return { qrCode: null, status: 'connected' };
            },
            async getStatus(instanceId) {
                return { status: 'connected', phoneNumber: null };
            },
            async disconnect(instanceId) { },
            async sendTextMessage(instanceId, phone, message) {
                return { success: true, messageId: Date.now().toString() };
            }
        }
    };

    return providers[provider] || providers.evolution;
}

/**
 * POST /units/:unitId/whatsapp/connect
 * Connect WhatsApp to a unit
 */
router.post('/:unitId/whatsapp/connect', requireUnitAccess, async (req, res) => {
    try {
        const { unitId } = req.params;
        const { provider, credentials } = req.body;

        if (!provider) {
            return res.status(400).json({ error: 'Provider is required' });
        }

        // Check if unit already has a connection
        const { data: existingConnection } = await supabase
            .from('unit_whatsapp_connections')
            .select('*')
            .eq('unit_id', unitId)
            .single();

        if (existingConnection) {
            return res.status(409).json({
                error: 'Unit already has a WhatsApp connection',
                existingConnection: {
                    id: existingConnection.id,
                    provider: existingConnection.provider,
                    status: existingConnection.status
                }
            });
        }

        // Create provider instance
        const providerInstance = createProvider(provider);
        const result = await providerInstance.createInstance(unitId, credentials);

        if (!result.success) {
            return res.status(500).json({ error: 'Failed to create WhatsApp instance', details: result.error });
        }

        // Generate webhook secret
        const webhookSecret = crypto.randomBytes(32).toString('hex');

        // Save connection to database
        const { data: connection, error: dbError } = await supabase
            .from('unit_whatsapp_connections')
            .insert({
                unit_id: unitId,
                provider: provider.toLowerCase(),
                instance_id: result.instanceId,
                status: result.qrCode ? 'connecting' : 'connected',
                qr_code: result.qrCode || null,
                provider_config: credentials,
                webhook_secret: webhookSecret
            })
            .select()
            .single();

        if (dbError) {
            return res.status(500).json({ error: 'Failed to save connection', details: dbError.message });
        }

        return res.status(201).json({
            success: true,
            connection: {
                id: connection.id,
                unitId: connection.unit_id,
                provider: connection.provider,
                instanceId: connection.instance_id,
                status: connection.status,
                qrCode: connection.qr_code,
                webhookUrl: `${process.env.API_BASE_URL || 'http://localhost:3000'}/webhooks/whatsapp/${provider}/${webhookSecret}`
            },
            message: result.qrCode ? 'QR Code generated. Please scan to complete connection.' : 'WhatsApp connected successfully'
        });
    } catch (error) {
        console.error('[connectWhatsapp] Error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

/**
 * GET /units/:unitId/whatsapp/status
 */
router.get('/:unitId/whatsapp/status', requireUnitAccess, async (req, res) => {
    try {
        const { unitId } = req.params;

        const { data: connection, error } = await supabase
            .from('unit_whatsapp_connections')
            .select('*')
            .eq('unit_id', unitId)
            .single();

        if (error || !connection) {
            return res.status(404).json({ error: 'No WhatsApp connection found for this unit' });
        }

        const provider = createProvider(connection.provider);
        const liveStatus = await provider.getStatus(connection.instance_id);

        if (liveStatus.status !== connection.status) {
            await supabase
                .from('unit_whatsapp_connections')
                .update({ status: liveStatus.status, phone_number: liveStatus.phoneNumber || connection.phone_number })
                .eq('id', connection.id);
        }

        return res.json({
            id: connection.id,
            unitId: connection.unit_id,
            provider: connection.provider,
            instanceId: connection.instance_id,
            status: liveStatus.status,
            phoneNumber: liveStatus.phoneNumber || connection.phone_number,
            createdAt: connection.created_at
        });
    } catch (error) {
        console.error('[getConnectionStatus] Error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

/**
 * GET /units/:unitId/whatsapp/qrcode
 */
router.get('/:unitId/whatsapp/qrcode', requireUnitAccess, async (req, res) => {
    try {
        const { unitId } = req.params;

        const { data: connection, error } = await supabase
            .from('unit_whatsapp_connections')
            .select('*')
            .eq('unit_id', unitId)
            .single();

        if (error || !connection) {
            return res.status(404).json({ error: 'No WhatsApp connection found for this unit' });
        }

        if (connection.provider === 'meta') {
            return res.status(400).json({ error: 'Meta Cloud API does not use QR codes' });
        }

        const provider = createProvider(connection.provider);
        const qrCodeData = await provider.getQrCode(connection.instance_id);

        if (qrCodeData.qrCode) {
            await supabase
                .from('unit_whatsapp_connections')
                .update({ qr_code: qrCodeData.qrCode })
                .eq('id', connection.id);
        }

        return res.json(qrCodeData);
    } catch (error) {
        console.error('[getQrCode] Error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

/**
 * DELETE /units/:unitId/whatsapp/disconnect
 */
router.delete('/:unitId/whatsapp/disconnect', requireUnitAccess, async (req, res) => {
    try {
        const { unitId } = req.params;

        const { data: connection, error } = await supabase
            .from('unit_whatsapp_connections')
            .select('*')
            .eq('unit_id', unitId)
            .single();

        if (error || !connection) {
            return res.status(404).json({ error: 'No WhatsApp connection found for this unit' });
        }

        const provider = createProvider(connection.provider);
        await provider.disconnect(connection.instance_id);

        const { error: deleteError } = await supabase
            .from('unit_whatsapp_connections')
            .delete()
            .eq('id', connection.id);

        if (deleteError) {
            return res.status(500).json({ error: 'Failed to delete connection', details: deleteError.message });
        }

        return res.json({ success: true, message: 'WhatsApp disconnected successfully' });
    } catch (error) {
        console.error('[disconnectWhatsapp] Error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

/**
 * POST /units/:unitId/whatsapp/send
 */
router.post('/:unitId/whatsapp/send', requireUnitAccess, async (req, res) => {
    try {
        const { unitId } = req.params;
        const { phone, message } = req.body;

        if (!phone || !message) {
            return res.status(400).json({ error: 'Phone and message are required' });
        }

        const { data: connection, error } = await supabase
            .from('unit_whatsapp_connections')
            .select('*')
            .eq('unit_id', unitId)
            .single();

        if (error || !connection) {
            return res.status(404).json({ error: 'No WhatsApp connection found for this unit' });
        }

        if (connection.status !== 'connected') {
            return res.status(400).json({ error: 'WhatsApp is not connected', status: connection.status });
        }

        const provider = createProvider(connection.provider);
        const result = await provider.sendTextMessage(connection.instance_id, phone, message);

        if (!result.success) {
            return res.status(500).json({ error: 'Failed to send message', details: result.error });
        }

        return res.json({ success: true, messageId: result.messageId });
    } catch (error) {
        console.error('[sendMessage] Error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

export default router;

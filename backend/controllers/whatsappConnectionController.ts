import { Request, Response } from 'express';
import { supabase } from '../services/supabaseService.js';
import { WhatsappProviderFactory } from '../providers/WhatsappProviderFactory';
import { ProviderCredentials } from '../providers/interfaces/IWhatsappProvider';

/**
 * Unified WhatsApp Connection Controller
 * Handles connection, disconnection, and status for all providers
 */

/**
 * POST /units/:unitId/whatsapp/connect
 * Connect WhatsApp to a unit
 */
export async function connectWhatsapp(req: Request, res: Response) {
    try {
        const { unitId } = req.params;
        const { provider, credentials } = req.body as {
            provider: string;
            credentials: ProviderCredentials;
        };

        // Validate input
        if (!provider) {
            return res.status(400).json({ error: 'Provider is required' });
        }

        if (!WhatsappProviderFactory.isProviderSupported(provider)) {
            return res.status(400).json({
                error: `Unsupported provider: ${provider}`,
                supportedProviders: WhatsappProviderFactory.getSupportedProviders(),
            });
        }

        // Check if unit already has a WhatsApp connection
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
                    status: existingConnection.status,
                    phoneNumber: existingConnection.phone_number,
                },
            });
        }

        // Validate unit exists
        const { data: unit, error: unitError } = await supabase
            .from('units')
            .select('id, name')
            .eq('id', unitId)
            .single();

        if (unitError || !unit) {
            return res.status(404).json({ error: 'Unit not found' });
        }

        // Create provider instance
        const providerInstance = WhatsappProviderFactory.createProvider(provider);

        // Create WhatsApp instance
        const result = await providerInstance.createInstance(unitId, credentials);

        if (!result.success) {
            return res.status(500).json({
                error: 'Failed to create WhatsApp instance',
                details: result.error,
            });
        }

        // Generate webhook secret
        const webhookSecret = require('crypto').randomBytes(32).toString('hex');

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
                webhook_secret: webhookSecret,
                access_token: credentials.accessToken || null,
                business_id: credentials.businessAccountId || null,
            })
            .select()
            .single();

        if (dbError) {
            console.error('[connectWhatsapp] Database error:', dbError);
            return res.status(500).json({ error: 'Failed to save connection', details: dbError.message });
        }

        // Return response
        return res.status(201).json({
            success: true,
            connection: {
                id: connection.id,
                unitId: connection.unit_id,
                provider: connection.provider,
                instanceId: connection.instance_id,
                status: connection.status,
                qrCode: connection.qr_code,
                webhookUrl: `${process.env.API_BASE_URL || 'http://localhost:3000'}/webhooks/whatsapp/${provider}/${webhookSecret}`,
            },
            message: result.qrCode
                ? 'QR Code generated. Please scan to complete connection.'
                : 'WhatsApp connected successfully',
        });
    } catch (error: any) {
        console.error('[connectWhatsapp] Error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}

/**
 * GET /units/:unitId/whatsapp/status
 * Get WhatsApp connection status
 */
export async function getConnectionStatus(req: Request, res: Response) {
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

        // Get live status from provider
        const provider = WhatsappProviderFactory.createProvider(connection.provider);
        const liveStatus = await provider.getStatus(connection.instance_id);

        // Update database if status changed
        if (liveStatus.status !== connection.status) {
            await supabase
                .from('unit_whatsapp_connections')
                .update({
                    status: liveStatus.status,
                    phone_number: liveStatus.phoneNumber || connection.phone_number,
                })
                .eq('id', connection.id);
        }

        return res.json({
            id: connection.id,
            unitId: connection.unit_id,
            provider: connection.provider,
            instanceId: connection.instance_id,
            status: liveStatus.status,
            phoneNumber: liveStatus.phoneNumber || connection.phone_number,
            profileName: liveStatus.profileName,
            createdAt: connection.created_at,
            updatedAt: connection.updated_at,
        });
    } catch (error: any) {
        console.error('[getConnectionStatus] Error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}

/**
 * GET /units/:unitId/whatsapp/qrcode
 * Get QR Code for connection (Evolution/Z-API only)
 */
export async function getQrCode(req: Request, res: Response) {
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

        // Get fresh QR code from provider
        const provider = WhatsappProviderFactory.createProvider(connection.provider);
        const qrCodeData = await provider.getQrCode(connection.instance_id);

        // Update database with new QR code
        if (qrCodeData.qrCode) {
            await supabase
                .from('unit_whatsapp_connections')
                .update({ qr_code: qrCodeData.qrCode })
                .eq('id', connection.id);
        }

        return res.json({
            qrCode: qrCodeData.qrCode,
            status: qrCodeData.status,
            expiresAt: qrCodeData.expiresAt,
        });
    } catch (error: any) {
        console.error('[getQrCode] Error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}

/**
 * DELETE /units/:unitId/whatsapp/disconnect
 * Disconnect WhatsApp from unit
 */
export async function disconnectWhatsapp(req: Request, res: Response) {
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

        // Disconnect from provider
        const provider = WhatsappProviderFactory.createProvider(connection.provider);
        await provider.disconnect(connection.instance_id);

        // Delete connection from database
        const { error: deleteError } = await supabase
            .from('unit_whatsapp_connections')
            .delete()
            .eq('id', connection.id);

        if (deleteError) {
            console.error('[disconnectWhatsapp] Database error:', deleteError);
            return res.status(500).json({ error: 'Failed to delete connection', details: deleteError.message });
        }

        return res.json({
            success: true,
            message: 'WhatsApp disconnected successfully',
        });
    } catch (error: any) {
        console.error('[disconnectWhatsapp] Error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}

/**
 * POST /units/:unitId/whatsapp/send
 * Send a message via WhatsApp
 */
export async function sendMessage(req: Request, res: Response) {
    try {
        const { unitId } = req.params;
        const { phone, message, mediaUrl, mediaType } = req.body;

        if (!phone || (!message && !mediaUrl)) {
            return res.status(400).json({ error: 'Phone and message/mediaUrl are required' });
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

        const provider = WhatsappProviderFactory.createProvider(connection.provider);

        let result;
        if (mediaUrl) {
            result = await provider.sendMediaMessage(
                connection.instance_id,
                phone,
                mediaUrl,
                message,
                mediaType
            );
        } else {
            result = await provider.sendTextMessage(connection.instance_id, phone, message);
        }

        if (!result.success) {
            return res.status(500).json({ error: 'Failed to send message', details: result.error });
        }

        return res.json({
            success: true,
            messageId: result.messageId,
            timestamp: result.timestamp,
        });
    } catch (error: any) {
        console.error('[sendMessage] Error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}

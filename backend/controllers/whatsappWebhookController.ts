import { Request, Response } from 'express';
import { supabase } from '../services/supabaseService.js';
import { WhatsappProviderFactory } from '../providers/WhatsappProviderFactory';

/**
 * Unified WhatsApp Webhook Controller
 * Handles webhooks from all providers (Z-API, Evolution, Meta)
 */

/**
 * POST /webhooks/whatsapp/:provider/:secret
 * Receive webhooks from WhatsApp providers
 */
export async function handleWebhook(req: Request, res: Response) {
    try {
        const { provider, secret } = req.params;
        const payload = req.body;

        // Validate provider
        if (!WhatsappProviderFactory.isProviderSupported(provider)) {
            console.error(`[Webhook] Unsupported provider: ${provider}`);
            return res.status(400).json({ error: 'Unsupported provider' });
        }

        // Meta webhook verification (GET request)
        if (req.method === 'GET' && provider === 'meta') {
            const mode = req.query['hub.mode'];
            const token = req.query['hub.verify_token'];
            const challenge = req.query['hub.challenge'];

            if (mode === 'subscribe' && token === secret) {
                console.log('[Webhook] Meta webhook verified');
                return res.status(200).send(challenge);
            } else {
                return res.status(403).json({ error: 'Verification failed' });
            }
        }

        // Find connection by webhook secret
        const { data: connection, error: connectionError } = await supabase
            .from('unit_whatsapp_connections')
            .select('*')
            .eq('webhook_secret', secret)
            .eq('provider', provider.toLowerCase())
            .single();

        if (connectionError || !connection) {
            console.error('[Webhook] Connection not found for secret:', secret);
            return res.status(404).json({ error: 'Connection not found' });
        }

        // Create provider instance
        const providerInstance = WhatsappProviderFactory.createProvider(provider);

        // Validate webhook signature (for Meta)
        if (provider === 'meta') {
            const signature = req.headers['x-hub-signature-256'] as string;
            if (signature && !providerInstance.validateWebhook(payload, signature, secret)) {
                console.error('[Webhook] Invalid signature for Meta webhook');
                return res.status(403).json({ error: 'Invalid signature' });
            }
        }

        // Handle webhook
        const result = await providerInstance.handleWebhook(payload, secret);
        result.unitId = connection.unit_id;

        // Update connection status if needed
        if (result.statusUpdate) {
            await supabase
                .from('unit_whatsapp_connections')
                .update({
                    status: result.statusUpdate.status,
                    phone_number: result.statusUpdate.phoneNumber || connection.phone_number,
                    qr_code: result.statusUpdate.qrCode || connection.qr_code,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', connection.id);

            console.log(`[Webhook] Updated connection status to: ${result.statusUpdate.status}`);
        }

        // Persist message if needed
        if (result.shouldPersist && result.messageData) {
            await persistMessage(connection, result);
        }

        // Emit real-time event via Socket.IO (if available)
        try {
            const io = (global as any).io;
            if (io) {
                io.to(`unit:${connection.unit_id}`).emit('whatsapp:event', {
                    type: result.event.type,
                    instanceId: result.instanceId,
                    data: result.event.data,
                });
            }
        } catch (socketError) {
            console.error('[Webhook] Socket.IO error:', socketError);
        }

        return res.status(200).json({ success: true, received: true });
    } catch (error: any) {
        console.error('[Webhook] Error processing webhook:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}

/**
 * Persist incoming message to database
 */
async function persistMessage(connection: any, webhookResult: any) {
    try {
        const { messageData } = webhookResult;

        // Find or create contact
        const phone = messageData.externalId?.split('@')[0] || 'unknown';

        let { data: contact } = await supabase
            .from('contacts')
            .select('*')
            .eq('phone', phone)
            .single();

        if (!contact) {
            const { data: newContact } = await supabase
                .from('contacts')
                .insert({ phone })
                .select()
                .single();
            contact = newContact;
        }

        if (!contact) {
            console.error('[persistMessage] Failed to create/find contact');
            return;
        }

        // Find or create conversation
        let { data: conversation } = await supabase
            .from('conversations')
            .select('*')
            .eq('unit_id', connection.unit_id)
            .eq('contact_id', contact.id)
            .eq('instance_id', connection.instance_id)
            .single();

        if (!conversation) {
            const { data: newConversation } = await supabase
                .from('conversations')
                .insert({
                    unit_id: connection.unit_id,
                    contact_id: contact.id,
                    instance_id: connection.instance_id,
                    external_id: phone,
                    channel: 'whatsapp',
                    status: 'open',
                })
                .select()
                .single();
            conversation = newConversation;
        }

        if (!conversation) {
            console.error('[persistMessage] Failed to create/find conversation');
            return;
        }

        // Save message
        const { error: messageError } = await supabase.from('messages').insert({
            conversation_id: conversation.id,
            sender: messageData.sender,
            content: messageData.content || '',
            status: 'received',
            external_id: messageData.externalId,
            media_url: messageData.mediaUrl,
            media_type: messageData.mediaType,
        });

        if (messageError) {
            console.error('[persistMessage] Error saving message:', messageError);
        } else {
            console.log('[persistMessage] Message saved successfully');
        }
    } catch (error) {
        console.error('[persistMessage] Error:', error);
    }
}

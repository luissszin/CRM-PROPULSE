// WhatsApp Webhook Handler - Receives messages from Evolution API
import express from 'express';
import { supabase } from '../services/supabaseService.js';
import { emitToUnit } from '../services/socketService.js';
import { triggerAutomation } from '../services/automationService.js';

const router = express.Router();

// POST /webhooks/whatsapp/:instanceName - Receive webhook from Evolution API
router.post('/whatsapp/:instanceName', async (req, res) => {
    try {
        const { instanceName } = req.params;
        const webhookData = req.body;

        console.log('[Webhook] Received from', instanceName, ':', JSON.stringify(webhookData, null, 2));

        // Get instance from database
        const { data: instance, error: instanceError } = await supabase
            .from('whatsapp_instances')
            .select('*')
            .eq('instanceName', instanceName)
            .single();

        if (instanceError || !instance) {
            console.error('[Webhook] Instance not found:', instanceName);
            return res.status(404).json({ error: 'Instance not found' });
        }

        // Handle different event types
        const { event, data } = webhookData;

        switch (event) {
            case 'messages.upsert':
                await handleNewMessage(instance, data);
                break;

            case 'connection.update':
                await handleConnectionUpdate(instance, data);
                break;

            case 'messages.update':
                await handleMessageUpdate(instance, data);
                break;

            default:
                console.log('[Webhook] Unknown event:', event);
        }

        return res.json({ success: true });
    } catch (error) {
        console.error('[Webhook] Error:', error);
        return res.status(500).json({ error: error.message });
    }
});

// POST /webhooks/zapi/:instanceId - Z-API Webhook
router.post('/zapi/:instanceId', async (req, res) => {
    try {
        const { instanceId } = req.params;
        const data = req.body;

        console.log('[Z-API Webhook] Received for instance:', instanceId);

        // Get instance from DB
        const { data: instance, error } = await supabase
            .from('whatsapp_instances')
            .select('*')
            //.eq('provider_config->>instanceId', instanceId) // Ideally check inside config
            // OR we can rely on the URL param matching our DB ID or the Z-API instance ID.
            // Let's assume the URL param IS the database ID for security/uniqueness or the Z-API ID.
            // User requested: "Identificar automaticamente a unidade pelo instance_id"
            // Let's try to match by provider_config->instanceId first.
            .eq('id', instanceId) // Simplest: use our internal ID in the webhook URL
            .single();

        // Fallback: search by Z-API instance ID inside config
        let targetInstance = instance;
        if (!targetInstance) {
            const { data: instances } = await supabase
                .from('whatsapp_instances')
                .select('*')
                .eq('provider', 'zapi');
            targetInstance = instances?.find(i => i.provider_config?.instanceId === instanceId);
        }

        if (!targetInstance) {
            console.error('[Z-API Webhook] Instance not found:', instanceId);
            return res.status(404).json({ error: 'Instance not found' });
        }

        // Normalize Z-API payload to match Evolution/Internal format
        // Z-API structure: { phone, messageId, message: { text: "..." }, ... }
        // We need to pass it to handleNewMessage in a compatible format OR call logic directly.
        // Let's call the logic directly or adapter.

        // Check if it's a message
        if (data.message) {
            // Z-API doesn't usually send "fromMe" in the same way, need to check. 
            // Assuming incoming messages.
            if (data.fromMe) return res.json({ ignored: true });

            const normalizedData = {
                messages: [{
                    key: {
                        remoteJid: data.phone + '@s.whatsapp.net',
                        fromMe: false, // incoming
                        id: data.messageId
                    },
                    pushName: data.name || data.phone, // Z-API might send name
                    message: {
                        conversation: data.message.text || '',
                        // Add media handling if needed
                        imageMessage: data.image ? { url: data.image, caption: data.caption } : null
                    }
                }]
            };

            await handleNewMessage(targetInstance, normalizedData);
        }

        // Handle Status / Connection
        if (data.status) {
            // connection status updates
        }

        return res.json({ success: true });

    } catch (error) {
        console.error('[Z-API Webhook] Error:', error);
        return res.status(500).json({ error: error.message });
    }
});

// GET /webhooks/meta - Meta Webhook Verification (Challenge)
router.get('/meta', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Usually verify against a global or unit-specific token
    // For now, allow any if token matches what we set in Meta Dashboard
    const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'propulse_crm';

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('[Meta Webhook] Verified');
            return res.status(200).send(challenge);
        } else {
            return res.status(403).send('Forbidden');
        }
    }
});

// POST /webhooks/meta - Meta Webhook Handling (WhatsApp, Instagram, Messenger)
router.post('/meta', async (req, res) => {
    try {
        const body = req.body;
        // console.log('[Meta Webhook] Received:', JSON.stringify(body, null, 2));

        const objectType = body.object; // whatsapp_business_account, instagram, or page

        if (objectType === 'whatsapp_business_account') {
            const entry = body.entry?.[0];
            const changes = entry?.changes?.[0];
            const value = changes?.value;
            const metadata = value?.metadata;
            const messages = value?.messages;

            // Handle Messages
            if (messages && messages.length > 0) {
                const phoneNumberId = metadata?.phone_number_id;

                const { data: instances } = await supabase.from('whatsapp_instances').select('*').eq('provider', 'meta');
                const instance = instances?.find(ins => ins.provider_config?.phoneNumberId === phoneNumberId);

                if (!instance) {
                    console.error('[Meta Webhook] No instance found for phone_number_id:', phoneNumberId);
                    return res.status(404).json({ error: 'Instance not found' });
                }

                await handleMetaNewMessage(instance, messages[0], value.contacts?.[0], 'whatsapp');
            }
        }
        else if (objectType === 'instagram' || objectType === 'page') {
            const entry = body.entry?.[0];
            const messaging = entry?.messaging?.[0];

            if (messaging && messaging.message) {
                const recipientId = messaging.recipient.id; // Our Page ID or IG Account ID
                const getChannel = () => {
                    if (objectType === 'instagram') return 'instagram';
                    if (objectType === 'page') return 'messenger'; // or 'web' if we map it
                    return 'telegram'; // fallback
                };
                const channel = getChannel();

                // Find instance by recipientId in config
                const { data: instances } = await supabase.from('whatsapp_instances').select('*').eq('provider', 'meta');
                const instance = instances?.find(ins =>
                    ins.provider_config?.pageId === recipientId ||
                    ins.provider_config?.instagramId === recipientId ||
                    ins.provider_config?.phoneNumberId === recipientId // Some configs use this
                );

                if (!instance) {
                    console.error('[Meta Webhook] No instance found for recipientId:', recipientId);
                    return res.status(404).json({ error: 'Instance not found' });
                }

                await handleMetaNewMessage(instance, messaging.message, { from: messaging.sender.id, name: 'User' }, channel);
            }
        }

        return res.json({ success: true });
    } catch (error) {
        console.error('[Meta Webhook] Error:', error);
        return res.json({ success: false });
    }
});

// Handle incoming messages
async function handleNewMessage(instance, data) {
    try {
        const message = data.messages?.[0];
        if (!message) return;

        const { key, message: messageContent, pushName } = message;
        const phone = key.remoteJid.replace('@s.whatsapp.net', '');
        const isFromMe = key.fromMe;

        // Skip messages sent by us
        if (isFromMe) return;

        console.log('[Webhook] New message from', phone, ':', messageContent?.conversation || messageContent?.extendedTextMessage?.text);

        // Find or create contact
        let contact = await supabase
            .from('contacts')
            .select('*')
            .eq('phone', phone)
            .single();

        if (!contact.data) {
            const { data: newContact } = await supabase
                .from('contacts')
                .insert({ phone, name: pushName || phone })
                .select()
                .single();
            contact = { data: newContact };
        }

        // Find or create conversation
        let conversation = await supabase
            .from('conversations')
            .select('*')
            .eq('instance_id', instance.id)
            .eq('external_id', phone)
            .single();

        if (!conversation.data) {
            const { data: newConv } = await supabase
                .from('conversations')
                .insert({
                    instance_id: instance.id,
                    external_id: phone,
                    contact_id: contact.data.id,
                    status: 'open',
                })
                .select()
                .single();
            conversation = { data: newConv };
        }

        // Extract message content
        const textContent = messageContent?.conversation ||
            messageContent?.extendedTextMessage?.text ||
            messageContent?.imageMessage?.caption ||
            '';

        const mediaUrl = messageContent?.imageMessage?.url ||
            messageContent?.videoMessage?.url ||
            messageContent?.audioMessage?.url ||
            messageContent?.documentMessage?.url ||
            null;

        const mediaType = messageContent?.imageMessage ? 'image' :
            messageContent?.videoMessage ? 'video' :
                messageContent?.audioMessage ? 'audio' :
                    messageContent?.documentMessage ? 'document' :
                        null;

        // Save message to database
        const { data: savedMessage } = await supabase.from('messages').insert({
            conversation_id: conversation.data.id,
            sender: 'customer',
            content: textContent,
            external_id: key.id,
            media_url: mediaUrl,
            media_type: mediaType,
            status: 'delivered',
        }).select().single();

        // Check if lead exists, create if needed
        let lead = await supabase
            .from('leads')
            .select('*')
            .eq('phone', phone)
            .eq('unit_id', instance.unit_id)
            .single();

        if (!lead.data) {
            console.log('[Webhook] Creating automatic lead for', phone);
            const { data: newLead } = await supabase
                .from('leads')
                .insert({
                    unit_id: instance.unit_id,
                    name: pushName || phone,
                    phone: phone,
                    status: 'new',
                    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${phone}`,
                })
                .select()
                .single();
            lead = { data: newLead };

            // Link lead to conversation
            await supabase
                .from('conversations')
                .update({ lead_id: lead.data.id })
                .eq('id', conversation.data.id);

            // Emit lead creation
            emitToUnit(instance.unit_id, 'new_lead', lead.data);
        }

        // Emit socket.io event for real-time update
        emitToUnit(instance.unit_id, 'new_message', {
            conversation: {
                ...conversation.data,
                lead_id: lead.data.id,
                lastMessage: textContent,
                updatedAt: new Date()
            },
            message: savedMessage
        });

        // Trigger Automation
        triggerAutomation(instance.unit_id, 'new_message', {
            message: savedMessage,
            lead: lead.data,
            phone: phone
        }).catch(console.error);

    } catch (error) {
        console.error('[Webhook] Error handling message:', error);
    }
}

// Handle connection status updates
async function handleConnectionUpdate(instance, data) {
    try {
        const { connection, lastDisconnect, qr } = data;

        console.log('[Webhook] Connection update:', connection, 'QR:', !!qr);

        let status = 'disconnected';
        let qrcode = null;

        if (qr) {
            status = 'connecting';
            qrcode = qr;
        } else if (connection === 'open') {
            status = 'connected';
        }

        await supabase
            .from('whatsapp_instances')
            .update({ status, qrcode })
            .eq('id', instance.id);

        // Emit socket.io event
        emitToUnit(instance.unit_id, 'connection_update', {
            instanceId: instance.id,
            status,
            qrcode
        });

    } catch (error) {
        console.error('[Webhook] Error handling connection:', error);
    }
}

// Handle message status updates (sent, delivered, read)
async function handleMessageUpdate(instance, data) {
    try {
        const updates = data;
        for (const update of updates) {
            const messageId = update.key.id;
            const status = update.update?.status; // sent, delivered, read

            if (status) {
                await supabase
                    .from('messages')
                    .update({ status })
                    .eq('external_id', messageId);
            }
        }
    } catch (error) {
        console.error('[Webhook] Error updating message status:', error);
    }
}

// Handle Meta incoming messages (WhatsApp, Instagram, Messenger)
async function handleMetaNewMessage(instance, metaMessage, metaContact, channel = 'whatsapp') {
    try {
        const phone = metaMessage.from || metaContact?.from; // messaging sender id for IG/Messenger
        const pushName = metaContact?.profile?.name || metaContact?.name || phone;
        const messageId = metaMessage.id || metaMessage.mid;

        let type = metaMessage.type;
        if (!type && metaMessage.text) type = 'text';
        if (!type && metaMessage.attachments) type = 'media';

        console.log(`[Meta Webhook] New message on ${channel} from`, phone, ':', type);

        // Find or create contact
        let contact = await supabase.from('contacts').select('*').eq('phone', phone).single();
        if (!contact.data) {
            const { data: newContact } = await supabase.from('contacts').insert({ phone, name: pushName }).select().single();
            contact = { data: newContact };
        }

        // Find or create conversation with explicit channel
        let conversation = await supabase.from('conversations')
            .select('*')
            .eq('instance_id', instance.id)
            .eq('external_id', phone)
            .eq('channel', channel)
            .single();

        if (!conversation.data) {
            const { data: newConv } = await supabase.from('conversations').insert({
                instance_id: instance.id,
                unit_id: instance.unit_id,
                external_id: phone,
                contact_id: contact.data.id,
                status: 'open',
                channel: channel
            }).select().single();
            conversation = { data: newConv };
        }

        let content = '';
        let mediaUrl = null;
        let mediaType = null;

        if (type === 'text') {
            content = metaMessage.text?.body || metaMessage.text;
        } else if (type === 'image' || type === 'media') {
            content = metaMessage.image?.caption || metaMessage.text || '';
            const attachment = metaMessage.attachments?.[0];
            mediaUrl = metaMessage.image?.id ? 'META_MEDIA_ID:' + metaMessage.image?.id : (attachment?.payload?.url || null);
            mediaType = metaMessage.image ? 'image' : (attachment?.type || 'media');
        }

        // Save message
        const { data: savedMessage } = await supabase.from('messages').insert({
            conversation_id: conversation.data.id,
            sender: 'customer',
            content: content,
            external_id: messageId,
            media_url: mediaUrl,
            media_type: mediaType,
            status: 'delivered',
        }).select().single();

        // Lead logic
        let lead = await supabase.from('leads').select('*').eq('phone', phone).eq('unit_id', instance.unit_id).single();
        if (!lead.data) {
            const { data: newLead } = await supabase.from('leads').insert({
                unit_id: instance.unit_id,
                name: pushName,
                phone: phone,
                status: 'new',
                source: channel,
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${phone}`,
            }).select().single();
            lead = { data: newLead };
            await supabase.from('conversations').update({ lead_id: lead.data.id }).eq('id', conversation.data.id);
            emitToUnit(instance.unit_id, 'new_lead', lead.data);
        }

        // Emit Socket
        emitToUnit(instance.unit_id, 'new_message', {
            conversation: {
                ...conversation.data,
                lead_id: lead.data.id,
                lastMessage: content,
                updatedAt: new Date(),
                channel: channel
            },
            message: savedMessage
        });

        // Trigger Automation
        triggerAutomation(instance.unit_id, 'new_message', {
            message: savedMessage,
            lead: lead.data,
            phone: phone,
            channel: channel
        }).catch(console.error);

    } catch (error) {
        console.error('[Meta Webhook] Error handling message:', error);
    }
}

export default router;

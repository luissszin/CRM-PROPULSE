import { supabase } from '../supabaseService.js';
import { emitToUnit } from '../socketService.js';
import { automationEngine } from '../automation/engine.js';
import normalizePhone from '../../utils/phone.js';
import { log } from '../../utils/logger.js';

/**
 * Service to handle incoming messages from different WhatsApp providers
 * and persist them to the database, emit sockets, and trigger automations.
 */
class MessageHandlerService {
    
    async handleIncoming(unitId, provider, rawPayload) {
        try {
            const normalized = this.normalize(provider, rawPayload);
            if (!normalized || normalized.fromMe) return;

            const { phone, senderName, content, messageId, mediaUrl, mediaType, timestamp } = normalized;
            const cleanPhone = normalizePhone(phone);

            log.info(`[MessageHandler] New message from ${cleanPhone} (Unit: ${unitId}, Provider: ${provider})`);

            // 1. Find or Create Contact
            let { data: contact } = await supabase
                .from('contacts')
                .select('*')
                .eq('phone', cleanPhone)
                .single();

            if (!contact) {
                const { data: newContact } = await supabase
                    .from('contacts')
                    .insert({ 
                        phone: cleanPhone, 
                        name: senderName || cleanPhone
                    })
                    .select()
                    .single();
                contact = newContact;
            }

            // 2. Find or Create Conversation
            let { data: conversation } = await supabase
                .from('conversations')
                .select('*')
                .eq('unit_id', unitId)
                .eq('contact_id', contact.id)
                .eq('status', 'open')
                .single();

            if (!conversation) {
                const { data: newConv } = await supabase
                    .from('conversations')
                    .insert({
                        unit_id: unitId,
                        contact_id: contact.id,
                        status: 'open',
                        channel: 'whatsapp'
                    })
                    .select()
                    .single();
                conversation = newConv;
            } else {
                // Update conversation updated_at
                await supabase
                    .from('conversations')
                    .update({ updated_at: new Date() })
                    .eq('id', conversation.id);
            }


            // 3. Save Message
            const { data: savedMessage, error: msgError } = await supabase
                .from('messages')
                .insert({
                    conversation_id: conversation.id,
                    sender: 'customer',
                    content: content,
                    external_id: messageId,
                    media_url: mediaUrl,
                    media_type: mediaType,
                    status: 'delivered',
                    created_at: timestamp ? new Date(timestamp * 1000) : new Date()
                })
                .select()
                .single();

            if (msgError) throw msgError;

            // 4. Handle Lead Logic (Ensure lead exists for this contact in this unit)
            let { data: lead } = await supabase
                .from('leads')
                .select('*')
                .eq('contact_id', contact.id)
                .eq('unit_id', unitId)
                .single();

            if (!lead) {
                const { data: newLead } = await supabase
                    .from('leads')
                    .insert({
                        unit_id: unitId,
                        contact_id: contact.id,
                        name: contact.name,
                        phone: contact.phone,
                        status: 'new'
                    })
                    .select()
                    .single();
                lead = newLead;
                
                // Link lead to conversation if not linked
                await supabase.from('conversations').update({ lead_id: lead.id }).eq('id', conversation.id);
                emitToUnit(unitId, 'new_lead', lead);
            }

            // 5. Emit Socket Event
            emitToUnit(unitId, 'new_message', {
                conversation: {
                    ...conversation,
                    lead_id: lead.id,
                    lastMessage: content,
                    updatedAt: new Date(),
                    contact: contact
                },
                message: savedMessage
            });

            // 6. Trigger Automation
            automationEngine.trigger(unitId, 'message_received', {
                message: savedMessage,
                lead: lead,
                contact: contact,
                phone: cleanPhone
            });

            return { success: true, messageId: savedMessage.id };

        } catch (error) {
            log.error('[MessageHandler] Error:', error);
            throw error;
        }
    }

    /**
     * Handle connection/instance status updates from webhooks
     */
    async handleStatusUpdate(unitId, provider, payload) {
        try {
            let status = null;
            let phone = null;

            if (provider === 'evolution') {
                const { connection, qr } = payload.data || {};
                if (qr) status = 'connecting';
                else if (connection === 'open') status = 'connected';
                else if (connection === 'close' || connection === 'refused') status = 'disconnected';
            }

            if (provider === 'zapi') {
                if (payload.connected === true) status = 'connected';
                if (payload.connected === false) status = 'disconnected';
            }

            if (status) {
                await supabase
                    .from('unit_whatsapp_connections')
                    .update({ status, updated_at: new Date() })
                    .eq('unit_id', unitId);
                
                emitToUnit(unitId, 'whatsapp_status', { status });
            }
        } catch (error) {
            log.error('[MessageHandler] Status Update Error:', error);
        }
    }

    /**
     * Handle connection/instance status updates from webhooks
     */
    async handleStatusUpdate(unitId, provider, payload) {
        try {
            let status = null;

            if (provider === 'evolution') {
                const event = payload.event;
                if (event === 'connection.update') {
                    const { connection, qr } = payload.data || {};
                    if (qr) status = 'connecting';
                    else if (connection === 'open') status = 'connected';
                    else if (connection === 'close' || connection === 'refused') status = 'disconnected';
                }
            }

            if (provider === 'zapi') {
                // Z-API status payload varies
                if (payload.connected === true) status = 'connected';
                else if (payload.connected === false) status = 'disconnected';
            }

            if (status) {
                log.info(`[MessageHandler] Updating status for unit ${unitId} to ${status}`);
                await supabase
                    .from('unit_whatsapp_connections')
                    .update({ status, updated_at: new Date() })
                    .eq('unit_id', unitId);
                
                emitToUnit(unitId, 'whatsapp_status', { status });
            }
        } catch (error) {
            log.error('[MessageHandler] Status Update Error:', error);
        }
    }

    /**
     * Normalize different provider payloads into a standard format
     */
    normalize(provider, payload) {
        if (provider === 'evolution') {
            const msg = payload.data?.messages?.[0];
            if (!msg) return null;
            return {
                phone: msg.key.remoteJid.split('@')[0],
                senderName: msg.pushName,
                content: msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || '',
                messageId: msg.key.id,
                fromMe: msg.key.fromMe,
                mediaUrl: msg.message?.imageMessage?.url || null,
                mediaType: msg.message?.imageMessage ? 'image' : null,
                timestamp: msg.messageTimestamp
            };
        }

        if (provider === 'meta') {
            const entry = payload.entry?.[0];
            const change = entry?.changes?.[0]?.value;
            const msg = change?.messages?.[0];
            if (!msg) return null;
            return {
                phone: msg.from,
                senderName: change?.contacts?.[0]?.profile?.name,
                content: msg.text?.body || msg.image?.caption || '',
                messageId: msg.id,
                fromMe: false, // Meta webhooks usually only for incoming
                mediaUrl: msg.image?.id ? `META_ID:${msg.image.id}` : null,
                mediaType: msg.type === 'image' ? 'image' : null,
                timestamp: msg.timestamp
            };
        }

        if (provider === 'zapi') {
            if (payload.fromMe) return { fromMe: true };
            return {
                phone: payload.phone,
                senderName: payload.name,
                content: payload.text?.message || payload.message?.text || '',
                messageId: payload.messageId,
                fromMe: false,
                mediaUrl: payload.image || payload.video || null,
                mediaType: payload.image ? 'image' : (payload.video ? 'video' : null),
                timestamp: Math.floor(Date.now() / 1000)
            };
        }

        return null;
    }
}

export const messageHandlerService = new MessageHandlerService();

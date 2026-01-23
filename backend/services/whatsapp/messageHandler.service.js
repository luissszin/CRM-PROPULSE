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
    
    async handleIncoming(unitId, provider, rawPayload, connectionId = null) {
        try {
            const normalized = this.normalize(provider, rawPayload);
            if (!normalized || normalized.fromMe) return;

            const { phone, senderName, content, messageId, mediaUrl, mediaType, timestamp } = normalized;
            const cleanPhone = normalizePhone(phone);
            
            // 0. Idempotency Check (Dedupe)
            // If message with same provider + external_id exists, skip
            if (messageId) {
                const { data: existing } = await supabase
                    .from('messages')
                    .select('id, status')
                    .eq('external_id', messageId)
                    .eq('provider', provider)
                    .single();
                
                if (existing) {
                    log.info(`[MessageHandler] Duplicate message deduplicated: ${messageId} (${provider})`);
                    return { success: true, dedup: true, messageId: existing.id };
                }
            }

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
                        instance_id: connectionId,
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

            if (!conversation) {
                 console.error('[MessageHandler] Failed to create conversation!', { unitId, contact, conversation });
            }

            // 3. Save Message
            const { data: savedMessage, error: msgError } = await supabase
                .from('messages')
                .insert({
                    conversation_id: conversation.id,
                    sender: 'customer',
                    content: content,
                    external_id: messageId,
                    provider: provider, // Track provider for uniqueness
                    media_url: mediaUrl,
                    media_type: mediaType,
                    status: 'received', // Initial status
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
     * Tracks: connection state, QR codes, timestamps, reasons
     */
    async handleStatusUpdate(unitId, provider, payload) {
        try {
            let status = null;
            let statusReason = null;
            let qrCode = null;
            const updatePayload = { updated_at: new Date() };

            if (provider === 'evolution') {
                const event = payload.event;
                
                // QR Code Update
                if (event === 'qrcode.updated' || event === 'qr.updated') {
                    const qr = payload.data?.qrcode || payload.qr || payload.data?.qr;
                    if (qr) {
                        qrCode = typeof qr === 'string' ? qr : qr.base64 || qr.code;
                        if (qrCode) {
                            updatePayload.qr_code = qrCode;
                            updatePayload.qr_updated_at = new Date();
                            updatePayload.status = 'qr';  // Explicit QR status
                            updatePayload.status_reason = 'waiting_scan';
                            
                            log.info(`[MessageHandler] QR code updated for unit ${unitId}`);
                        }
                    }
                }
                
                // Connection State Update
                if (event === 'connection.update') {
                    const connectionState = payload.data?.connection || payload.data?.state || payload.connection;
                    
                    if (connectionState === 'open') {
                        status = 'connected';
                        statusReason = 'scan_completed';
                        updatePayload.connected_at = new Date();
                        updatePayload.qr_code = null; // Clear QR on successful connection
                        updatePayload.disconnected_at = null;
                    } 
                    else if (connectionState === 'close' || connectionState === 'refused') {
                        status = 'disconnected';
                        statusReason = 'disconnected';
                        updatePayload.disconnected_at = new Date();
                        updatePayload.qr_code = null;
                    }
                    else if (connectionState === 'connecting') {
                        status = 'qr';
                        statusReason = 'initializing';
                    }
                    
                    if (status) {
                        updatePayload.status = status;
                        updatePayload.status_reason = statusReason;
                    }
                }
            }

            // Legacy Zapi support
            if (provider === 'zapi') {
                if (payload.connected === true) {
                    status = 'connected';
                    statusReason = 'scan_completed';
                    updatePayload.status = status;
                    updatePayload.status_reason = statusReason;
                    updatePayload.connected_at = new Date();
                } 
                else if (payload.connected === false) {
                    status = 'disconnected';
                    statusReason = 'disconnected';
                    updatePayload.status = status;
                    updatePayload.status_reason = statusReason;
                    updatePayload.disconnected_at = new Date();
                }
            }

            // Apply update if we have changes
            if (Object.keys(updatePayload).length > 1) { // More than just updated_at
                log.info(`[MessageHandler] Updating connection status for unit ${unitId}:`, {
                    status: updatePayload.status,
                    reason: updatePayload.status_reason,
                    hasQr: !!updatePayload.qr_code
                });
                
                await supabase
                    .from('unit_whatsapp_connections')
                    .update(updatePayload)
                    .eq('unit_id', unitId);
                
                // Emit real-time event to frontend
                emitToUnit(unitId, 'whatsapp_status', { 
                    status: updatePayload.status || 'unknown',
                    reason: updatePayload.status_reason,
                    qrCode: updatePayload.qr_code
                });
            }
        } catch (error) {
            log.error('[MessageHandler] Status Update Error:', error);
        }
    }

    /**
     * Handle message status updates (delivered, read, failed)
     * Supports race conditions (status arrives before message)
     */
    async handleMessageStatusUpdate(unitId, provider, payload) {
        try {
            if (provider !== 'evolution') return; // Only Evolution supports this currently

            const updates = payload.data?.messages || [];
            
            for (const statusUpdate of updates) {
                const externalId = statusUpdate.key?.id;
                if (!externalId) continue;

                // Map Evolution status to our statuses
                const evolutionStatus = statusUpdate.status;
                let ourStatus = null;

                if (evolutionStatus === 'SERVER_ACK' || evolutionStatus === 'DELIVERY_ACK') {
                    ourStatus = 'delivered';
                } else if (evolutionStatus === 'READ') {
                    ourStatus = 'read';
                } else if (evolutionStatus === 'ERROR' || evolutionStatus === 'FAILED') {
                    ourStatus = 'failed';
                }

                if (!ourStatus) continue;

                // Update message if it exists
                const { data: existing } = await supabase
                    .from('messages')
                    .select('id, status')
                    .eq('external_id', externalId)
                    .eq('provider', provider)
                    .single();

                if (existing) {
                    // Only update if new status is "higher" (sent -> delivered -> read)
                    const statusHierarchy = { 'queued': 0, 'sent': 1, 'delivered': 2, 'read': 3, 'failed': -1 };
                    const currentLevel = statusHierarchy[existing.status] || 0;
                    const newLevel = statusHierarchy[ourStatus] || 0;

                    if (newLevel > currentLevel || ourStatus === 'failed') {
                        await supabase
                            .from('messages')
                            .update({ status: ourStatus })
                            .eq('id', existing.id);
                        
                        log.info(`[MessageHandler] Message ${externalId} status: ${existing.status} -> ${ourStatus}`);
                        
                        // Emit status update to frontend
                        emitToUnit(unitId, 'message_status_updated', {
                            messageId: existing.id,
                            externalId,
                            status: ourStatus
                        });
                    }
                } else {
                    // Race condition: status arrived before message
                    // Store in a temporary status cache if needed, or just log
                    log.warn(`[MessageHandler] Status update for unknown message: ${externalId}, status: ${ourStatus}`);
                }
            }
        } catch (error) {
            log.error('[MessageHandler] Message Status Update Error:', error);
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

import express from 'express';
import { supabase } from '../services/supabaseService.js';
import normalizePhone from '../utils/phone.js';
import { requireAuth, requireUnitContext } from '../middleware/auth.js';
import { whatsappService } from '../services/whatsapp/whatsapp.service.js';
import { sanitizeErrorMessage } from '../utils/webhookHelper.js';
import crypto from 'crypto';

const router = express.Router();

// ✅ AUTENTICAÇÃO OBRIGATÓRIA
router.use(requireAuth);
router.use(requireUnitContext);

/**
 * POST /messages -> { phone, message, clientMessageId? }
 * Outbound message with:
 * - client_message_id idempotency
 * - Retry with exponential backoff (max 3 attempts)
 * - Error sanitization
 */
router.post('/', async (req, res) => {
  const requestId = req.requestId || crypto.randomUUID();
  let persistedMessage = null;
  
  try {
    const { phone, message, clientMessageId } = req.body || {};
    const unitId = req.unitId;

    if (!unitId) return res.status(403).json({ error: 'Unit context required' });
    if (!phone || !message) {
      return res.status(400).json({ error: 'phone and message are required' });
    }

    // 1. Normalizar telefone
    const normalized = normalizePhone(phone);
    if (!normalized) return res.status(400).json({ error: 'invalid phone' });

    // 2. Encontrar Conexão WhatsApp da Unidade
    const { data: connection } = await supabase
      .from('unit_whatsapp_connections')
      .select('*')
      .eq('unit_id', unitId)
      .eq('status', 'connected')
      .single();

    if (!connection) {
      return res.status(400).json({ error: 'WhatsApp not connected for this unit' });
    }

    // 3. Find/Create Contact & Conversation
    let contact = null;
    let conversation = null;
    
    try {
      // Find/Create Contact
      let { data: contactRes } = await supabase.from('contacts').select('*').eq('phone', normalized).single();
      
      if (!contactRes) {
          const inserted = await supabase.from('contacts').insert({ phone: normalized }).select().single();
          contact = inserted?.data ?? null;
      } else {
          contact = contactRes;
      }

      if (contact) {
        // Find/Create Conversation in THIS unit
        let { data: conversationRes } = await supabase
          .from('conversations')
          .select('*')
          .eq('contact_id', contact.id)
          .eq('unit_id', unitId)
          .eq('status', 'open')
          .single();

        if (!conversationRes) {
           const created = await supabase
              .from('conversations')
              .insert({ 
                  contact_id: contact.id,
                  unit_id: unitId,
                  instance_id: connection.id,
                  channel: 'whatsapp'
              })
              .select()
              .single();
           conversation = created?.data ?? null;
        } else {
            conversation = conversationRes;
        }
        
        if (!conversation) {
            throw new Error('Failed to create/find conversation');
        }
        
        // 4. Idempotency Check (if clientMessageId provided)
        if (clientMessageId) {
            const { data: existing } = await supabase
                .from('messages')
                .select('id, status, external_id')
                .eq('conversation_id', conversation.id)
                .eq('client_message_id', clientMessageId)
                .single();
            
            if (existing) {
                console.log(`[Message:${requestId}] Duplicate outbound deduplicated: ${clientMessageId}`);
                return res.status(200).json({ 
                    success: true, 
                    messageId: existing.external_id || existing.id,
                    deduplicated: true,
                    status: existing.status
                });
            }
        }
        
        // 5. Insert Message (queued status)
        const messagePayload = {
            conversation_id: conversation.id,
            sender: 'agent',
            content: message,
            status: 'queued',
            provider: connection.provider,
            client_message_id: clientMessageId || null,
            retry_count: 0
        };
        
        const insertedMsg = await supabase.from('messages').insert(messagePayload).select().single();
        persistedMessage = insertedMsg?.data ?? null;
        
        if (!persistedMessage) {
            throw new Error('Failed to persist message');
        }
      }
    } catch (dbErr) {
      console.error(`[Message:${requestId}] DB error:`, dbErr.message);
      throw dbErr;
    }

    // 6. Send with Retry Logic
    const MAX_RETRIES = 3;
    let lastError = null;
    let result = null;
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            // Exponential backoff: 0ms, 1s, 2s
            if (attempt > 0) {
                const delayMs = attempt * 1000;
                console.log(`[Message:${requestId}] Retry ${attempt}/${MAX_RETRIES} after ${delayMs}ms`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
            
            result = await whatsappService.sendMessage(
                connection.provider,
                connection.provider_config,
                connection.instance_id,
                normalized,
                message,
                unitId
            );
            
            if (result && result.id) {
                // Success!
                await supabase.from('messages').update({ 
                    status: 'sent',
                    external_id: result.id,
                    retry_count: attempt,
                    last_retry_at: attempt > 0 ? new Date() : null
                }).eq('id', persistedMessage.id);
                
                console.log(`[Message:${requestId}] Sent successfully (attempt ${attempt + 1})`);
                
                return res.status(200).json({ 
                    success: true, 
                    messageId: result.id,
                    internalId: persistedMessage.id,
                    attempts: attempt + 1
                });
            }
        } catch (sendError) {
            lastError = sendError;
            console.error(`[Message:${requestId}] Send attempt ${attempt + 1} failed:`, sendError.message);
        }
    }
    
    // 7. All retries failed
    const sanitizedError = sanitizeErrorMessage(lastError);
    
    await supabase.from('messages').update({ 
        status: 'failed',
        retry_count: MAX_RETRIES,
        last_retry_at: new Date(),
        error_details: sanitizedError
    }).eq('id', persistedMessage.id);
    
    console.error(`[Message:${requestId}] Failed after ${MAX_RETRIES} attempts`);
    
    return res.status(502).json({ 
        error: 'Failed to send message after retries',
        details: sanitizedError,
        attempts: MAX_RETRIES
    });

  } catch (err) {
    console.error(`[Message:${requestId}] Error:`, err);
    const sanitized = sanitizeErrorMessage(err);
    return res.status(500).json({ error: 'Internal error', details: sanitized });
  }
});

export default router;

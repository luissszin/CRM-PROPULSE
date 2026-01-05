import express from 'express';
import { supabase } from '../services/supabaseService.js';
import normalizePhone from '../utils/phone.js';
import log from '../utils/logger.js';
import { requireAuth, requireUnitContext } from '../middleware/auth.js';
import { whatsappService } from '../services/whatsapp/whatsapp.service.js';

const router = express.Router();

// ✅ AUTENTICAÇÃO OBRIGATÓRIA
router.use(requireAuth);
router.use(requireUnitContext);

// POST /messages -> { phone, message }
router.post('/', async (req, res) => {
  let persistedMessage = null;
  try {
    const { phone, message } = req.body || {};
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

    // 3. Persistir Mensagem no DB (antes de enviar)
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
        
        if (conversation) {
          // Insert message
          const insertedMsg = await supabase.from('messages').insert({
            conversation_id: conversation.id,
            sender: 'agent',
            content: message,
            status: 'pending'
          }).select().single();
          persistedMessage = insertedMsg?.data ?? null;
        }
      }
    } catch (dbErr) {
      log.warn('Warning: failed to persist outgoing message to Supabase:', dbErr?.message ?? dbErr);
    }

    // 4. Enviar Mensagem usando o Serviço Unificado
    const result = await whatsappService.sendMessage(
        connection.provider,
        connection.provider_config,
        connection.instance_id,
        normalized,
        message,
        unitId
    );
    
    const ok = result && result.id;

    // 5. Atualizar status da mensagem persistida
    try {
      if (supabase && persistedMessage) {
        await supabase.from('messages').update({ 
            status: ok ? 'sent' : 'failed',
            external_id: result.id
        }).eq('id', persistedMessage.id);
      }
    } catch (dbErr2) {
      log.warn('Warning: failed to update message status in Supabase:', dbErr2?.message ?? dbErr2);
    }

    if (!ok) {
      return res.status(502).json({ error: 'failed to send message' });
    }

    return res.status(200).json({ success: true, messageId: result.id });
  } catch (err) {
    log.error('Error in POST /messages:', err);
    try { res.status(500).json({ error: 'internal error' }); } catch (e) { log.error('Failed to send response', e); }
  }
});

export default router;

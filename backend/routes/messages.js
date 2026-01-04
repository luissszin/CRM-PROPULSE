import express from 'express';
import { sendZapiMessage } from '../services/zapiService.js';
import { supabase } from '../services/supabaseService.js';
import normalizePhone from '../utils/phone.js';
import logger from '../utils/logger.js';
import { requireAuth, requireUnitContext } from '../middleware/auth.js';

const router = express.Router();

// ✅ AUTENTICAÇÃO OBRIGATÓRIA (Mesmo para envio via API interna)
router.use(requireAuth);
router.use(requireUnitContext);

// POST /messages -> { phone, message }
router.post('/', async (req, res) => {
  try {
    const { phone, message } = req.body || {};
    const unitId = req.unitId; // Strict

    if (!phone || !message) {
      return res.status(400).json({ error: 'phone and message are required' });
    }

    // normalize phone
    const normalized = normalizePhone(phone);
    if (!normalized) return res.status(400).json({ error: 'invalid phone' });

    // ... (logic) ...

    try {
      if (supabase) {
        // Find/Create Contact
        // Since contacts might be global or loose, we proceed. 
        // If we want isolation, we should query contact associated with unit's leads?
        // For simplicity in "send message" (often creating new convo), we just ensure conversation has unit_id.
        let { data: contact } = await supabase.from('contacts').select('*').eq('phone', normalized).single();
        
        if (!contact) {
            const inserted = await supabase.from('contacts').insert({ phone: normalized }).select().single();
            contact = inserted?.data ?? null;
        }

        if (contact) {
          // Find conversation in THIS unit
          let { data: conversation } = await supabase
            .from('conversations')
            .select('*')
            .eq('contact_id', contact.id)
            .eq('unit_id', unitId) // ✅ Enforce Unit
            .eq('status', 'open')
            .single();

          if (!conversation) {
             // Create conversation in THIS unit
             const created = await supabase
                .from('conversations')
                .insert({ 
                    contact_id: contact.id,
                    unit_id: unitId // ✅ MANDATORY
                })
                .select()
                .single();
             conversation = created?.data ?? null;
          }
          
          if (conversation) {
             // insert ...
          conversation = created?.data ?? null;
        }

        if (conversation) {
          // insert message
          const insertedMsg = await supabase.from('messages').insert({
            conversation_id: conversation.id,
            sender: 'agent',
            content: message
          }).select().single();
          persistedMessage = insertedMsg?.data ?? null;
        }
      }
    } catch (dbErr) {
      logger.warn('Warning: failed to persist outgoing message to Supabase:', dbErr?.message ?? dbErr);
      // continue even if DB write fails
    }

    const ok = await sendZapiMessage(normalized, message);
    // Update persisted message status 
    try {
      if (supabase && persistedMessage) {
        await supabase.from('messages').update({ status: ok ? 'sent' : 'failed' }).eq('id', persistedMessage.id);
      }
    } catch (dbErr2) {
      // Ignore missing column error to avoid log spam
      const msg = dbErr2?.message || dbErr2;
      if (typeof msg === 'string' && msg.includes('column')) {
        // silent ignore
      } else {
        logger.warn('Warning: failed to update message status in Supabase:', msg);
      }
    }

    if (!ok) {
      return res.status(502).json({ error: 'failed to send message' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    logger.error('Error in POST /messages:', err);
    try { res.status(500).json({ error: 'internal error' }); } catch (e) { logger.error('Failed to send response', e); }
  }
});

export default router;

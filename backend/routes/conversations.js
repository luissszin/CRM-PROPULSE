import express from 'express';
import { supabase } from '../services/supabaseService.js';
import { sendZapiMessage } from '../services/zapiService.js';
import logger from '../utils/logger.js';
import { requireAuth, requireUnitContext } from '../middleware/auth.js';

const router = express.Router();

// ✅ AUTENTICAÇÃO OBRIGATÓRIA E ISOLAMENTO
router.use(requireAuth);

// GET /conversations - list recent conversations
router.get('/', requireUnitContext, async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ error: 'supabase not configured' });

    const unitId = req.unitId; // Pegar do middleware validado
    if (!unitId) return res.status(400).json({ error: 'unitId is required' });

    const { data, error } = await supabase.from('conversations')
      .select('*')
      .eq('unit_id', unitId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return res.status(500).json({ error: error.message || 'db error' });

    // enrich with contact and last message
    const enriched = await Promise.all((data || []).map(async (c) => {
      const { data: contact } = await supabase.from('contacts').select('*').eq('id', c.contact_id).single();
      const { data: lastMsgs } = await supabase.from('messages').select('content, created_at').eq('conversation_id', c.id).order('created_at', { ascending: false }).limit(1);
      return { 
        ...c, 
        contact: contact ?? null,
        last_message: lastMsgs?.[0]?.content || '',
        updated_at: lastMsgs?.[0]?.created_at || c.updated_at
      };
    }));

    return res.json({ conversations: enriched });
  } catch (err) {
    console.error('GET /conversations error:', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

// ... (GET /conversations/:id/messages remains same)

// POST /conversations/:id/messages -> { message }
router.post('/:id/messages', async (req, res) => {
  try {
    const id = req.params.id;
    const { message } = req.body || {};
    if (!message) return res.status(400).json({ error: 'message required' });
    if (!supabase) return res.status(503).json({ error: 'supabase not configured' });

    // 1. Find conversation
    const { data: conv } = await supabase
      .from('conversations')
      .select('*, unit_whatsapp_connections(*)') // Try to join if possible or fetch later
      .eq('id', id)
      .eq('unit_id', req.user.unitId)
      .single();

    if (!conv) return res.status(404).json({ error: 'conversation not found or access denied' });

    // 2. Resolve WhatsApp Connection for this unit
    const { data: connection } = await supabase
      .from('unit_whatsapp_connections')
      .select('*')
      .eq('unit_id', conv.unit_id)
      .eq('status', 'connected')
      .single();

    if (!connection && conv.channel === 'whatsapp') {
        return res.status(400).json({ error: 'WhatsApp is not connected for this unit' });
    }

    const { data: contact } = await supabase.from('contacts').select('*').eq('id', conv.contact_id).single();
    if (!contact) return res.status(404).json({ error: 'contact not found' });

    // 3. Persist pending message
    const { data: inserted } = await supabase.from('messages').insert({
      conversation_id: conv.id,
      sender: 'agent',
      content: message,
      status: 'pending'
    }).select().single();

    let result = { id: null };
    let ok = false;
    
    try {
      if (conv.channel === 'whatsapp' && connection) {
        const { whatsappService } = await import('../services/whatsapp/whatsapp.service.js');
        result = await whatsappService.sendMessage(
            connection.provider,
            connection.provider_config,
            connection.instance_id,
            contact.phone,
            message,
            conv.unit_id
        );
        ok = (result && result.id);
      } else if (conv.channel === 'zapi') {
        // Fallback or handle differently
        const { sendZapiMessage } = await import('../services/zapiService.js');
        ok = await sendZapiMessage(contact.phone, message);
      }
    } catch (e) {
      logger.error('Message send error', e);
      ok = false;
    }

    // 4. Update status
    try {
      await supabase.from('messages').update({ 
          status: ok ? 'sent' : 'failed',
          external_id: result?.id
      }).eq('id', inserted?.id);
      
      // Update conversation updated_at
      await supabase.from('conversations').update({ updated_at: new Date() }).eq('id', conv.id);
    } catch (e) {
      logger.warn('Failed updating message status', e?.message ?? e);
    }

    if (!ok) return res.status(502).json({ error: 'failed to send message' });
    return res.json({ success: true, message: { ...inserted, status: 'sent', external_id: result?.id } });
  } catch (err) {
    console.error('POST /conversations/:id/messages error:', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

export default router;

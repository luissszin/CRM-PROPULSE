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

    // enrich with contact
    const enriched = await Promise.all((data || []).map(async (c) => {
      const { data: contact } = await supabase.from('contacts').select('*').eq('id', c.contact_id).single();
      return { ...c, contact: contact ?? null };
    }));

    return res.json({ conversations: enriched });
  } catch (err) {
    console.error('GET /conversations error:', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

// GET /conversations/:id/messages
router.get('/:id/messages', async (req, res) => {
  try {
    const id = req.params.id;
    if (!supabase) return res.status(503).json({ error: 'supabase not configured' });
    
    // ✅ SEGURANÇA: Filtrar na query
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', id)
      .eq('unit_id', req.user.unitId) // Enforce unit isolation
      .single();
      
    if (convError || !conv) {
      return res.status(404).json({ error: 'Conversation not found or access denied' });
    }
    // (Manual check removed)
    
    const { data, error } = await supabase.from('messages').select('*').eq('conversation_id', id).order('created_at', { ascending: true });
    if (error) return res.status(500).json({ error: error.message || 'db error' });
    return res.json({ messages: data });
  } catch (err) {
    console.error('GET /conversations/:id/messages error:', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

// POST /conversations/:id/messages -> { message }
router.post('/:id/messages', async (req, res) => {
  try {
    const id = req.params.id;
    const { message } = req.body || {};
    if (!message) return res.status(400).json({ error: 'message required' });
    if (!supabase) return res.status(503).json({ error: 'supabase not configured' });

    // find conversation
    // ✅ SEGURANÇA: Filtrar na query
    const { data: conv } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', id)
      .eq('unit_id', req.user.unitId) // Enforce unit isolation
      .single();

    if (!conv) return res.status(404).json({ error: 'conversation not found or access denied' });
    // (Manual check removed)

    const { data: contact } = await supabase.from('contacts').select('*').eq('id', conv.contact_id).single();
    if (!contact) return res.status(404).json({ error: 'contact not found' });

    // persist pending message
    const { data: inserted } = await supabase.from('messages').insert({
      conversation_id: conv.id,
      sender: 'agent',
      content: message,
      status: 'pending'
    }).select().single();

    let ok = false;
    try {
      ok = await sendZapiMessage(contact.phone, message);
    } catch (e) {
      logger.error('sendZapiMessage error', e);
      ok = false;
    }

    // update status
    try {
      await supabase.from('messages').update({ status: ok ? 'sent' : 'failed' }).eq('id', inserted?.id);
    } catch (e) {
      logger.warn('Failed updating message status', e?.message ?? e);
    }

    if (!ok) return res.status(502).json({ error: 'failed to send message' });
    return res.json({ success: true, message: inserted });
  } catch (err) {
    console.error('POST /conversations/:id/messages error:', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

export default router;

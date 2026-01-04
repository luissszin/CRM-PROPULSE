import express from 'express';
import { supabase } from '../services/supabaseService.js';

const router = express.Router();

// GET /inbox - list conversations with last message and contact
router.get('/', async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ error: 'supabase not configured' });

    const { unitId } = req.query;
    if (!unitId) return res.status(400).json({ error: 'unitId is required' });

    // get conversations
    const { data: convs, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('unit_id', unitId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) return res.status(500).json({ error: error.message || 'db error' });

    const enriched = await Promise.all((convs || []).map(async (c) => {
      const { data: contact } = await supabase.from('contacts').select('*').eq('id', c.contact_id).single();
      const { data: last } = await supabase.from('messages').select('*').eq('conversation_id', c.id).order('created_at', { ascending: false }).limit(1);
      return { conversation: c, contact: contact ?? null, lastMessage: (last && last[0]) ? last[0] : null };
    }));

    return res.json({ inbox: enriched });
  } catch (err) {
    console.error('GET /inbox error:', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

export default router;

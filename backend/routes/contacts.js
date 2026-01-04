import express from 'express';
import { supabase } from '../services/supabaseService.js';
import normalizePhone from '../utils/phone.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// ✅ AUTENTICAÇÃO OBRIGATÓRIA
router.use(requireAuth);

// GET /contacts?q=&limit=
router.get('/', async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ error: 'supabase not configured' });
    const q = req.query.q;
    const limit = parseInt(req.query.limit || '50', 10);

    let query = supabase.from('contacts').select('*').order('created_at', { ascending: false }).limit(limit);
    if (q) {
      const clean = String(q).replace(/[^0-9]/g, '');
      query = query.ilike('phone', `%${clean}%`);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message || 'db error' });
    return res.json({ contacts: data });
  } catch (err) {
    console.error('GET /contacts error:', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

// POST /contacts -> { phone, name }
router.post('/', async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ error: 'supabase not configured' });
    const { phone, name } = req.body || {};
    if (!phone) return res.status(400).json({ error: 'phone required' });

    const normalized = normalizePhone(phone);
    if (!normalized) return res.status(400).json({ error: 'invalid phone' });

    const { data: existing } = await supabase.from('contacts').select('*').eq('phone', normalized).single();
    if (existing) return res.status(200).json({ contact: existing });

    const { data, error } = await supabase.from('contacts').insert({ phone: normalized, name }).select().single();
    if (error) return res.status(500).json({ error: error.message || 'db error' });
    return res.status(201).json({ contact: data });
  } catch (err) {
    console.error('POST /contacts error:', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

export default router;

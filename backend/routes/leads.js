import express from 'express';
import { supabase } from '../services/supabaseService.js';
import normalizePhone from '../utils/phone.js';
import { triggerAutomation } from '../services/automationService.js';
import { requireAuth, requireUnitContext } from '../middleware/auth.js';

const router = express.Router();

// ✅ APLICAR AUTENTICAÇÃO EM TODAS AS ROTAS
router.use(requireAuth);

// Units
// GET /leads/units -> list units
router.get('/units', async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ error: 'supabase not configured' });
    const { data, error } = await supabase.from('units').select('*').order('created_at', { ascending: false }).limit(200);
    if (error) return res.status(500).json({ error: error.message || 'db error' });
    return res.json({ units: data });
  } catch (err) {
    console.error('GET /leads/units error:', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

// POST /leads/units -> create unit
router.post('/units', async (req, res) => {
  try {
    const { name, slug, metadata } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name required' });
    const { data, error } = await supabase.from('units').insert({ name, slug, metadata }).select().single();
    if (error) return res.status(500).json({ error: error.message || 'db error' });
    return res.status(201).json({ unit: data });
  } catch (err) {
    console.error('POST /leads/units error:', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

// Leads
// GET /leads -> list leads (optionally filter by unit_id)
router.get('/', requireUnitContext, async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ error: 'supabase not configured' });
    const unit_id = req.unitId; // Middleware garante que este ID é válido para o usuário
    const limit = parseInt(req.query.limit || '100', 10);

    let query = supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(limit);
    query = query.eq('unit_id', unit_id);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message || 'db error' });
    return res.json({ leads: data });
  } catch (err) {
    console.error('GET /leads error (returning empty):', err);
    return res.json({ leads: [] });
  }
});

// GET /leads/:id
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!supabase) return res.status(503).json({ error: 'supabase not configured' });
    
    // ✅ CORREÇÃO: Buscar o lead primeiro para validar unit_id
    const { data, error } = await supabase.from('leads').select('*').eq('id', id).single();
    if (error) return res.status(404).json({ error: error.message || 'not found' });
    
    // ✅ SEGURANÇA: Verificar se o usuário tem acesso a esta unidade
    if (req.user.role !== 'super_admin' && data.unit_id !== req.user.unitId) {
      return res.status(403).json({ error: 'Forbidden: Cannot access lead from another unit' });
    }
    
    return res.json({ lead: data });
  } catch (err) {
    console.error('GET /leads/:id error:', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

// POST /leads -> create lead (and optionally create contact)
router.post('/', requireUnitContext, async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ error: 'supabase not configured' });
    const { phone, name, email, source, assigned_to, metadata } = req.body || {};
    const unit_id = req.unitId; // Middleware validado
    
    if (!unit_id) return res.status(400).json({ error: 'unit_id required' });

    let contact_id = null;
    let normalized = null;
    if (phone) {
      normalized = normalizePhone(phone);
      if (!normalized) return res.status(400).json({ error: 'invalid phone' });

      // find or create contact
      const { data: existing } = await supabase.from('contacts').select('*').eq('phone', normalized).single();
      if (existing) contact_id = existing.id;
      else {
        const { data: created } = await supabase.from('contacts').insert({ phone: normalized, name }).select().single();
        contact_id = created?.id ?? null;
      }
    }

    const payload = { unit_id, contact_id, name, phone, email, source, status: 'new', assigned_to, metadata };
    const { data, error } = await supabase.from('leads').insert(payload).select().single();
    if (error) return res.status(500).json({ error: error.message || 'db error' });

    // Trigger Automation
    triggerAutomation(unit_id, 'new_lead', { lead: data, ...data }).catch(console.error);

    return res.status(201).json({ lead: data });
  } catch (err) {
    console.error('POST /leads error:', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

// PATCH /leads/:id -> update lead (alias for PUT)
router.patch('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body || {};
    if (!supabase) return res.status(503).json({ error: 'supabase not configured' });

    // Get current lead to detect changes
    const { data: currentLead } = await supabase.from('leads').select('*').eq('id', id).single();
    if (!currentLead) return res.status(404).json({ error: 'Lead not found' });
    
    // ✅ SEGURANÇA: Validar acesso à unidade
    if (req.user.role !== 'super_admin' && currentLead.unit_id !== req.user.unitId) {
      return res.status(403).json({ error: 'Forbidden: Cannot update lead from another unit' });
    }

    const { data, error } = await supabase.from('leads').update(updates).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message || 'db error' });

    // Detect stage change
    if (updates.status && updates.status !== currentLead.status) {
      console.log(`[Leads] Stage changed: ${currentLead.status} -> ${updates.status}`);
      triggerAutomation(data.unit_id, 'stage_change', {
        lead: data,
        ...data,
        oldStage: currentLead.status,
        newStage: updates.status
      }).catch(console.error);
    }

    return res.json({ lead: data });
  } catch (err) {
    console.error('PATCH /leads/:id error:', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

// PUT /leads/:id -> update lead
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body || {};
    if (!supabase) return res.status(503).json({ error: 'supabase not configured' });

    // Get current lead to detect changes
    const { data: currentLead } = await supabase.from('leads').select('*').eq('id', id).single();
    if (!currentLead) return res.status(404).json({ error: 'Lead not found' });
    
    // ✅ SEGURANÇA: Validar acesso à unidade
    if (req.user.role !== 'super_admin' && currentLead.unit_id !== req.user.unitId) {
      return res.status(403).json({ error: 'Forbidden: Cannot update lead from another unit' });
    }

    const { data, error } = await supabase.from('leads').update(updates).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message || 'db error' });

    // Detect stage change
    if (updates.status && updates.status !== currentLead.status) {
      triggerAutomation(data.unit_id, 'stage_change', {
        lead: data,
        ...data,
        oldStage: currentLead.status,
        newStage: updates.status
      }).catch(console.error);
    }

    return res.json({ lead: data });
  } catch (err) {
    console.error('PUT /leads/:id error:', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

export default router;

import express from 'express';
import { supabase } from '../services/supabaseService.js';
import normalizePhone from '../utils/phone.js';
import { metrics } from '../services/metricsService.js';
import { automationEngine } from '../services/automation/engine.js';
import { updateLeadScore } from '../services/leadScoring.js';
import { requireAuth, requireUnitContext, requireRole } from '../middleware/auth.js';

const router = express.Router();

// ✅ APLICAR AUTENTICAÇÃO EM TODAS AS ROTAS
router.use(requireAuth);

// Units - Restricted to Super Admin
// GET /leads/units -> list units
router.get('/units', requireRole(['super_admin']), async (req, res) => {
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
router.post('/units', requireRole(['super_admin']), async (req, res) => {
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
    if (!unit_id) {
        // If no unit context, return empty array for safety unless super_admin
        if (req.user.role !== 'super_admin') return res.json({ leads: [] });
    } else {
        query = query.eq('unit_id', unit_id);
    }

    const { data, error } = await query;
    if (error) {
        console.error('[Leads] DB Query Error:', error);
        return res.status(500).json({ error: error.message || 'db error' });
    }
    return res.json({ leads: data });
  } catch (err) {
    console.error('GET /leads error:', err);
    return res.status(500).json({ error: 'internal error' });
  }
});


// GET /leads/:id
router.get('/:id', requireUnitContext, async (req, res) => {
  try {
    const id = req.params.id;
    if (!supabase) return res.status(503).json({ error: 'supabase not configured' });
    
    // ✅ CORREÇÃO: Filtrar diretamente na query
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .eq('unit_id', req.unitId) // Enforce unit isolation
      .single();
    if (error) return res.status(404).json({ error: error.message || 'not found' });
    
    // (Check removed, query handles it)
    
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

    // ✅ New Automation Engine
    automationEngine.trigger(unit_id, 'lead_created', { lead: data });
    
    // ✅ Lead Scoring
    updateLeadScore(data.id, unit_id);
    
    // ✅ Metric
    metrics.increment(unit_id, 'leads_created');

    return res.status(201).json({ lead: data });
  } catch (err) {
    console.error('POST /leads error:', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

// PATCH /leads/:id -> update lead (alias for PUT)
router.patch('/:id', requireUnitContext, async (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body || {};
    if (!supabase) return res.status(503).json({ error: 'supabase not configured' });

    // Get current lead to detect changes
    // ✅ SEGURANÇA: Filtrar na query
    const { data: currentLead } = await supabase.from('leads').select('*').eq('id', id).eq('unit_id', req.unitId).single();
    if (!currentLead) return res.status(404).json({ error: 'Lead not found or access denied' });
    // (Manual check removed)

    const { data, error } = await supabase.from('leads').update(updates).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message || 'db error' });

    // Detect stage change
    if (updates.status && updates.status !== currentLead.status) {
      console.log(`[Leads] Stage changed: ${currentLead.status} -> ${updates.status}`);
      automationEngine.trigger(data.unit_id, 'stage_change', {
        lead: data,
        oldStage: currentLead.status,
        newStage: updates.status
      }).catch(err => console.error('[Automation] Trigger error:', err));
    }


    return res.json({ lead: data });
  } catch (err) {
    console.error('PATCH /leads/:id error:', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

// PUT /leads/:id -> update lead
router.put('/:id', requireUnitContext, async (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body || {};
    if (!supabase) return res.status(503).json({ error: 'supabase not configured' });

    // Get current lead to detect changes
    // ✅ SEGURANÇA: Filtrar na query
    const { data: currentLead } = await supabase.from('leads').select('*').eq('id', id).eq('unit_id', req.unitId).single();
    if (!currentLead) return res.status(404).json({ error: 'Lead not found or access denied' });
    // (Manual check removed)

    const { data, error } = await supabase.from('leads').update(updates).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message || 'db error' });

    // Detect stage change
    if (updates.status && updates.status !== currentLead.status) {
      automationEngine.trigger(data.unit_id, 'stage_change', {
        lead: data,
        oldStage: currentLead.status,
        newStage: updates.status
      }).catch(err => console.error('[Automation] Trigger error:', err));
    }


    return res.json({ lead: data });
  } catch (err) {
    console.error('PUT /leads/:id error:', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

export default router;

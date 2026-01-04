import express from 'express';
import { supabase } from '../services/supabaseService.js';

const router = express.Router();

// GET /automation/flows?unitId=...
router.get('/flows', async (req, res) => {
    try {
        const { unitId } = req.query;
        if (!unitId) return res.status(400).json({ error: 'unitId required' });

        const { data, error } = await supabase
            .from('automation_flows')
            .select('*')
            .eq('unit_id', unitId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return res.json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// POST /automation/flows
router.post('/flows', async (req, res) => {
    try {
        const { unitId, name, trigger_type, trigger_config, actions } = req.body;
        if (!unitId || !name || !trigger_type) return res.status(400).json({ error: 'Missing required fields' });

        const { data, error } = await supabase
            .from('automation_flows')
            .insert({
                unit_id: unitId,
                name,
                trigger_type,
                trigger_config: trigger_config || {},
                actions: actions || [],
                active: true
            })
            .select()
            .single();

        if (error) throw error;
        return res.status(201).json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// PATCH /automation/flows/:id
router.patch('/flows/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const { data, error } = await supabase
            .from('automation_flows')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return res.json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// DELETE /automation/flows/:id
router.delete('/flows/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('automation_flows')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return res.json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// GET /automation/logs?unitId=...
router.get('/logs', async (req, res) => {
    try {
        const { unitId } = req.query;
        if (!unitId) return res.status(400).json({ error: 'unitId required' });

        const { data, error } = await supabase
            .from('automation_logs')
            .select('*, automation_flows(name), leads(name)')
            .eq('unit_id', unitId)
            .order('executed_at', { ascending: false })
            .limit(50);

        if (error) throw error;
        return res.json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

export default router;

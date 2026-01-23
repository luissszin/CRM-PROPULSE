import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { campaignService } from '../services/campaignService.js';
import { supabase } from '../services/supabaseService.js';

const router = express.Router();

router.use(requireAuth);

// LIST Campaigns
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('campaigns')
            .select('*')
            .eq('unit_id', req.user.unitId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return res.json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// CREATE Campaign
router.post('/', async (req, res) => {
    try {
        const campaign = await campaignService.create(req.user.unitId, req.body);
        return res.status(201).json(campaign);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// GET Campaign Details (with recipients)
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data: campaign, error } = await supabase
            .from('campaigns')
            .select('*')
            .eq('id', id)
            .eq('unit_id', req.user.unitId)
            .single();
            
        if (error || !campaign) return res.status(404).json({ error: 'Campaign not found' });

        const { data: recipients } = await supabase
            .from('campaign_recipients')
            .select('*, contacts(name, phone)')
            .eq('campaign_id', id);

        return res.json({ ...campaign, recipients });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// DISPATCH Campaign
router.post('/:id/dispatch', async (req, res) => {
    try {
        // Fire and Forget (Async Worker)
        // Or await if user wants to wait? Let's await for MVP simplicity or return accepted.
        // Returning Accepted 202 is better for long running, but "200" with "started" is fine.
        
        // Check ownership first
        const { data: check } = await supabase.from('campaigns').select('id').eq('id', req.params.id).eq('unit_id', req.user.unitId).single();
        if (!check) return res.status(404).json({ error: 'Campaign not found' });

        campaignService.dispatch(req.params.id).catch(err => {
            console.error('[Campaign] Dispatch Background Error:', err);
        });

        return res.json({ success: true, message: 'Campaign dispatch started' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

export default router;

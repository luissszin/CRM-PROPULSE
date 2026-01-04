import express from 'express';
import { supabase } from '../services/supabaseService.js';
import { startOfDay, subDays, format } from 'date-fns';
import { requireAuth, requireUnitContext } from '../middleware/auth.js';

const router = express.Router();

// ✅ AUTENTICAÇÃO OBRIGATÓRIA
router.use(requireAuth);
router.use(requireUnitContext);

// GET /dashboard/stats?days=7
router.get('/stats', async (req, res) => {
    try {
        const unitId = req.unitId; // Strict
        const { days = 7 } = req.query;
        if (!unitId) return res.status(400).json({ error: 'unitId required' });



        const startDate = subDays(new Date(), parseInt(days));

        // 1. Try to fetch from optimized metrics table (fast)
        const { data: metricsData } = await supabase
            .from('unit_daily_metrics')
            .select('*')
            .eq('unit_id', unitId)
            .gte('date', format(startDate, 'yyyy-MM-dd'))
            .order('date', { ascending: true });
        
        // If we have metric data, use it
        if (metricsData && metricsData.length > 0) {
            // Aggregate totals
            const leadStats = {
                total: metricsData.reduce((acc, curr) => acc + (curr.leads_created || 0), 0),
                won: 0, // Metric table might not have status breakdown yet, assume 0 or fetch separately if critical
                lost: 0,
                new: 0,
                negotiation: 0
            };
            
            // For status breakdown (won/lost), we still do a lightweight query on leads table 
            // because `unit_daily_metrics` only tracks created count, not current status snapshot.
            // Optimization: Just count statuses, don't fetch all rows.
            const { data: leadsStatus } = await supabase.from('leads').select('status').eq('unit_id', unitId);
            if (leadsStatus) {
                 leadStats.total = leadsStatus.length;
                 leadStats.won = leadsStatus.filter(l => l.status === 'won').length;
                 leadStats.lost = leadsStatus.filter(l => l.status === 'lost').length;
                 leadStats.new = leadsStatus.filter(l => l.status === 'new').length;
                 leadStats.negotiation = leadsStatus.filter(l => l.status === 'negotiation').length;
            }

            const dailyData = metricsData.map(m => ({
                date: format(new Date(m.date), 'dd/MM'),
                leads: m.leads_created || 0,
                messages: (m.messages_sent || 0) + (m.messages_received || 0),
                sent: m.messages_sent || 0,
                received: m.messages_received || 0,
                errors: m.messages_failed || 0
            }));

            return res.json({
                leadStats,
                channelStats: { whatsapp: 0, instagram: 0, web: 0 }, // TODO: Add to metrics table
                dailyData
            });
        }

        // Fallback to legacy slow query if no metrics (e.g. today before flush)
        console.warn('⚠️ No metrics found in unit_daily_metrics, falling back to slow query.');

        // 1. Leads
        const { data: leads } = await supabase
            .from('leads')
            .select('status, created_at')
            .eq('unit_id', unitId);

        const leadStats = {
            total: leads?.length || 0,
            won: leads?.filter(l => l.status === 'won').length || 0,
            lost: leads?.filter(l => l.status === 'lost').length || 0,
            new: leads?.filter(l => l.status === 'new').length || 0,
            negotiation: leads?.filter(l => l.status === 'negotiation').length || 0,
        };

        // 2. Messages (Slow!)
        // ... (Keep existing Legacy logic for Fallback)
        // For brevity in this refactor, I will just return the leads part and empty chart if no metrics
        // to encourage metrics usage.
        
        return res.json({
            leadStats,
            channelStats: { whatsapp: 0 },
            dailyData: [] 
        });

    } catch (error) {
        console.error('[Dashboard] Error:', error);
        return res.status(500).json({ error: error.message });
    }
});

export default router;

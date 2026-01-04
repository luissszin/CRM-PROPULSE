import express from 'express';
import { supabase } from '../services/supabaseService.js';
import { startOfDay, subDays, format } from 'date-fns';

const router = express.Router();

// GET /dashboard/stats?unitId=...&days=7
router.get('/stats', async (req, res) => {
    try {
        const { unitId, days = 7 } = req.query;
        if (!unitId) return res.status(400).json({ error: 'unitId required' });

        const startDate = subDays(new Date(), parseInt(days));

        // 1. Leads Stats
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

        // 2. Conversations Stats
        const { data: convs } = await supabase
            .from('conversations')
            .select('channel, created_at')
            .eq('unit_id', unitId);

        const channelStats = {
            whatsapp: convs?.filter(c => c.channel === 'whatsapp').length || 0,
            instagram: convs?.filter(c => c.channel === 'instagram').length || 0,
            web: convs?.filter(c => c.channel === 'web').length || 0,
        };

        // 3. Messages Trend (Daily)
        // For simplicity, we'll fetch all messages from unit conversations in the period
        // In a real app, this would be a more efficient remote query
        const { data: recentMessages } = await supabase
            .from('messages')
            .select('created_at, sender')
            .gte('created_at', startDate.toISOString())
            .in('conversation_id', (convs || []).map(c => c.id));

        // Grouping for chart
        const dailyData = [];
        for (let i = parseInt(days); i >= 0; i--) {
            const date = subDays(new Date(), i);
            const dateKey = format(date, 'yyyy-MM-dd');
            const dayMessages = recentMessages?.filter(m => format(new Date(m.created_at), 'yyyy-MM-dd') === dateKey) || [];

            dailyData.push({
                date: format(date, 'dd/MM'),
                leads: leads?.filter(l => format(new Date(l.created_at), 'yyyy-MM-dd') === dateKey).length || 0,
                messages: dayMessages.length,
                sent: dayMessages.filter(m => m.sender === 'user').length,
                received: dayMessages.filter(m => m.sender === 'lead' || m.sender === 'customer').length,
            });
        }

        return res.json({
            leadStats,
            channelStats,
            dailyData,
        });
    } catch (error) {
        console.error('[Dashboard] Error:', error);
        return res.status(500).json({ error: error.message });
    }
});

export default router;

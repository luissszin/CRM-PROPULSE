import { supabase } from '../supabaseService.js';
import { log } from '../../utils/logger.js';
import { metrics } from '../metricsService.js';

/**
 * Calculates and updates lead score
 * @param {string} leadId 
 * @param {string} unitId 
 */
export const updateLeadScore = async (leadId, unitId) => {
    try {
        // 1. Fetch Lead Data & Engagement Stats
        const { data: lead } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .single();

        if (!lead) return;

        // Fetch interactions (messages, calls - heavily simplified for now)
        // Ideally we would double check conversation counts via a specialized view or cached metric
        // For now, let's assume we boost score on recent activity.
        
        let score = 0;
        
        // Base Score from Status
        const statusScores = { 'new': 10, 'contacted': 20, 'negotiation': 50, 'won': 100, 'lost': 0 };
        score += statusScores[lead.status] || 0;

        // Activity Score (Simplified)
        // In a real system we'd count 'messages' from this lead
        
        // Temperature Classification
        let temperature = 'cold';
        if (score >= 30) temperature = 'warm';
        if (score >= 80) temperature = 'hot';

        // Update DB
        const { error } = await supabase
            .from('leads')
            .update({ 
                score, 
                temperature, 
                last_engagement_at: new Date() 
            })
            .eq('id', leadId);
            
        if (error) log.error(`Score update failed for ${leadId}`, error);
        
    } catch (err) {
        log.error('Lead Scoring Error', err);
    }
};

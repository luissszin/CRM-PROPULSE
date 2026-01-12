import { supabase } from '../supabaseService.js';
import { log } from '../../../utils/logger.js';
// import OpenAI from 'openai'; // TODO: Install openai package

/**
 * AI Service for CRM Intelligence
 * Handles Summarization, Suggestions, and Intent Classification
 */
class AIService {
    
    constructor() {
        this.openai = null; // Lazy init
        // if (process.env.OPENAI_API_KEY) this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    /**
     * Check if AI is enabled for the unit
     */
    async isEnabled(unitId) {
        const { data } = await supabase
            .from('unit_ai_settings')
            .select('enabled, model')
            .eq('unit_id', unitId)
            .single();
        return data?.enabled ? data : null;
    }

    /**
     * Suggest a reply for the last message
     */
    async suggestReply(unitId, conversationHistory) {
        const settings = await this.isEnabled(unitId);
        if (!settings) return null;

        // Mock Implementation for Prototype
        // In real world: Call OpenAI ChatCompletion with conversation history
        
        const lastMsg = conversationHistory[conversationHistory.length - 1];
        if (!lastMsg) return null;

        if (lastMsg.content.toLowerCase().includes('preço')) {
            return "Olá! Nossos preços variam conforme o plano. Gostaria de agendar uma demo?";
        }
        
        return "Olá! Como posso ajudar você hoje?";
    }

    /**
     * Summarize conversation context
     */
    async summarize(unitId, text) {
        // Mock Implementation
        return "Cliente interessado em automação, perguntou sobre preços.";
    }

    /**
     * Classify Intent (Sales, Support, Spam)
     */
    async classifyIntent(unitId, text) {
        // Mock Implementation
        if (text.toLowerCase().includes('erro') || text.toLowerCase().includes('bug')) return 'support';
        if (text.toLowerCase().includes('comprar') || text.toLowerCase().includes('preço')) return 'sales';
        return 'general';
    }
}

export const aiService = new AIService();

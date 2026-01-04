import { supabase } from '../services/supabaseService.js';
import { v4 as uuidv4 } from 'uuid';
import log from '../utils/logger.js';

class MetricsService {
    
    constructor() {
        this.cache = new Map(); // Simple flush buffer
        this.FLUSH_INTERVAL = 30000; // 30s
        
        // Auto-flush periodically
        setInterval(() => this.flush(), this.FLUSH_INTERVAL);
    }

    /**
     * Increment a metric counter for a unit
     * @param {string} unitId 
     * @param {string} metric 'messages_sent' | 'messages_failed' | 'leads_created' | 'api_requests_count'
     * @param {number} value 
     */
    increment(unitId, metric, value = 1) {
        if (!unitId) return;
        
        const key = `${unitId}:${metric}`;
        const current = this.cache.get(key) || 0;
        this.cache.set(key, current + value);
    }

    /**
     * Flush in-memory metrics to DB
     */
    async flush() {
        if (this.cache.size === 0) return;
        
        log.info('Flushing metrics to DB...');
        
        // Group by Unit
        const updates = {};
        
        for (const [key, value] of this.cache.entries()) {
            const [unitId, metric] = key.split(':');
            
            if (!updates[unitId]) updates[unitId] = {};
            updates[unitId][metric] = (updates[unitId][metric] || 0) + value;
        }
        
        this.cache.clear();

        // Batch Update/Upsert
        const date = new Date().toISOString().split('T')[0];
        
        for (const unitId of Object.keys(updates)) {
            try {
                // We use an RPC or careful upsert logic. 
                // Since Supabase simple upsert replaces standard columns, we need to handle increments.
                // Ideal: RPC 'increment_metrics'.
                // Fallback: Read-Modify-Write (slower but works without RPC)
                
                // 1. Get current for today
                const { data: current } = await supabase
                    .from('unit_daily_metrics')
                    .select('*')
                    .eq('unit_id', unitId)
                    .eq('date', date)
                    .single();
                
                const payload = { 
                    unit_id: unitId, 
                    date: date,
                    updated_at: new Date()
                };
                
                // Merge counts
                const metrics = ['messages_sent', 'messages_failed', 'messages_received', 'leads_created', 'api_requests_count'];
                metrics.forEach(m => {
                    const dbVal = current ? current[m] : 0;
                    const incVal = updates[unitId][m] || 0;
                    payload[m] = dbVal + incVal;
                });

                const { error } = await supabase
                    .from('unit_daily_metrics')
                    .upsert(payload, { onConflict: 'unit_id,date' });
                    
                if (error) log.error(`Metrics flush failed for ${unitId}:`, error.message);

            } catch (err) {
                log.error(`Metrics flush critical error for ${unitId}:`, err);
            }
        }
    }
}

export const metrics = new MetricsService();

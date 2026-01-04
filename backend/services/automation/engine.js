import { supabase } from '../../supabaseService.js';
import { actions } from './actions.js';
import { log } from '../../../utils/logger.js';

class AutomationEngine {
    
    /**
     * Trigger an event to check for matching rules
     * @param {string} unitId 
     * @param {string} triggerType 'lead_created' | 'message_received' | ...
     * @param {object} context lead, message, conversation data
     */
    async trigger(unitId, triggerType, context) {
        if (!unitId) return;

        try {
            // 1. Fetch Active Rules for Unit & Trigger
            const { data: rules } = await supabase
                .from('automation_rules')
                .select('*')
                .eq('unit_id', unitId)
                .eq('trigger_type', triggerType)
                .eq('active', true);

            if (!rules || rules.length === 0) return;

            log.info(`[Automation] Found ${rules.length} active rules for ${triggerType} (Unit: ${unitId})`);

            // 2. Evaluate & Execute
            for (const rule of rules) {
                if (this.evaluateConditions(rule.conditions, context)) {
                    await this.executeAction(rule, context);
                }
            }
        } catch (err) {
            log.error('[Automation Engine] Error:', err);
        }
    }

    evaluateConditions(conditions, context) {
        if (!conditions || conditions.length === 0) return true;
        // Simple evaluator: All must be true (AND)
        // Format: { field: 'status', operator: 'equals', value: 'new' }
        
        for (const cond of conditions) {
            const dataValue = context.lead?.[cond.field] || context.message?.[cond.field];
            
            switch (cond.operator) {
                case 'equals': if (dataValue !== cond.value) return false; break;
                // Add more ops: contains, gt, lt...
                default: 
                    // Ignore unknown ops for safety
                    break;
            }
        }
        return true;
    }

    async executeAction(rule, context) {
        const handler = actions[rule.action_type];
        if (!handler) {
            log.warn(`[Automation] Unknown action type: ${rule.action_type}`);
            return;
        }

        try {
            await handler(rule.unit_id, rule.action_config, context);
            
            // Log Success
            await supabase.from('automation_logs').insert({
                unit_id: rule.unit_id,
                rule_id: rule.id,
                action_type: rule.action_type,
                status: 'success',
                entity_id: context.lead?.id
            });
        } catch (err) {
            // Log Failure
            await supabase.from('automation_logs').insert({
                unit_id: rule.unit_id,
                rule_id: rule.id,
                action_type: rule.action_type,
                status: 'failed',
                error_message: err.message,
                entity_id: context.lead?.id
            });
        }
    }
}

export const automationEngine = new AutomationEngine();

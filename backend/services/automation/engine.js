import { supabase } from '../supabaseService.js';
import { whatsappService } from './whatsapp/whatsapp.service.js';
import { emitToUnit } from './socketService.js';

export class AutomationEngine {
    
    /**
     * Entry point: Trigger an event
     * @param {string} unitId 
     * @param {string} eventType e.g. 'lead_created', 'message_received'
     * @param {object} payload { lead, message, contact, etc }
     */
    async trigger(unitId, eventType, payload) {
        console.log(`[AutomationEngine] Trigger: ${eventType} for unit ${unitId}`);
        
        try {
            // 1. Fetch active flows catering to this trigger
            const { data: flows, error } = await supabase
                .from('automation_flows')
                .select(`
                    id, name, trigger_config,
                    automation_conditions (*), 
                    automation_actions (*)
                `)
                .eq('unit_id', unitId)
                .eq('trigger_type', eventType)
                .eq('active', true);

            if (error) throw error;
            if (!flows || flows.length === 0) return;

            // 2. Process each flow
            for (const flow of flows) {
                await this.processFlow(flow, payload, unitId);
            }

        } catch (err) {
            console.error('[AutomationEngine] Trigger failed:', err);
        }
    }

    async processFlow(flow, payload, unitId) {
        const executionId = crypto.randomUUID();
        console.log(`[AutomationEngine] Processing flow ${flow.name} (${flow.id})`);

        try {
            // 1. Evaluate Conditions (Guard Clauses)
            const conditionsPassed = this.evaluateConditions(flow.automation_conditions, payload);
            if (!conditionsPassed) {
                console.log(`[AutomationEngine] Conditions failed for flow ${flow.name}`);
                return;
            }

            // 2. Create Execution Log
            await supabase.from('automation_executions').insert({
                id: executionId,
                flow_id: flow.id,
                unit_id: unitId,
                lead_id: payload.lead?.id || payload.contact?.id, // Best effort
                status: 'processing',
                context: payload
            });

            // 3. Execute Actions
            // Sort actions by order
            const actions = flow.automation_actions.sort((a, b) => a.execution_order - b.execution_order);
            
            for (const action of actions) {
                await this.executeAction(action, payload, unitId);
            }

            // 4. Mark Complete
            await supabase.from('automation_executions')
                .update({ status: 'completed', completed_at: new Date() })
                .eq('id', executionId);

        } catch (error) {
            console.error(`[AutomationEngine] Flow execution failed: ${error.message}`);
            // Update Log
            await supabase.from('automation_executions')
                .update({ 
                    status: 'failed', 
                    error_details: error.message,
                    completed_at: new Date() 
                })
                .eq('id', executionId);
        }
    }

    evaluateConditions(conditions, payload) {
        if (!conditions || conditions.length === 0) return true;

        for (const condition of conditions) {
            const actualValue = this.getValueFromPath(payload, condition.field);
            const expectedValue = condition.value; // JSONB

            switch (condition.operator) {
                case 'equals':
                    if (String(actualValue) !== String(expectedValue)) return false;
                    break;
                case 'contains':
                    if (!String(actualValue).includes(String(expectedValue))) return false;
                    break;
                case 'gt':
                    if (Number(actualValue) <= Number(expectedValue)) return false;
                    break;
                case 'lt':
                    if (Number(actualValue) >= Number(expectedValue)) return false;
                    break;
                case 'is_set':
                    if (actualValue === null || actualValue === undefined || actualValue === '') return false;
                    break;
                // Add more operators as needed 'in_list', 'starts_with', etc.
                default: 
                    console.warn(`[AutomationEngine] Unknown operator ${condition.operator}`);
                    return false;
            }
        }
        return true;
    }

    getValueFromPath(obj, path) {
        return path.split('.').reduce((acc, part) => acc && acc[part], obj);
    }

    async executeAction(action, payload, unitId) {
        console.log(`[AutomationEngine] Action: ${action.type}`);
        const config = action.config;

        switch (action.type) {
            case 'send_whatsapp':
                await this.actionSendWhatsapp(config, payload, unitId);
                break;
            case 'add_tag':
                await this.actionAddTag(config, payload, unitId);
                break;
            case 'move_stage':
                await this.actionMoveStage(config, payload, unitId);
                break;
            case 'wait': // Simple sync wait (Not recommended for long times, but okay for MVP milliseconds)
                if (config.delay_seconds) {
                    await new Promise(r => setTimeout(r, config.delay_seconds * 1000));
                }
                break;
            default:
                throw new Error(`Unknown action type: ${action.type}`);
        }
    }

    // --- Action Handlers ---

    async actionSendWhatsapp(config, payload, unitId) {
        const phone = payload.phone || payload.lead?.phone || payload.contact?.phone;
        if (!phone) throw new Error('No phone number available for WhatsApp action');

        // Resolve Variables
        let message = config.message || '';
        message = this.replaceVariables(message, payload);

        // Find connection
        const { data: connection } = await supabase
            .from('unit_whatsapp_connections')
            .select('*')
            .eq('unit_id', unitId)
            .eq('status', 'connected')
            .single();

        if (!connection) throw new Error('No connected WhatsApp instance');

        await whatsappService.sendMessage(
            connection.provider,
            connection.provider_config,
            connection.instance_id,
            phone,
            message,
            unitId
        );
    }

    async actionAddTag(config, payload, unitId) {
        const leadId = payload.lead?.id || payload.id; // Assume payload is lead if id present
        if (!leadId) throw new Error('No Lead ID for Add Tag action');

        const { data: lead } = await supabase.from('leads').select('tags').eq('id', leadId).single();
        const currentTags = lead?.tags || [];
        const newTag = config.tag;

        if (!currentTags.includes(newTag)) {
            const updatedTags = [...currentTags, newTag];
            await supabase.from('leads').update({ tags: updatedTags }).eq('id', leadId);
            emitToUnit(unitId, 'lead_updated', { id: leadId, tags: updatedTags });
        }
    }

    async actionMoveStage(config, payload, unitId) {
        const leadId = payload.lead?.id || payload.id;
        if (!leadId) throw new Error('No Lead ID for Move Stage action');

        await supabase.from('leads').update({ status: config.stage }).eq('id', leadId);
        emitToUnit(unitId, 'lead_updated', { id: leadId, status: config.stage });
    }

    replaceVariables(template, context) {
        return template.replace(/{{(.*?)}}/g, (match, path) => {
            const val = this.getValueFromPath(context, path.trim());
            return val !== undefined ? val : match;
        });
    }
}

export const automationEngine = new AutomationEngine();

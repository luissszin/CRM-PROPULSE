import { supabase } from './supabaseService.js';
import { whatsappService as unifiedService } from './whatsapp/whatsapp.service.js';
import { emitToUnit } from './socketService.js';


/**
 * Trigger an automation flow based on an event
 * @param {string} unitId - The unit ID
 * @param {string} triggerType - The type of trigger (new_lead, stage_change, etc)
 * @param {object} context - Context data (lead, message, etc)
 */
export async function triggerAutomation(unitId, triggerType, context) {
    try {
        console.log(`[Automation] Triggering ${triggerType} for unit ${unitId}`);

        // 1. Get active flows for this trigger and unit
        const { data: flows, error } = await supabase
            .from('automation_flows')
            .select('*')
            .eq('unit_id', unitId)
            .eq('trigger_type', triggerType)
            .eq('active', true);

        if (error) throw error;
        if (!flows || flows.length === 0) return;

        for (const flow of flows) {
            // 2. Filter by config if needed (e.g., stage matches)
            if (flow.trigger_config && Object.keys(flow.trigger_config).length > 0) {
                let matches = true;
                for (const [key, value] of Object.entries(flow.trigger_config)) {
                    if (context[key] !== value) {
                        matches = false;
                        break;
                    }
                }
                if (!matches) continue;
            }

            console.log(`[Automation] Executing flow: ${flow.name}`);
            await executeFlow(flow, context);
        }
    } catch (error) {
        console.error('[Automation] Trigger Error:', error);
    }
}

async function executeFlow(flow, context) {
    const { actions } = flow;
    if (!actions || !Array.isArray(actions)) return;

    for (const action of actions) {
        try {
            console.log(`[Automation] Executing action: ${action.type}`);

            switch (action.type) {
                case 'send_whatsapp':
                    await handleSendWhatsapp(flow, action, context);
                    break;
                case 'add_tag':
                    await handleAddTag(flow, action, context);
                    break;
                case 'change_stage':
                    await handleChangeStage(flow, action, context);
                    break;
                default:
                    console.warn(`[Automation] Unknown action type: ${action.type}`);
            }

            // Log success
            await logAutomation(flow, context, 'success');
        } catch (error) {
            console.error(`[Automation] Action ${action.type} failed:`, error);
            await logAutomation(flow, context, 'error', error.message);
        }
    }
}

async function handleSendWhatsapp(flow, action, context) {
    const phone = context.phone || context.lead?.phone;
    const unitId = flow.unit_id;

    if (!phone) throw new Error('No phone number found in context');

    // Find a connected instance for this unit (USANDO A NOVA TABELA)
    const { data: connection } = await supabase
        .from('unit_whatsapp_connections')
        .select('*')
        .eq('unit_id', unitId)
        .eq('status', 'connected')
        .limit(1)
        .single();

    if (!connection) throw new Error('No connected WhatsApp instance found');

    // Process message template with deep variable replacement
    let message = action.message || '';
    const variableRegex = /{{(.*?)}}/g;

    message = message.replace(variableRegex, (match, path) => {
        const parts = path.trim().split('.');
        let current = context;
        for (const part of parts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            } else {
                return match; // Keep unresolved variables
            }
        }
        return current ?? '';
    });

    // Fallback for legacy simple variables
    message = message.replace(/{{name}}/g, context.lead?.name || context.name || '');

    // USANDO O NOVO SERVIÇO UNIFICADO
    await unifiedService.sendMessage(
        connection.provider,
        connection.provider_config,
        connection.instance_id,
        phone,
        message,
        unitId
    );
}


async function handleAddTag(flow, action, context) {
    const leadId = context.lead?.id || context.id;
    if (!leadId) throw new Error('No lead ID found in context');

    const { data: currentLead } = await supabase
        .from('leads')
        .select('tags')
        .eq('id', leadId)
        .single();

    const tags = currentLead?.tags || [];
    if (!tags.includes(action.tag)) {
        await supabase
            .from('leads')
            .update({ tags: [...tags, action.tag] })
            .eq('id', leadId);

        // Notify frontend via socket
        emitToUnit(flow.unit_id, 'lead_updated', { id: leadId, tags: [...tags, action.tag] });
    }
}

async function handleChangeStage(flow, action, context) {
    const leadId = context.lead?.id || context.id;
    if (!leadId) throw new Error('No lead ID found in context');

    await supabase
        .from('leads')
        .update({ status: action.stage })
        .eq('id', leadId);

    emitToUnit(flow.unit_id, 'lead_updated', { id: leadId, status: action.stage });
}

async function logAutomation(flow, context, status, errorMessage) {
    await supabase.from('automation_logs').insert({
        flow_id: flow.id,
        lead_id: context.lead?.id || context.id || null,
        unit_id: flow.unit_id,
        status,
        error_message: errorMessage
    });
}

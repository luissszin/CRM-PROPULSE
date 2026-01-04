import { supabase } from '../../supabaseService.js';
import { whatsappService } from '../whatsapp/whatsapp.service.js';
import { log } from '../../../utils/logger.js';

/**
 * Automation Actions Implementation
 */
export const actions = {
    /**
     * Send WhatsApp Message
     */
    async send_message(unitId, payload, context) {
        if (!payload.message || !context.lead?.phone) return;

        try {
            // Find active connection
            const { data: conn } = await supabase
                .from('unit_whatsapp_connections')
                .select('*')
                .eq('unit_id', unitId)
                .eq('status', 'connected')
                .single();

            if (!conn) {
                log.warn(`[Automation] No active WhatsApp for unit ${unitId}`);
                return;
            }

            await whatsappService.sendMessage(
                conn.provider,
                conn.provider_config,
                conn.instance_id,
                context.lead.phone,
                payload.message,
                unitId
            );
            
            log.info(`[Automation] Message sent to ${context.lead.phone}`);
        } catch (err) {
            log.error('[Automation] send_message failed', err);
            throw err;
        }
    },

    /**
     * Change Lead Stage
     */
    async change_stage(unitId, payload, context) {
        if (!payload.status || !context.lead?.id) return;
        
        await supabase
            .from('leads')
            .update({ status: payload.status })
            .eq('id', context.lead.id);
            
        log.info(`[Automation] Lead ${context.lead.id} moved to ${payload.status}`);
    },

    /**
     * Assign Agent
     */
    async assign_agent(unitId, payload, context) {
        // TODO: Round robin or specific agent logic
        log.info('[Automation] Assign agent not fully implemented yet');
    }
};

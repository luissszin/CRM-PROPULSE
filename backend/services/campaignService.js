import { supabase } from './supabaseService.js';
import { whatsappService } from './whatsapp/whatsapp.service.js';
import { log } from '../utils/logger.js';

class CampaignService {

    /**
     * Create a new campaign and recipients
     * @param {string} unitId 
     * @param {object} data { name, content, scheduledAt, contactIds }
     */
    async create(unitId, data) {
        const { name, content, scheduledAt, contactIds } = data;

        // 1. Create Campaign
        const { data: campaign, error: campError } = await supabase
            .from('campaigns')
            .insert({
                unit_id: unitId,
                name,
                content,
                scheduled_at: scheduledAt || new Date(),
                status: 'draft'
            })
            .select()
            .single();

        if (campError) throw campError;

        // 2. Add Recipients
        if (contactIds && contactIds.length > 0) {
            const recipients = contactIds.map(contactId => ({
                campaign_id: campaign.id,
                contact_id: contactId,
                status: 'pending'
            }));

            const { error: recipError } = await supabase
                .from('campaign_recipients')
                .insert(recipients);

            if (recipError) throw recipError;
        }

        return campaign;
    }

    /**
     * Dispatch the campaign (Simple Batch Worker)
     * @param {string} campaignId 
     */
    async dispatch(campaignId) {
        log.info(`[Campaign] Starting dispatch for ${campaignId}`);

        // 1. Get Campaign & Unit
        const { data: campaign } = await supabase
            .from('campaigns')
            .select('*, unit_whatsapp_connections(*)')
            .eq('id', campaignId)
            .single();
            
        if (!campaign) throw new Error('Campaign not found');

        // Check Connection
        // Since unit_whatsapp_connections is joined (one-to-many potentially, but distinct logic needed)
        // Let's query connection separately to be safe/clean
        const { data: connection } = await supabase
            .from('unit_whatsapp_connections')
            .select('*')
            .eq('unit_id', campaign.unit_id)
            .eq('status', 'connected')
            .single();

        if (!connection) {
            await supabase.from('campaigns').update({ status: 'failed', error: 'No WhatsApp connection' }).eq('id', campaignId);
            throw new Error('No active WhatsApp connection for this unit');
        }

        await supabase.from('campaigns').update({ status: 'processing' }).eq('id', campaignId);

        // 2. Fetch Pending Recipients
        const { data: recipients } = await supabase
            .from('campaign_recipients')
            .select('*, contacts(phone)')
            .eq('campaign_id', campaignId)
            .eq('status', 'pending');

        log.info(`[Campaign] Found ${recipients.length} pending recipients`);

        // 3. Loop & Send (Rate Limited)
        let successCount = 0;
        let failCount = 0;

        for (const recipient of recipients) {
            try {
                const phone = recipient.contacts?.phone;
                if (!phone) {
                    throw new Error('Contact has no phone');
                }

                // Send Message
                const result = await whatsappService.sendMessage(
                    connection.provider,
                    connection.provider_config,
                    connection.instance_id,
                    phone,
                    campaign.content,
                    campaign.unit_id
                );

                // Update Recipient
                await supabase.from('campaign_recipients').update({
                    status: 'sent',
                    sent_at: new Date(),
                    message_id: null // We could store result.id if we map it back to internal message id
                }).eq('id', recipient.id);

                successCount++;

                // Rate Limit Delay (2 seconds)
                await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (error) {
                console.error(`[Campaign] Failed for recipient ${recipient.id}:`, error.message);
                await supabase.from('campaign_recipients').update({
                    status: 'failed',
                    error_message: error.message
                }).eq('id', recipient.id);
                failCount++;
            }
        }

        // 4. Update Campaign Status
        const finalStatus = failCount === recipients.length && recipients.length > 0 ? 'failed' : 'completed';
        await supabase.from('campaigns').update({
            status: finalStatus,
            completed_at: new Date()
        }).eq('id', campaignId);

        log.info(`[Campaign] Finished dispatch. Success: ${successCount}, Failed: ${failCount}`);
        
        return { success: successCount, failed: failCount };
    }
}

export const campaignService = new CampaignService();

// WhatsApp API Routes
import express from 'express';
import { supabase } from '../services/supabaseService.js';
import * as whatsapp from '../services/whatsappService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /whatsapp/instances - List all WhatsApp instances for a unit
router.get('/instances', async (req, res) => {
    try {
        const { unitId } = req.query;
        if (!unitId) return res.status(400).json({ error: 'unitId required' });

        const { data, error } = await supabase
            .from('whatsapp_instances')
            .select('*')
            .eq('unit_id', unitId);

        if (error) throw error;
        return res.json(data);
    } catch (e) {
        console.error('Error fetching instances:', e.message);
        return res.status(500).json({ error: e.message });
    }
});

// POST /whatsapp/instances - Create new WhatsApp instance
router.post('/instances', async (req, res) => {
    try {
        const { unitId, instanceName } = req.body;
        if (!unitId || !instanceName) {
            return res.status(400).json({ error: 'unitId and instanceName required' });
        }

        // Create instance in Evolution API (or placeholder for Meta)
        let evolutionResponse = {};
        const provider = req.body.provider || 'evolution';
        const providerConfig = req.body.config || {};

        if (provider === 'evolution') {
            evolutionResponse = await whatsapp.createInstance(instanceName, providerConfig.apiKey, providerConfig.apiUrl);
        }

        // Save to database
        const { data, error } = await supabase
            .from('whatsapp_instances')
            .insert({
                unit_id: unitId,
                instanceName,
                status: (provider === 'meta' || provider === 'zapi') ? 'connected' : 'disconnected',
                provider,
                provider_config: (provider === 'meta' || provider === 'zapi') ? providerConfig : {
                    apiUrl: providerConfig.apiUrl || process.env.EVOLUTION_API_BASE_URL,
                    apiKey: evolutionResponse.token || providerConfig.apiKey || process.env.EVOLUTION_API_KEY,
                    instanceName: instanceName
                },
                apiUrl: providerConfig.apiUrl || process.env.EVOLUTION_API_BASE_URL || 'http://localhost:8080',
                apiKey: evolutionResponse.token || providerConfig.apiKey || process.env.EVOLUTION_API_KEY,
            })
            .select()
            .single();

        if (error) throw error;
        return res.json(data);
    } catch (e) {
        console.error('Error creating instance:', e.message);
        return res.status(500).json({ error: e.message });
    }
});

// POST /whatsapp/instances/:id/connect - Get QR code and connect
router.post('/instances/:id/connect', async (req, res) => {
    try {
        const { id } = req.params;

        // Get instance from DB
        const { data: instance, error: fetchError } = await supabase
            .from('whatsapp_instances')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !instance) {
            return res.status(404).json({ error: 'Instance not found' });
        }

        if (instance.provider === 'meta') {
            return res.json({ message: 'Meta Cloud API does not require QR code connection.' });
        }

        const config = instance.provider_config || {
            instanceName: instance.instance_name,
            apiKey: instance.provider_config?.apiKey,
            apiUrl: instance.provider_config?.apiUrl
        };

        // Connect instance (get QR code)
        const connectionData = await whatsapp.connectInstance(config.instanceName, config.apiKey, config.apiUrl);

        // Update status
        await supabase
            .from('whatsapp_instances')
            .update({
                status: 'connecting',
                qrcode: connectionData.qrcode?.base64 || connectionData.qrcode,
            })
            .eq('id', id);

        return res.json(connectionData);
    } catch (e) {
        console.error('Error connecting instance:', e.message);
        return res.status(500).json({ error: e.message });
    }
});

// GET /whatsapp/instances/:id/status - Get instance status
router.get('/instances/:id/status', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: instance, error } = await supabase
            .from('whatsapp_instances')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !instance) {
            return res.status(404).json({ error: 'Instance not found' });
        }

        if (instance.provider === 'meta') {
            return res.json({ state: 'open', status: 'connected' });
        }

        const config = instance.provider_config || {
            instanceName: instance.instancename,
            apiKey: instance.apikey,
            apiUrl: instance.apiurl
        };

        const status = await whatsapp.getInstanceStatus(config.instanceName, config.apiKey, config.apiUrl);

        // Update DB with latest status
        const newStatus = status.state === 'open' ? 'connected' : 'disconnected';
        await supabase
            .from('whatsapp_instances')
            .update({ status: newStatus, phone: status.phone })
            .eq('id', id);

        return res.json(status);
    } catch (e) {
        console.error('Error getting status:', e.message);
        return res.status(500).json({ error: e.message });
    }
});

// POST /whatsapp/send - Send message
router.post('/send', async (req, res) => {
    try {
        const { instanceId, phone, message, mediaUrl, mediaType } = req.body;

        if (!instanceId || !phone || (!message && !mediaUrl)) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Get instance
        const { data: instance, error } = await supabase
            .from('whatsapp_instances')
            .select('*')
            .eq('id', instanceId)
            .single();

        if (error || !instance) {
            return res.status(404).json({ error: 'Instance not found' });
        }

        const provider = instance.provider || 'evolution';
        const config = instance.provider_config || {
            instanceName: instance.instancename,
            apiKey: instance.apikey,
            apiUrl: instance.apiurl
        };

        let result;
        if (mediaUrl) {
            result = await whatsapp.sendMediaMessage(
                provider,
                config,
                phone,
                mediaUrl,
                message,
                mediaType
            );
        } else {
            result = await whatsapp.sendTextMessage(
                provider,
                config,
                phone,
                message
            );
        }

        // Save message to database
        // Find or create conversation
        let conversation = await supabase
            .from('conversations')
            .select('*')
            .eq('instance_id', instanceId)
            .eq('external_id', phone)
            .single();

        if (!conversation.data) {
            // Create new conversation
            const { data: newConv } = await supabase
                .from('conversations')
                .insert({
                    instance_id: instanceId,
                    external_id: phone,
                    contact_id: null, // Will be linked later
                    status: 'open',
                })
                .select()
                .single();
            conversation = { data: newConv };
        }

        // Save message
        await supabase.from('messages').insert({
            conversation_id: conversation.data.id,
            sender: 'agent',
            content: message,
            external_id: result.key?.id,
            media_url: mediaUrl,
            media_type: mediaType,
            status: 'sent',
        });

        return res.json(result);
    } catch (e) {
        console.error('Error sending message:', e.message);
        return res.status(500).json({ error: e.message });
    }
});

// DELETE /whatsapp/instances/:id/disconnect - Disconnect instance
router.delete('/instances/:id/disconnect', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: instance, error } = await supabase
            .from('whatsapp_instances')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !instance) {
            return res.status(404).json({ error: 'Instance not found' });
        }

        await whatsapp.disconnectInstance(instance.instancename, instance.apikey);

        await supabase
            .from('whatsapp_instances')
            .update({ status: 'disconnected', qrcode: null })
            .eq('id', id);

        return res.json({ success: true });
    } catch (e) {
        console.error('Error disconnecting:', e.message);
        return res.status(500).json({ error: e.message });
    }
});

export default router;

import axios from 'axios';
import { log } from '../../../utils/logger.js';

class EvolutionProvider {
    constructor(config) {
        this.baseUrl = config.apiUrl || process.env.EVOLUTION_API_BASE_URL || 'http://localhost:8080';
        this.apiKey = config.apiKey || process.env.EVOLUTION_API_KEY;
        this.headers = {
            'Content-Type': 'application/json',
            'apikey': this.apiKey
        };
    }

    async createInstance(instanceName) {
        try {
            // Check if exists first
            try {
                await axios.get(`${this.baseUrl}/instance/connectionState/${instanceName}`, { headers: this.headers });
                // If logic reaches here, instance might exist.
            } catch (e) {
                // If 404, we create.
            }

            const response = await axios.post(`${this.baseUrl}/instance/create`, {
                instanceName,
                token: this.apiKey, // Token used for webhook auth mainly
                qrcode: true,
                integration: 'WHATSAPP-BAILEYS' // Default
            }, { headers: this.headers });

            return {
                instanceId: instanceName,
                qrcode: response.data.qrcode?.base64 || response.data.qrcode,
                status: response.data.instance?.status || 'connecting'
            };
        } catch (error) {
            log.error(`[Evolution] Create Instance Error:`, error.response?.data || error.message);
            throw new Error('Failed to create Evolution instance');
        }
    }

    async connect(instanceName) {
        try {
           const response = await axios.get(`${this.baseUrl}/instance/connect/${instanceName}`, { headers: this.headers });
           return {
               qrcode: response.data.qrcode?.base64 || response.data.qrcode || response.data.base64, // handle variations
               code: response.data.code
           };
        } catch (error) {
            log.error(`[Evolution] Connect Error:`, error.response?.data || error.message);
            throw new Error('Failed to connect Evolution instance');
        }
    }

    async disconnect(instanceName) {
        try {
            await axios.delete(`${this.baseUrl}/instance/delete/${instanceName}`, { headers: this.headers });
            return true;
        } catch (error) {
            // Ignore 404
            if (error.response?.status === 404) return true;
            log.error(`[Evolution] Disconnect Error:`, error.response?.data || error.message);
            throw error;
        }
    }

    async getStatus(instanceName) {
        try {
            const response = await axios.get(`${this.baseUrl}/instance/connectionState/${instanceName}`, { headers: this.headers });
            // Evolution returns: { instance: { state: 'open' | 'close' | 'connecting' } }
            const state = response.data.instance?.state || response.data.state;
            
            let status = 'disconnected';
            if (state === 'open') status = 'connected';
            if (state === 'connecting') status = 'connecting';

            return {
                status,
                phone: response.data.instance?.ownerJid?.split('@')[0] || null,
                pushName: response.data.instance?.profileName
            };
        } catch (error) {
            if (error.response?.status === 404) return { status: 'disconnected' };
            log.warn(`[Evolution] GetStatus Error:`, error.message);
            return { status: 'error', error: error.message };
        }
    }

    async sendMessage(instanceName, phone, content) {
        try {
            // Formatting phone for Evolution (numbers only)
            const number = phone.replace(/\D/g, '');
            const body = {
                number,
                text: content, // Evolution v2 uses 'text', v1 might use 'message'
                options: {
                    delay: 1200,
                    presence: 'composing'
                }
            };
            
            const response = await axios.post(`${this.baseUrl}/message/sendText/${instanceName}`, body, { headers: this.headers });
            return {
                id: response.data.key?.id,
                timestamp: response.data.messageTimestamp
            };
        } catch (error) {
            log.error(`[Evolution] SendMessage Error:`, error.response?.data || error.message);
            throw error;
        }
    }
}

export default EvolutionProvider;

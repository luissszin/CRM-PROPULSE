import axios from 'axios';
import { log } from '../../../utils/logger.js';

class EvolutionProvider {
    constructor(config) {
        let baseUrl = config.apiUrl || process.env.EVOLUTION_API_BASE_URL || 'http://localhost:8085';
        // Remove trailing slash
        if (baseUrl.endsWith('/')) {
            baseUrl = baseUrl.slice(0, -1);
        }
        this.baseUrl = baseUrl;
        this.apiKey = config.apiKey || process.env.EVOLUTION_API_KEY;
        this.client = axios.create({
            baseURL: this.baseUrl,
            timeout: 15000, // 15s timeout
            headers: {
                'Content-Type': 'application/json',
                'apikey': this.apiKey
            }
        });
    }


    async createInstance(instanceName) {
        try {
            // Check if exists first
            try {
                const check = await this.client.get(`/instance/connectionState/${encodeURIComponent(instanceName)}`);
                if (check.data) {
                    const statusData = await this.getStatus(instanceName);
                    if (statusData.status === 'connected') {
                         return { instanceId: instanceName, status: statusData.status };
                    }
                    
                    // Not connected, try to reconnect
                    try {
                        const connectData = await this.connect(instanceName);
                        if (connectData.qrcode) {
                            return { 
                                instanceId: instanceName, 
                                status: 'connecting', 
                                qrcode: connectData.qrcode 
                            };
                        }
                        // If connect succeeded but no QR code, it might be weird state. 
                        // Let's treat it as failure and recreate to be safe.
                        throw new Error('No QR code returned from connect');
                    } catch (connErr) {
                        log.warn(`[Evolution] Existing instance connection attempt failed: ${connErr.message}. Deleting and recreating...`);
                        await this.disconnect(instanceName);
                        // Fall through to create new instance logic
                    }
                }
            } catch (e) {
                // Proceed to create if not found
            }

            // Generate a unique token for this specific instance if not provided
            const instanceToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

            const response = await this.client.post(`/instance/create`, {
                instanceName,
                token: instanceToken,
                qrcode: true,
                integration: 'WHATSAPP-BAILEYS'
            });

            const qr = response.data.qrcode?.base64 || response.data.qrcode || response.data.base64;
            let rawStatus = response.data.instance?.status || 'connecting';
            
            // Normalize status for DB
            let status = rawStatus;
            if (rawStatus === 'created') status = 'connecting';
            if (rawStatus === 'open') status = 'connected';
            if (rawStatus === 'close') status = 'disconnected';

            console.log(`[Evolution] Create result for ${instanceName}: raw=${rawStatus}, mapped=${status}, hasQR=${!!qr}`);

            return {
                instanceId: instanceName,
                qrcode: qr,
                status: status
            };


        } catch (error) {
            const errorMsg = error.response?.data || error.message;
            log.error(`[Evolution] Create Instance Error:`, errorMsg);
            throw new Error(`Failed to create Evolution instance: ${JSON.stringify(errorMsg)}`);
        }
    }


    async connect(instanceName) {
        try {
           const response = await this.client.get(`/instance/connect/${encodeURIComponent(instanceName)}`);
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
            await this.client.delete(`/instance/delete/${encodeURIComponent(instanceName)}`);
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
            const response = await this.client.get(`/instance/connectionState/${encodeURIComponent(instanceName)}`);
            // Evolution returns: { instance: { state: 'open' | 'close' | 'connecting' } }
            const state = response.data.instance?.state || response.data.state || response.data.instance?.status || response.data.status;

            
            let status = 'disconnected';
            if (state === 'open') status = 'connected';
            if (state === 'connecting') status = 'connecting';
            if (state === 'created') status = 'connecting';


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
                text: content,
                options: {
                    delay: 1200,
                    presence: 'composing'
                }
            };
            
            const response = await this.client.post(`/message/sendText/${encodeURIComponent(instanceName)}`, body);
            return {
                id: response.data.key?.id,
                timestamp: response.data.messageTimestamp
            };
        } catch (error) {
            log.error(`[Evolution] SendMessage Error:`, error.response?.data || error.message);
            throw error;
        }
    }



    async sendMediaMessage(instanceName, phone, mediaUrl, caption, mediaType) {
        try {
            const number = phone.replace(/\D/g, '');
            const body = {
                number,
                mediaMessage: {
                    url: mediaUrl,
                    caption: caption || '',
                },
                options: {
                    delay: 1200,
                    presence: 'composing'
                }
            };
            
            // Map mediaType to Evolution endpoint if necessary, but sendMedia usually handles it
            const response = await this.client.post(`/message/sendMedia/${encodeURIComponent(instanceName)}`, body);
            return {
                id: response.data.key?.id,
                timestamp: response.data.messageTimestamp
            };
        } catch (error) {
            log.error(`[Evolution] Send Media Error:`, error.response?.data || error.message);
            throw error;
        }
    }


}

export default EvolutionProvider;


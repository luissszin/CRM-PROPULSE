import { log } from '../../../utils/logger.js';
import axios from 'axios';

class MetaProvider {
    constructor(config) {
        this.phoneNumberId = config.phoneNumberId;
        this.accessToken = config.accessToken;
        this.wabaId = config.wabaId;
        this.baseUrl = 'https://graph.facebook.com/v18.0';
    }

    async createInstance(instanceName) {
        return {
            instanceId: this.phoneNumberId,
            status: 'connected',
            qrcode: null
        };
    }

    async connect() {
        return { qrcode: null, status: 'connected' };
    }

    async disconnect() {
        return true;
    }

    async getStatus() {
        return {
            status: 'connected',
            phone: null,
        };
    }

    async sendMessage(instanceName, phone, content) {
        try {
            const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;
            const response = await axios.post(url, {
                messaging_product: 'whatsapp',
                to: phone,
                type: 'text',
                text: { body: content }
            }, {
                headers: { 'Authorization': `Bearer ${this.accessToken}` }
            });
            
            return { id: response.data.messages?.[0]?.id };
        } catch (error) {
            log.error('[Meta] Send Error:', error.response?.data || error.message);
            throw error;
        }
    }

    async sendMediaMessage(instanceName, phone, mediaUrl, caption, mediaType) {
        try {
            const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;
            const type = mediaType === 'image' ? 'image' : (mediaType === 'video' ? 'video' : 'document');
            
            const payload = {
                messaging_product: 'whatsapp',
                to: phone,
                type: type,
                [type]: {
                    link: mediaUrl,
                    ...(caption && { caption })
                }
            };

            const response = await axios.post(url, payload, {
                headers: { 'Authorization': `Bearer ${this.accessToken}` }
            });
            
            return { id: response.data.messages?.[0]?.id };
        } catch (error) {
            log.error('[Meta] Send Media Error:', error.response?.data || error.message);
            throw error;
        }
    }
}

export default MetaProvider;


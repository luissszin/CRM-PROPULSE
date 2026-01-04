import { log } from '../../../utils/logger.js';
import axios from 'axios';

class ZapiProvider {
    constructor(config) {
        this.instanceId = config.instanceId;
        this.token = config.token;
        this.clientToken = config.clientToken;
        this.baseUrl = process.env.ZAPI_BASE_URL || 'https://api.z-api.io';
    }

    async createInstance() {
        // Z-API instances are usually created in their panel, or this verifies them.
        return {
            instanceId: this.instanceId,
            status: 'disconnected', 
            qrcode: null
        };
    }

    async connect() {
        // Get QR Code
        try {
            const url = `${this.baseUrl}/instances/${this.instanceId}/token/${this.token}/qr-code/image`;
            const response = await axios.get(url, {
                headers: { 'Client-Token': this.clientToken }
            });
            return {
                qrcode: response.data.value, // Base64
                status: 'waiting_qr'
            };
        } catch (error) {
            log.error('[Z-API] Connect Error', error);
            throw error;
        }
    }

    async disconnect() {
         try {
            const url = `${this.baseUrl}/instances/${this.instanceId}/token/${this.token}/disconnect`;
            await axios.get(url, { headers: { 'Client-Token': this.clientToken } });
            return true;
        } catch (error) {
            return false;
        }
    }

    async getStatus() {
         try {
            const url = `${this.baseUrl}/instances/${this.instanceId}/token/${this.token}/status`;
            const response = await axios.get(url, { headers: { 'Client-Token': this.clientToken } });
            // { connected: true, ... }
            return {
                status: response.data.connected ? 'connected' : 'disconnected',
                phone: null
            };
        } catch (error) {
            return { status: 'error' };
        }
    }

    async sendMessage(instanceName, phone, content) {
        try {
             const url = `${this.baseUrl}/instances/${this.instanceId}/token/${this.token}/send-text`;
             const response = await axios.post(url, {
                 phone,
                 message: content
             }, { headers: { 'Client-Token': this.clientToken } });
             return { id: response.data.messageId };
        } catch (error) {
             log.error('[Z-API] Send Error', error);
             throw error;
        }
    }
}

export default ZapiProvider;

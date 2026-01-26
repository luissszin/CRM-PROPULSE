import EvolutionProvider from './providers/evolution.provider.js';
import MetaProvider from './providers/meta.provider.js';
import ZapiProvider from './providers/zapi.provider.js';
import { metrics } from '../metricsService.js';

export class WhatsappService {
    
    constructor() {
        this.cache = new Map(); // Simple in-memory cache for providers if needed, though we reinstantiate cheap light classes.
    }

    /**
     * Factory to get the correct provider implementation based on type
     * @param {string} type 'evolution' | 'meta' | 'zapi'
     * @param {object} config 
     */
    getProvider(type, config) {
        switch (type?.toLowerCase()) {
            case 'meta':
                return new MetaProvider(config);
            case 'zapi':
                return new ZapiProvider(config);
            case 'evolution':
            default:
                return new EvolutionProvider(config);
        }
    }

    /**
     * Create/Register an instance in the remote provider
     */
    async createInstance(providerType, config, instanceName, webhookConfig) {
        const provider = this.getProvider(providerType, config);
        return await provider.createInstance(instanceName, webhookConfig);
    }

    /**
     * Request connection (QR Code)
     */
    async connect(providerType, config, instanceName) {
        const provider = this.getProvider(providerType, config);
        return await provider.connect(instanceName);
    }

    /**
     * Disconnect/Logout
     */
    async disconnect(providerType, config, instanceName) {
        const provider = this.getProvider(providerType, config);
        return await provider.disconnect(instanceName);
    }

    /**
     * Get Real-time Status
     */
    async getStatus(providerType, config, instanceName) {
        const provider = this.getProvider(providerType, config);
        return await provider.getStatus(instanceName);
    }

    /**
     * Send Message
     */
    async sendMessage(providerType, config, instanceName, phone, content, unitId) {
         const provider = this.getProvider(providerType, config);
         try {
             // Basic Circuit Breaker/Rate Limit check could go here
             const result = await provider.sendMessage(instanceName, phone, content);
             if (unitId) metrics.increment(unitId, 'messages_sent');
             return result;
         } catch (error) {
             if (unitId) metrics.increment(unitId, 'messages_failed');
             throw error;
         }
    }

    /**
     * Send Media Message
     */
    async sendMediaMessage(providerType, config, instanceName, phone, mediaUrl, caption, mediaType, unitId) {
        const provider = this.getProvider(providerType, config);
        try {
            const result = await provider.sendMediaMessage(instanceName, phone, mediaUrl, caption, mediaType);
            if (unitId) metrics.increment(unitId, 'messages_sent');
            return result;
        } catch (error) {
            if (unitId) metrics.increment(unitId, 'messages_failed');
            throw error;
        }
    }
}

export const whatsappService = new WhatsappService();


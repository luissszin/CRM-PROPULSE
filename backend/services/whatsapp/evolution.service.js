import { supabase } from '../supabaseService.js';
import { log } from '../../utils/logger.js';
import crypto from 'crypto';

// Evolution API Configuration
const EVO_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVO_API_KEY = process.env.EVOLUTION_API_KEY;

/**
 * Service to interact with Evolution API v2
 */
class EvolutionService {
    
    constructor() {
        if (!EVO_API_KEY) {
            log.warn('[EvolutionService] EVOLUTION_API_KEY is not set!');
        }
    }

    _getInstanceName(unitId) {
        return `unit_${unitId}`;
    }

    async _request(method, endpoint, body = null) {
        const url = `${EVO_API_URL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            'apikey': EVO_API_KEY
        };

        try {
            const options = { method, headers };
            if (body) options.body = JSON.stringify(body);
            
            const response = await fetch(url, options);
            const data = await response.json();
            
            if (!response.ok) {
                // If instance not found, we might want to return null or throw specific error
                log.error(`[EvolutionService] Request failed: ${method} ${url} - ${response.status}`, data);
                throw new Error(data.message || 'Evolution API Error');
            }
            
            return data;
        } catch (error) {
            log.error(`[EvolutionService] Error: ${method} ${url}`, error);
            throw error;
        }
    }

    /**
     * Creates a new instance for the unit if it doesn't exist
     */
    async createInstance(unitId) {
        const instanceName = this._getInstanceName(unitId);
        
        // 1. Check if instance exists (optional, create usually handles duplication or we check error)
        try {
            // Create Instance
            // POST /instance/create
            const payload = {
                instanceName: instanceName,
                token: crypto.randomUUID(), // Internal token for the instance
                qrcode: true,
                webhook: process.env.BASE_URL ? `${process.env.BASE_URL}/webhooks/whatsapp/evolution/${process.env.WEBHOOK_SECRET || 'default-secret'}` : undefined,
                events: [
                    "QRCODE_UPDATED",
                    "MESSAGES_UPSERT",
                    "MESSAGES_UPDATE",
                    "MESSAGES_DELETE",
                    "SEND_MESSAGE",
                    "CONNECTION_UPDATE",
                    "TYPEBOT_START",
                    "TYPEBOT_CHANGE_STATUS"
                ]
            };
            
            const result = await this._request('POST', '/instance/create', payload);
            return result;
        } catch (error) {
            if (error.message && error.message.includes('already exists')) {
                 return { instance: { instanceName } }; // Treat as success
            }
            throw error;
        }
    }

    /**
     * Connects the instance (Gets QR Code)
     */
    async connect(unitId) {
        const instanceName = this._getInstanceName(unitId);
        // POST /instance/connect/:instance
        return await this._request('GET', `/instance/connect/${instanceName}`);
    }
    
    /**
     * Get Connection State
     */
    async getConnectionState(unitId) {
        const instanceName = this._getInstanceName(unitId);
        // GET /instance/connectionState/:instance
        return await this._request('GET', `/instance/connectionState/${instanceName}`);
    }

    /**
     * Send Text Message
     */
    async sendTextMessage(unitId, phone, text) {
        const instanceName = this._getInstanceName(unitId);
        
        const payload = {
            number: phone,
            options: {
                delay: 1200,
                presence: "composing",
                linkPreview: false
            },
            textMessage: {
                text: text
            }
        };
        
        // POST /message/sendText/:instance
        return await this._request('POST', `/message/sendText/${instanceName}`, payload);
    }
}

export const evolutionService = new EvolutionService();

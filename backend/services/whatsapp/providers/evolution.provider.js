import axios from 'axios';
import { log } from '../../../utils/logger.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DEBUG_FILE = path.join(process.cwd(), 'evolution_debug.log');
function debugLog(msg, data) {
    const entry = `[${new Date().toISOString()}] ${msg} ${data ? JSON.stringify(data, null, 2) : ''}\n`;
    fs.appendFileSync(DEBUG_FILE, entry);
}

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
            // Use stable instance name for Unit mapping
            const uniqueInstanceName = instanceName;
            debugLog(`Creating instance: ${uniqueInstanceName}`);

            // Generate a unique token for this specific instance if needed, or use a consistent one
            // Using random token is fine as long as we save it if needed, but here we just create
            const instanceToken = crypto.randomUUID(); 

            try {
                const createResponse = await this.client.post(`/instance/create`, {
                    instanceName: uniqueInstanceName,
                    token: instanceToken,
                    qrcode: true,
                    integration: 'WHATSAPP-BAILEYS',
                    webhook: process.env.BASE_URL ? `${process.env.BASE_URL}/webhooks/whatsapp/evolution/${process.env.WEBHOOK_SECRET || 'default-secret'}` : undefined,
                     events: [
                        "QRCODE_UPDATED",
                        "MESSAGES_UPSERT",
                        "CONNECTION_UPDATE"
                    ]
                });
                debugLog(`Instance created response:`, createResponse.data);
            } catch (createError) {
                // If instance already exists, we consider it a success and proceed to connect configuration
                if (createError.response?.data?.message?.includes('already exists') || createError.response?.status === 403) {
                     debugLog(`Instance ${uniqueInstanceName} already exists, proceeding.`);
                } else {
                    throw createError;
                }
            }
            
            // Set basic settings
            try {
                await this.client.post(`/settings/set/${encodeURIComponent(uniqueInstanceName)}`, {
                    rejectCall: false,
                    msgCall: "",
                    groupsIgnore: false,
                    alwaysOnline: false,
                    readMessages: false,
                    readStatus: false,
                    syncFullHistory: false
                });
            } catch (e) {
                debugLog(`Failed to set settings: ${e.message}`);
            }

            console.log(`[Evolution] Instance ${uniqueInstanceName} created. Waiting 10s for Baileys...`);
            
            // Wait longer for Baileys to wake up
            await new Promise(resolve => setTimeout(resolve, 1000));
            debugLog(`Status after 1s:`, (await this.getStatus(uniqueInstanceName)));
            await new Promise(resolve => setTimeout(resolve, 9000));
            debugLog(`Status after 10s:`, (await this.getStatus(uniqueInstanceName)));

            const connectData = await this.connect(uniqueInstanceName);
            
            return {
                instanceId: uniqueInstanceName, // IMPORTANT: We return the UNIQUE name
                qrcode: connectData.qrcode,
                status: 'connecting'
            };


        } catch (error) {
            const errorMsg = error.response?.data || error.message;
            log.error(`[Evolution] Create Instance Error:`, errorMsg);
            throw new Error(`Failed to create Evolution instance: ${JSON.stringify(errorMsg)}`);
        }
    }


    async connect(instanceName) {
        let retries = 15;
        let lastResponse = null;
        
        while (retries > 0) {
            try {
               debugLog(`Connecting instance (Attempt ${16 - retries}): ${instanceName}`);
               const response = await this.client.get(`/instance/connect/${encodeURIComponent(instanceName)}`);
               lastResponse = response.data;
               
               debugLog(`Connect response:`, lastResponse);
               
               const qrcodeData = lastResponse.qrcode;
               const qrcode = (typeof qrcodeData === 'string' ? qrcodeData : qrcodeData?.base64) || lastResponse.base64;
               
               if (qrcode) {
                   debugLog(`QR Code found!`);
                   return {
                       qrcode: qrcode,
                       code: lastResponse.code
                   };
               }
               
               debugLog(`No QR Code yet, waiting 3s...`);
               await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3s before retry
               retries--;
            } catch (error) {
                const errorData = error.response?.data || error.message;
                debugLog(`Connect attempt failed:`, errorData);
                if (error.response?.status === 404) break;
                
                await new Promise(resolve => setTimeout(resolve, 3000));
                retries--;
            }
        }
        
        return {
            qrcode: null,
            code: lastResponse?.code
        };
    }



    async disconnect(instanceName) {
        try {
            console.log(`[Evolution] Deleting instance: ${instanceName}`);
            const response = await this.client.delete(`/instance/delete/${encodeURIComponent(instanceName)}`);
            console.log(`[Evolution] Delete response status:`, response.status);
            return true;
        } catch (error) {
            console.error(`[Evolution] Delete error for ${instanceName}:`, error.response?.status, error.response?.data || error.message);
            // Ignore 404 - instance doesn't exist anyway
            if (error.response?.status === 404) {
                console.log(`[Evolution] Instance not found (404), treating as deleted`);
                return true;
            }
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
            
            // v2 response structure usually has data.key.id, but let's be safe
            return {
                id: response.data.key?.id || response.data.id || response.data.messageId,
                timestamp: response.data.messageTimestamp || response.data.timestamp
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


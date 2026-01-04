import axios from 'axios';
import {
    IWhatsappProvider,
    ProviderCredentials,
    CreateInstanceResponse,
    QrCodeResponse,
    ConnectionStatus,
    SendMessageResponse,
    WebhookResult,
} from './interfaces/IWhatsappProvider';

/**
 * Evolution API Provider Implementation
 * Supports QR Code connection and full messaging capabilities
 */
export class EvolutionProvider implements IWhatsappProvider {
    private getBaseUrl(credentials: ProviderCredentials): string {
        return credentials.apiUrl || process.env.EVOLUTION_API_BASE_URL || 'http://localhost:8080';
    }

    private getApiKey(credentials: ProviderCredentials): string {
        return credentials.apiKey || process.env.EVOLUTION_API_KEY || '';
    }

    async createInstance(unitId: string, credentials: ProviderCredentials): Promise<CreateInstanceResponse> {
        try {
            const baseUrl = this.getBaseUrl(credentials);
            const apiKey = this.getApiKey(credentials);
            const instanceName = credentials.instanceId || `unit_${unitId}`;

            const response = await axios.post(
                `${baseUrl}/instance/create`,
                {
                    instanceName,
                    token: apiKey,
                    qrcode: true,
                    integration: 'WHATSAPP-BAILEYS',
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        apikey: apiKey,
                    },
                }
            );

            return {
                success: true,
                instanceId: instanceName,
                qrCode: response.data.qrcode?.base64 || response.data.qrcode,
                message: 'Instance created successfully',
            };
        } catch (error: any) {
            console.error('[EvolutionProvider] Error creating instance:', error.message);
            return {
                success: false,
                instanceId: '',
                error: error.response?.data?.message || error.message,
            };
        }
    }

    async getQrCode(instanceId: string): Promise<QrCodeResponse> {
        try {
            const baseUrl = process.env.EVOLUTION_API_BASE_URL || 'http://localhost:8080';
            const apiKey = process.env.EVOLUTION_API_KEY || '';

            const response = await axios.get(`${baseUrl}/instance/connect/${instanceId}`, {
                headers: { apikey: apiKey },
            });

            return {
                qrCode: response.data.qrcode?.base64 || response.data.qrcode || null,
                status: response.data.state || 'connecting',
            };
        } catch (error: any) {
            console.error('[EvolutionProvider] Error getting QR code:', error.message);
            return {
                qrCode: null,
                status: 'error',
            };
        }
    }

    async getStatus(instanceId: string): Promise<ConnectionStatus> {
        try {
            const baseUrl = process.env.EVOLUTION_API_BASE_URL || 'http://localhost:8080';
            const apiKey = process.env.EVOLUTION_API_KEY || '';

            const response = await axios.get(`${baseUrl}/instance/connectionState/${instanceId}`, {
                headers: { apikey: apiKey },
            });

            const state = response.data.state;
            let status: 'disconnected' | 'connecting' | 'connected' | 'error';

            if (state === 'open') {
                status = 'connected';
            } else if (state === 'connecting' || state === 'qr') {
                status = 'connecting';
            } else if (state === 'close') {
                status = 'disconnected';
            } else {
                status = 'error';
            }

            return {
                status,
                phoneNumber: response.data.instance?.phone || undefined,
                profileName: response.data.instance?.profileName || undefined,
            };
        } catch (error: any) {
            console.error('[EvolutionProvider] Error getting status:', error.message);
            return {
                status: 'error',
                error: error.message,
            };
        }
    }

    async disconnect(instanceId: string): Promise<void> {
        try {
            const baseUrl = process.env.EVOLUTION_API_BASE_URL || 'http://localhost:8080';
            const apiKey = process.env.EVOLUTION_API_KEY || '';

            await axios.delete(`${baseUrl}/instance/logout/${instanceId}`, {
                headers: { apikey: apiKey },
            });

            console.log(`[EvolutionProvider] Instance ${instanceId} disconnected successfully`);
        } catch (error: any) {
            console.error('[EvolutionProvider] Error disconnecting:', error.message);
            throw new Error(`Failed to disconnect: ${error.message}`);
        }
    }

    async sendTextMessage(instanceId: string, phone: string, message: string): Promise<SendMessageResponse> {
        try {
            const baseUrl = process.env.EVOLUTION_API_BASE_URL || 'http://localhost:8080';
            const apiKey = process.env.EVOLUTION_API_KEY || '';

            const response = await axios.post(
                `${baseUrl}/message/sendText/${instanceId}`,
                {
                    number: phone.replace(/\D/g, ''),
                    text: message,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        apikey: apiKey,
                    },
                }
            );

            return {
                success: true,
                messageId: response.data.key?.id || response.data.messageId,
                timestamp: response.data.messageTimestamp || Date.now(),
            };
        } catch (error: any) {
            console.error('[EvolutionProvider] Error sending text message:', error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message,
            };
        }
    }

    async sendMediaMessage(
        instanceId: string,
        phone: string,
        mediaUrl: string,
        caption?: string,
        mediaType: string = 'image'
    ): Promise<SendMessageResponse> {
        try {
            const baseUrl = process.env.EVOLUTION_API_BASE_URL || 'http://localhost:8080';
            const apiKey = process.env.EVOLUTION_API_KEY || '';

            const endpoint = mediaType === 'image' ? 'sendImage' : 'sendMedia';

            const response = await axios.post(
                `${baseUrl}/message/${endpoint}/${instanceId}`,
                {
                    number: phone.replace(/\D/g, ''),
                    mediaUrl,
                    caption: caption || '',
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        apikey: apiKey,
                    },
                }
            );

            return {
                success: true,
                messageId: response.data.key?.id || response.data.messageId,
                timestamp: response.data.messageTimestamp || Date.now(),
            };
        } catch (error: any) {
            console.error('[EvolutionProvider] Error sending media message:', error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message,
            };
        }
    }

    async handleWebhook(payload: any, webhookSecret?: string): Promise<WebhookResult> {
        const event = payload.event || payload.type;
        const instanceId = payload.instance || payload.instanceId;

        // Determine event type
        let eventType: 'message' | 'status' | 'qr' | 'connection' = 'message';
        if (event === 'qrcode.updated' || event === 'qr') {
            eventType = 'qr';
        } else if (event === 'connection.update' || event === 'status') {
            eventType = 'connection';
        } else if (event === 'messages.upsert' || event === 'message') {
            eventType = 'message';
        }

        const result: WebhookResult = {
            unitId: '', // Will be resolved by controller
            instanceId,
            event: {
                type: eventType,
                instanceId,
                data: payload,
            },
            shouldPersist: false,
        };

        // Handle message events
        if (eventType === 'message' && payload.data?.message) {
            const msg = payload.data.message;
            result.shouldPersist = true;
            result.messageData = {
                sender: msg.fromMe ? 'agent' : 'customer',
                content: msg.conversation || msg.extendedTextMessage?.text || '',
                mediaUrl: msg.imageMessage?.url || msg.videoMessage?.url || msg.documentMessage?.url,
                mediaType: msg.imageMessage ? 'image' : msg.videoMessage ? 'video' : msg.documentMessage ? 'document' : undefined,
                externalId: msg.key?.id,
            };
        }

        // Handle connection status updates
        if (eventType === 'connection') {
            const state = payload.data?.state || payload.state;
            let status: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';

            if (state === 'open') status = 'connected';
            else if (state === 'connecting' || state === 'qr') status = 'connecting';
            else if (state === 'close') status = 'disconnected';

            result.statusUpdate = {
                status,
                phoneNumber: payload.data?.instance?.phone,
            };
        }

        // Handle QR code updates
        if (eventType === 'qr') {
            result.statusUpdate = {
                status: 'connecting',
                qrCode: payload.data?.qrcode || payload.qrcode,
            };
        }

        return result;
    }

    validateWebhook(payload: any, signature: string, secret: string): boolean {
        // Evolution API doesn't use signature validation by default
        // You can implement custom validation if needed
        return true;
    }
}

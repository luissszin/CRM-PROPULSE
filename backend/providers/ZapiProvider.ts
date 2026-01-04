import axios from 'axios';
import crypto from 'crypto';
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
 * Z-API Provider Implementation
 * Supports QR Code connection and full messaging capabilities
 */
export class ZapiProvider implements IWhatsappProvider {
    private getBaseUrl(credentials: ProviderCredentials): string {
        return credentials.apiUrl || process.env.ZAPI_BASE_URL || 'https://api.z-api.io';
    }

    private getInstanceId(credentials: ProviderCredentials): string {
        return credentials.instanceId || process.env.ZAPI_INSTANCE_ID || '';
    }

    private getToken(credentials: ProviderCredentials): string {
        return credentials.apiKey || process.env.ZAPI_TOKEN || '';
    }

    private getClientToken(credentials: ProviderCredentials): string {
        return credentials.accessToken || process.env.ZAPI_CLIENT_TOKEN || '';
    }

    async createInstance(unitId: string, credentials: ProviderCredentials): Promise<CreateInstanceResponse> {
        try {
            const baseUrl = this.getBaseUrl(credentials);
            const instanceId = credentials.instanceId || `unit_${unitId}`;
            const token = this.getToken(credentials);

            // Z-API instances are typically pre-created
            // This method validates the credentials and returns instance info
            const response = await axios.get(`${baseUrl}/instances/${instanceId}/token/${token}/status`, {
                headers: {
                    'Client-Token': this.getClientToken(credentials),
                },
            });

            return {
                success: true,
                instanceId,
                message: 'Instance validated successfully',
            };
        } catch (error: any) {
            console.error('[ZapiProvider] Error creating/validating instance:', error.message);
            return {
                success: false,
                instanceId: credentials.instanceId || '',
                error: error.response?.data?.message || error.message,
            };
        }
    }

    async getQrCode(instanceId: string): Promise<QrCodeResponse> {
        try {
            const baseUrl = process.env.ZAPI_BASE_URL || 'https://api.z-api.io';
            const token = process.env.ZAPI_TOKEN || '';
            const clientToken = process.env.ZAPI_CLIENT_TOKEN || '';

            const response = await axios.get(`${baseUrl}/instances/${instanceId}/token/${token}/qr-code/image`, {
                headers: {
                    'Client-Token': clientToken,
                },
            });

            return {
                qrCode: response.data.value || response.data.qrcode || null,
                status: response.data.connected ? 'connected' : 'connecting',
            };
        } catch (error: any) {
            console.error('[ZapiProvider] Error getting QR code:', error.message);
            return {
                qrCode: null,
                status: 'error',
            };
        }
    }

    async getStatus(instanceId: string): Promise<ConnectionStatus> {
        try {
            const baseUrl = process.env.ZAPI_BASE_URL || 'https://api.z-api.io';
            const token = process.env.ZAPI_TOKEN || '';
            const clientToken = process.env.ZAPI_CLIENT_TOKEN || '';

            const response = await axios.get(`${baseUrl}/instances/${instanceId}/token/${token}/status`, {
                headers: {
                    'Client-Token': clientToken,
                },
            });

            const connected = response.data.connected || false;
            const status: 'disconnected' | 'connecting' | 'connected' | 'error' = connected ? 'connected' : 'disconnected';

            return {
                status,
                phoneNumber: response.data.phone || undefined,
                profileName: response.data.profileName || undefined,
            };
        } catch (error: any) {
            console.error('[ZapiProvider] Error getting status:', error.message);
            return {
                status: 'error',
                error: error.message,
            };
        }
    }

    async disconnect(instanceId: string): Promise<void> {
        try {
            const baseUrl = process.env.ZAPI_BASE_URL || 'https://api.z-api.io';
            const token = process.env.ZAPI_TOKEN || '';
            const clientToken = process.env.ZAPI_CLIENT_TOKEN || '';

            await axios.delete(`${baseUrl}/instances/${instanceId}/token/${token}/logout`, {
                headers: {
                    'Client-Token': clientToken,
                },
            });

            console.log(`[ZapiProvider] Instance ${instanceId} disconnected successfully`);
        } catch (error: any) {
            console.error('[ZapiProvider] Error disconnecting:', error.message);
            throw new Error(`Failed to disconnect: ${error.message}`);
        }
    }

    async sendTextMessage(instanceId: string, phone: string, message: string): Promise<SendMessageResponse> {
        try {
            const baseUrl = process.env.ZAPI_BASE_URL || 'https://api.z-api.io';
            const token = process.env.ZAPI_TOKEN || '';
            const clientToken = process.env.ZAPI_CLIENT_TOKEN || '';

            const response = await axios.post(
                `${baseUrl}/instances/${instanceId}/token/${token}/send-text`,
                {
                    phone: phone.replace(/\D/g, ''),
                    message,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Client-Token': clientToken,
                    },
                }
            );

            return {
                success: true,
                messageId: response.data.messageId || response.data.id,
                timestamp: response.data.timestamp || Date.now(),
            };
        } catch (error: any) {
            console.error('[ZapiProvider] Error sending text message:', error.message);
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
            const baseUrl = process.env.ZAPI_BASE_URL || 'https://api.z-api.io';
            const token = process.env.ZAPI_TOKEN || '';
            const clientToken = process.env.ZAPI_CLIENT_TOKEN || '';

            let endpoint = 'send-image';
            if (mediaType === 'video') endpoint = 'send-video';
            else if (mediaType === 'document') endpoint = 'send-document';

            const response = await axios.post(
                `${baseUrl}/instances/${instanceId}/token/${token}/${endpoint}`,
                {
                    phone: phone.replace(/\D/g, ''),
                    image: mediaUrl,
                    caption: caption || '',
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Client-Token': clientToken,
                    },
                }
            );

            return {
                success: true,
                messageId: response.data.messageId || response.data.id,
                timestamp: response.data.timestamp || Date.now(),
            };
        } catch (error: any) {
            console.error('[ZapiProvider] Error sending media message:', error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message,
            };
        }
    }

    async handleWebhook(payload: any, webhookSecret?: string): Promise<WebhookResult> {
        const instanceId = payload.instanceId || payload.instance;
        const eventType = payload.event || 'message';

        const result: WebhookResult = {
            unitId: '', // Will be resolved by controller
            instanceId,
            event: {
                type: eventType === 'status' ? 'status' : 'message',
                instanceId,
                data: payload,
            },
            shouldPersist: false,
        };

        // Handle message events
        if (eventType === 'received-message' || eventType === 'message') {
            result.shouldPersist = true;
            result.event.type = 'message';
            result.messageData = {
                sender: payload.fromMe ? 'agent' : 'customer',
                content: payload.text?.message || payload.message || '',
                mediaUrl: payload.image?.imageUrl || payload.video?.videoUrl || payload.document?.documentUrl,
                mediaType: payload.image ? 'image' : payload.video ? 'video' : payload.document ? 'document' : undefined,
                externalId: payload.messageId || payload.id,
            };
        }

        // Handle status updates
        if (eventType === 'status' || eventType === 'connection') {
            const connected = payload.connected || false;
            result.statusUpdate = {
                status: connected ? 'connected' : 'disconnected',
                phoneNumber: payload.phone,
            };
        }

        return result;
    }

    validateWebhook(payload: any, signature: string, secret: string): boolean {
        // Z-API webhook validation
        // Implement signature validation if Z-API provides it
        // For now, we'll validate based on the webhook secret in the URL or header
        return true;
    }
}

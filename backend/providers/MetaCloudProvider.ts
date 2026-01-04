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
 * Meta Cloud API Provider Implementation
 * No QR Code - uses credentials (phone_number_id, access_token, business_account_id)
 */
export class MetaCloudProvider implements IWhatsappProvider {
    private readonly apiVersion = process.env.META_CLOUD_API_VERSION || 'v21.0';

    async createInstance(unitId: string, credentials: ProviderCredentials): Promise<CreateInstanceResponse> {
        try {
            const { accessToken, phoneNumberId, businessAccountId } = credentials;

            if (!accessToken || !phoneNumberId) {
                return {
                    success: false,
                    instanceId: '',
                    error: 'Missing required credentials: accessToken and phoneNumberId are required',
                };
            }

            // Validate credentials by making a test API call
            const response = await axios.get(
                `https://graph.facebook.com/${this.apiVersion}/${phoneNumberId}`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );

            return {
                success: true,
                instanceId: phoneNumberId,
                message: 'Meta Cloud API credentials validated successfully',
            };
        } catch (error: any) {
            console.error('[MetaCloudProvider] Error validating credentials:', error.message);
            return {
                success: false,
                instanceId: '',
                error: error.response?.data?.error?.message || error.message,
            };
        }
    }

    async getQrCode(instanceId: string): Promise<QrCodeResponse> {
        // Meta Cloud API doesn't use QR codes
        return {
            qrCode: null,
            status: 'connected',
        };
    }

    async getStatus(instanceId: string): Promise<ConnectionStatus> {
        try {
            // Get credentials from environment or database
            const accessToken = process.env.META_ACCESS_TOKEN || '';

            const response = await axios.get(
                `https://graph.facebook.com/${this.apiVersion}/${instanceId}`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );

            return {
                status: 'connected',
                phoneNumber: response.data.display_phone_number,
                profileName: response.data.verified_name,
            };
        } catch (error: any) {
            console.error('[MetaCloudProvider] Error getting status:', error.message);
            return {
                status: 'error',
                error: error.response?.data?.error?.message || error.message,
            };
        }
    }

    async disconnect(instanceId: string): Promise<void> {
        // Meta Cloud API doesn't have a disconnect endpoint
        // Disconnection is handled by revoking the access token or removing credentials
        console.log(`[MetaCloudProvider] Instance ${instanceId} marked for disconnection`);
    }

    async sendTextMessage(instanceId: string, phone: string, message: string): Promise<SendMessageResponse> {
        try {
            const accessToken = process.env.META_ACCESS_TOKEN || '';

            const response = await axios.post(
                `https://graph.facebook.com/${this.apiVersion}/${instanceId}/messages`,
                {
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: phone.replace(/\D/g, ''),
                    type: 'text',
                    text: {
                        body: message,
                    },
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );

            return {
                success: true,
                messageId: response.data.messages[0].id,
            };
        } catch (error: any) {
            console.error('[MetaCloudProvider] Error sending text message:', error.message);
            return {
                success: false,
                error: error.response?.data?.error?.message || error.message,
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
            const accessToken = process.env.META_ACCESS_TOKEN || '';

            const mediaTypeMapping: { [key: string]: string } = {
                image: 'image',
                video: 'video',
                document: 'document',
                audio: 'audio',
            };

            const type = mediaTypeMapping[mediaType] || 'document';

            const response = await axios.post(
                `https://graph.facebook.com/${this.apiVersion}/${instanceId}/messages`,
                {
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: phone.replace(/\D/g, ''),
                    type,
                    [type]: {
                        link: mediaUrl,
                        caption: caption || undefined,
                    },
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );

            return {
                success: true,
                messageId: response.data.messages[0].id,
            };
        } catch (error: any) {
            console.error('[MetaCloudProvider] Error sending media message:', error.message);
            return {
                success: false,
                error: error.response?.data?.error?.message || error.message,
            };
        }
    }

    async handleWebhook(payload: any, webhookSecret?: string): Promise<WebhookResult> {
        // Meta webhook structure
        const entry = payload.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;

        const instanceId = value?.metadata?.phone_number_id || '';

        const result: WebhookResult = {
            unitId: '', // Will be resolved by controller
            instanceId,
            event: {
                type: 'message',
                instanceId,
                data: payload,
            },
            shouldPersist: false,
        };

        // Handle incoming messages
        if (value?.messages && value.messages.length > 0) {
            const message = value.messages[0];
            result.shouldPersist = true;
            result.event.type = 'message';

            let content = '';
            let mediaUrl;
            let mediaType;

            if (message.type === 'text') {
                content = message.text.body;
            } else if (message.type === 'image') {
                mediaUrl = message.image.id; // Will need to be downloaded via Media API
                mediaType = 'image';
                content = message.image.caption || '';
            } else if (message.type === 'video') {
                mediaUrl = message.video.id;
                mediaType = 'video';
                content = message.video.caption || '';
            } else if (message.type === 'document') {
                mediaUrl = message.document.id;
                mediaType = 'document';
                content = message.document.caption || '';
            }

            result.messageData = {
                sender: 'customer',
                content,
                mediaUrl,
                mediaType,
                externalId: message.id,
            };
        }

        // Handle status updates
        if (value?.statuses && value.statuses.length > 0) {
            const status = value.statuses[0];
            result.event.type = 'status';
            // Status updates don't change connection status for Meta
        }

        return result;
    }

    validateWebhook(payload: any, signature: string, secret: string): boolean {
        try {
            // Meta uses X-Hub-Signature-256 header
            // Format: sha256=<signature>
            const expectedSignature = crypto
                .createHmac('sha256', secret)
                .update(JSON.stringify(payload))
                .digest('hex');

            const actualSignature = signature.replace('sha256=', '');

            return crypto.timingSafeEqual(
                Buffer.from(expectedSignature),
                Buffer.from(actualSignature)
            );
        } catch (error) {
            console.error('[MetaCloudProvider] Error validating webhook:', error);
            return false;
        }
    }
}

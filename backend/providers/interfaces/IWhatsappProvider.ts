/**
 * Base interface for WhatsApp providers
 * All providers (Z-API, Evolution API, Meta Cloud API) must implement this interface
 */

export interface ProviderCredentials {
    apiKey?: string;
    apiUrl?: string;
    instanceId?: string;
    accessToken?: string;
    phoneNumberId?: string;
    businessAccountId?: string;
    [key: string]: any;
}

export interface CreateInstanceResponse {
    success: boolean;
    instanceId: string;
    qrCode?: string;
    message?: string;
    error?: string;
}

export interface QrCodeResponse {
    qrCode: string | null;
    status: string;
    expiresAt?: Date;
}

export interface ConnectionStatus {
    status: 'disconnected' | 'connecting' | 'connected' | 'error';
    phoneNumber?: string;
    profileName?: string;
    error?: string;
}

export interface SendMessageResponse {
    success: boolean;
    messageId?: string;
    timestamp?: number;
    error?: string;
}

export interface WebhookEvent {
    type: 'message' | 'status' | 'qr' | 'connection';
    instanceId: string;
    data: any;
}

export interface WebhookResult {
    unitId: string;
    instanceId: string;
    event: WebhookEvent;
    shouldPersist: boolean;
    messageData?: {
        conversationId?: string;
        sender: 'agent' | 'customer';
        content?: string;
        mediaUrl?: string;
        mediaType?: string;
        externalId?: string;
    };
    statusUpdate?: {
        status: 'disconnected' | 'connecting' | 'connected' | 'error';
        phoneNumber?: string;
        qrCode?: string;
    };
}

/**
 * Main WhatsApp Provider Interface
 * Strategy Pattern: Each provider implements this interface
 */
export interface IWhatsappProvider {
    /**
     * Create a new WhatsApp instance/session
     * @param unitId - The unit ID that owns this connection
     * @param credentials - Provider-specific credentials
     */
    createInstance(unitId: string, credentials: ProviderCredentials): Promise<CreateInstanceResponse>;

    /**
     * Get QR Code for connection (Evolution/Z-API only, Meta returns null)
     * @param instanceId - The instance identifier
     */
    getQrCode(instanceId: string): Promise<QrCodeResponse>;

    /**
     * Get current connection status
     * @param instanceId - The instance identifier
     */
    getStatus(instanceId: string): Promise<ConnectionStatus>;

    /**
     * Disconnect the WhatsApp instance
     * @param instanceId - The instance identifier
     */
    disconnect(instanceId: string): Promise<void>;

    /**
     * Send a text message
     * @param instanceId - The instance identifier
     * @param phone - Recipient phone number
     * @param message - Text message content
     */
    sendTextMessage(instanceId: string, phone: string, message: string): Promise<SendMessageResponse>;

    /**
     * Send a media message (image, video, document)
     * @param instanceId - The instance identifier
     * @param phone - Recipient phone number
     * @param mediaUrl - URL of the media file
     * @param caption - Optional caption
     * @param mediaType - Type of media (image, video, document)
     */
    sendMediaMessage(
        instanceId: string,
        phone: string,
        mediaUrl: string,
        caption?: string,
        mediaType?: string
    ): Promise<SendMessageResponse>;

    /**
     * Handle incoming webhook from provider
     * @param payload - Raw webhook payload from provider
     * @param webhookSecret - Secret for validation
     */
    handleWebhook(payload: any, webhookSecret?: string): Promise<WebhookResult>;

    /**
     * Validate webhook signature/secret
     * @param payload - Raw webhook payload
     * @param signature - Signature from webhook headers
     * @param secret - Webhook secret
     */
    validateWebhook(payload: any, signature: string, secret: string): boolean;
}

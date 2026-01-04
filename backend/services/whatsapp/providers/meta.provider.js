import { log } from '../../../utils/logger.js';

class MetaProvider {
    constructor(config) {
        this.phoneNumberId = config.phoneNumberId;
        this.accessToken = config.accessToken;
        this.wabaId = config.wabaId;
        this.baseUrl = 'https://graph.facebook.com/v18.0';
    }

    async createInstance(instanceName) {
        // Meta doesn't create instances in the same way. It validates the token.
        return {
            instanceId: this.phoneNumberId,
            status: 'connected', // Assuming valid config implies connection in cloud api context
            qrcode: null
        };
    }

    async connect() {
        // No QR code for Meta
        return { qrcode: null, status: 'connected' };
    }

    async disconnect() {
        // Cannot disconnect cloud API via API, just locally delete config
        return true;
    }

    async getStatus() {
        // Would typically verify token validity here
        return {
            status: 'connected',
            phone: null, // Hard to get without calling specific endpoints
        };
    }

    async sendMessage(instanceName, phone, content) {
        // TODO: Implement axios call to Graph API
        log.warn('Meta sendMessage not fully implemented yet');
        return { id: 'meta_mock_' + Date.now() };
    }
}

export default MetaProvider;

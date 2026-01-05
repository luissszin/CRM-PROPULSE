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
        // TODO: Implementar axios call real para Graph API
        log.warn('Meta sendMessage is using a mock implementation.');
        
        // Simulação de chamada de API da Meta
        // const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;
        // const response = await axios.post(url, {
        //     messaging_product: 'whatsapp',
        //     to: phone,
        //     text: { body: content }
        // }, {
        //     headers: { 'Authorization': `Bearer ${this.accessToken}` }
        // });
        
        // Retorna um ID mockado
        return { id: 'meta_mock_' + Date.now() };
    }
}

export default MetaProvider;

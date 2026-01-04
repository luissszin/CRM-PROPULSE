import 'dotenv/config';
import * as evolution from './evolutionService.js';
import * as meta from './metaService.js';
import * as zapi from './zapi.js';

/**
 * Send text message based on provider
 */
export async function sendTextMessage(provider, config, phone, message, channel = 'whatsapp') {
    if (provider === 'meta') {
        return await meta.sendTextMessage(phone, message, config, channel);
    } else if (provider === 'zapi') {
        return await zapi.sendTextMessage(config, phone, message);
    } else {
        // Default to evolution
        return await evolution.sendTextMessage(config.instanceName, phone, message, config.apiKey, config.apiUrl);
    }
}

/**
 * Send media message based on provider
 */
export async function sendMediaMessage(provider, config, phone, mediaUrl, caption, mediaType, channel = 'whatsapp') {
    if (provider === 'meta') {
        return await meta.sendMediaMessage(phone, mediaUrl, caption, mediaType, config, channel);
    } else if (provider === 'zapi') {
        return await zapi.sendMediaMessage(config, phone, mediaUrl, caption, mediaType);
    } else {
        return await evolution.sendMediaMessage(config.instanceName, phone, mediaUrl, caption, mediaType, config.apiKey, config.apiUrl);
    }
}

// Proxy other evolution-specific functions (QR code, etc)
export const createInstance = evolution.createInstance;
export const connectInstance = evolution.connectInstance;
export const getInstanceStatus = async (instanceName, apiKey, apiUrl, provider = 'evolution', config = {}) => {
    if (provider === 'zapi') {
        return await zapi.getInstanceStatus(config);
    }
    return await evolution.getInstanceStatus(instanceName, apiKey, apiUrl);
};
export const disconnectInstance = evolution.disconnectInstance;
export const deleteInstance = evolution.deleteInstance;


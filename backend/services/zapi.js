import axios from 'axios';

/**
 * Z-API Service for Multi-tenant support
 * Handles interactions with Z-API using instance-specific configuration.
 */

// Helper to create axios instance with headers
const createClient = (config) => {
    const { instanceId, token, clientToken } = config;
    if (!instanceId || !token) {
        throw new Error('Z-API Config missing instanceId or token');
    }

    const headers = {
        'Content-Type': 'application/json'
    };

    if (clientToken) {
        headers['Client-Token'] = clientToken;
    }

    // Determine Base URL (default to internal Z-API URL or standard one)
    // For Z-API, usually it's https://api.z-api.io/instances/{instanceId}/token/{token}
    // But user might have a custom one or we construct it.
    // Based on previous code, it seems they construct it.

    // We will use a base URL if provided, otherwise default.
    // However, the standard Z-API structure includes instance and token in the path.
    // So we'll use a base endpoint and append.

    const baseUrl = 'https://api.z-api.io';

    return {
        post: async (endpoint, data) => {
            const url = `${baseUrl}/instances/${instanceId}/token/${token}/${endpoint}`;
            return axios.post(url, data, { headers });
        },
        get: async (endpoint) => {
            const url = `${baseUrl}/instances/${instanceId}/token/${token}/${endpoint}`;
            return axios.get(url, { headers });
        }
    };
};

export const sendTextMessage = async (config, phone, message) => {
    try {
        const client = createClient(config);
        const response = await client.post('send-text', {
            phone,
            message
        });
        return response.data;
    } catch (error) {
        console.error('[Z-API] Send Text Error:', error.message);
        throw error;
    }
};

export const sendMediaMessage = async (config, phone, mediaUrl, caption, mediaType = 'image') => {
    try {
        const client = createClient(config);

        // Z-API endpoints vary by type: send-image, send-video, send-document, send-audio
        let endpoint = 'send-image';
        const payload = { phone, image: mediaUrl, caption };

        if (mediaType === 'video') {
            endpoint = 'send-video';
            delete payload.image;
            payload.video = mediaUrl;
        } else if (mediaType === 'audio') {
            endpoint = 'send-audio';
            delete payload.image;
            delete payload.caption;
            payload.audio = mediaUrl;
        } else if (mediaType === 'document' || mediaType === 'file') {
            endpoint = 'send-document';
            delete payload.image;
            delete payload.caption; // Document usually takes (phone, document, extension?, fileName?)
            payload.document = mediaUrl;
            // payload.fileName = 'file'; // Optional
        }

        const response = await client.post(endpoint, payload);
        return response.data;
    } catch (error) {
        console.error('[Z-API] Send Media Error:', error.message);
        throw error;
    }
};

export const getInstanceStatus = async (config) => {
    try {
        // Z-API doesn't have a simple 'status' endpoint that returns generic connection status in the same way as Evolution 
        // effectively, usually 'status' or 'connection' endpoint.
        // Let's assume 'status' for now based on common integrations.
        const client = createClient(config);
        // Using 'status' which usually returns connected/disconnected
        const response = await client.get('status');
        return response.data; // { connected: true, ... }
    } catch (error) {
        // If 401/404, implies disconnected or invalid
        return { connected: false, error: error.message };
    }
};

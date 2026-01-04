// Evolution API Service
import 'dotenv/config';

const GLOBAL_BASE_URL = process.env.EVOLUTION_API_BASE_URL || 'http://localhost:8080';
const GLOBAL_API_KEY = process.env.EVOLUTION_API_KEY || '';

/**
 * Create  a new WhatsApp instance in Evolution API
 */
export async function createInstance(instanceName, token = GLOBAL_API_KEY, baseUrl = GLOBAL_BASE_URL) {
    try {
        const response = await fetch(`${baseUrl}/instance/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': token,
            },
            body: JSON.stringify({
                instanceName,
                token,
                qrcode: true,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Evolution API error: ${error}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error creating instance:', error);
        throw error;
    }
}

/**
 * Connect instance (generate QR code)
 */
export async function connectInstance(instanceName, token = GLOBAL_API_KEY, baseUrl = GLOBAL_BASE_URL) {
    try {
        const response = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
            method: 'GET',
            headers: { 'apikey': token },
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Evolution API error: ${error}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error connecting instance:', error);
        throw error;
    }
}

/**
 * Get instance connection status
 */
export async function getInstanceStatus(instanceName, token = GLOBAL_API_KEY, baseUrl = GLOBAL_BASE_URL) {
    try {
        const response = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, {
            method: 'GET',
            headers: { 'apikey': token },
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Evolution API error: ${error}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error getting instance status:', error);
        throw error;
    }
}

/**
 * Send text message
 */
export async function sendTextMessage(instanceName, phone, message, token = GLOBAL_API_KEY, baseUrl = GLOBAL_BASE_URL) {
    try {
        const response = await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': token,
            },
            body: JSON.stringify({
                number: phone.replace(/\D/g, ''),
                text: message,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Evolution API error: ${error}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
}

/**
 * Send media message
 */
export async function sendMediaMessage(instanceName, phone, mediaUrl, caption, mediaType = 'image', token = GLOBAL_API_KEY, baseUrl = GLOBAL_BASE_URL) {
    try {
        const endpoint = mediaType === 'image' ? 'sendImage' : 'sendMedia';

        const response = await fetch(`${baseUrl}/message/${endpoint}/${instanceName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': token,
            },
            body: JSON.stringify({
                number: phone.replace(/\D/g, ''),
                mediaUrl,
                caption,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Evolution API error: ${error}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error sending media:', error);
        throw error;
    }
}

/**
 * Disconnect instance
 */
export async function disconnectInstance(instanceName, token = GLOBAL_API_KEY, baseUrl = GLOBAL_BASE_URL) {
    try {
        const response = await fetch(`${baseUrl}/instance/logout/${instanceName}`, {
            method: 'DELETE',
            headers: { 'apikey': token },
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Evolution API error: ${error}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error disconnecting instance:', error);
        throw error;
    }
}

/**
 * Delete instance completely
 */
export async function deleteInstance(instanceName, token = GLOBAL_API_KEY, baseUrl = GLOBAL_BASE_URL) {
    try {
        const response = await fetch(`${baseUrl}/instance/delete/${instanceName}`, {
            method: 'DELETE',
            headers: { 'apikey': token },
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Evolution API error: ${error}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error deleting instance:', error);
        throw error;
    }
}

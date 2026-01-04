// Meta Cloud API Service
import 'dotenv/config';

/**
 * Send text message via Meta Cloud API (WhatsApp, Instagram, Messenger)
 * @param {string} phone - Recipient ID/Phone
 * @param {string} message - Text message
 * @param {object} config - Meta configuration (accessToken, phoneNumberId/pageId)
 * @param {string} channel - 'whatsapp', 'instagram', or 'messenger'
 */
export async function sendTextMessage(phone, message, config, channel = 'whatsapp') {
    const { accessToken, phoneNumberId, pageId, instagramId } = config;
    const identifier = channel === 'whatsapp' ? phoneNumberId : (channel === 'instagram' ? instagramId : pageId);

    if (!accessToken || !identifier) throw new Error(`Meta API (${channel}): Missing credentials`);

    const url = `https://graph.facebook.com/v21.0/${identifier}/messages`;

    let body;
    if (channel === 'whatsapp') {
        body = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: phone.replace(/\D/g, ''),
            type: 'text',
            text: { body: message },
        };
    } else {
        // Instagram and Messenger use the same Graph API messaging structure
        body = {
            recipient: { id: phone },
            message: { text: message },
        };
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Meta API error');
    }

    return await response.json();
}

/**
 * Send media message via Meta Cloud API
 * @param {string} phone 
 * @param {string} mediaUrl 
 * @param {string} caption 
 * @param {string} mediaType 
 * @param {object} config 
 */
export async function sendMediaMessage(phone, mediaUrl, caption, mediaType, config) {
    const { accessToken, phoneNumberId } = config;
    if (!accessToken || !phoneNumberId) throw new Error('Meta API: Missing credentials');

    const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: phone.replace(/\D/g, ''),
            type: mediaType === 'image' ? 'image' : 'document',
            [mediaType === 'image' ? 'image' : 'document']: {
                link: mediaUrl,
                caption: caption
            },
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Meta API error');
    }

    return await response.json();
}

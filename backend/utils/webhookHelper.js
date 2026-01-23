/**
 * Webhook Helper Utilities
 * Critical functions for webhook processing and security
 */

/**
 * Extract instance name from Evolution API webhook payload
 * @param {object} payload - Raw webhook payload
 * @returns {string|null} - Instance name or null if not found
 */
export function extractInstanceName(payload) {
    // Evolution API v2 typically sends instance in:
    // 1. payload.instance (most common)
    // 2. payload.data.instance
    // 3. payload.instanceName
    
    if (typeof payload?.instance === 'string' && payload.instance) {
        return payload.instance;
    }
    
    if (typeof payload?.data?.instance === 'string' && payload.data.instance) {
        return payload.data.instance;
    }
    
    if (typeof payload?.instanceName === 'string' && payload.instanceName) {
        return payload.instanceName;
    }
    
    return null;
}

/**
 * Mask phone number for secure logging
 * @param {string} phone - Phone number
 * @returns {string} - Masked phone (e.g., ****9999)
 */
export function maskPhone(phone) {
    if (!phone || typeof phone !== 'string') return '****';
    
    // Keep only last 4 digits
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length <= 4) return '****';
    
    const lastFour = cleaned.slice(-4);
    return `****${lastFour}`;
}

/**
 * Mask URL secrets for logging
 * @param {string} url - URL with potential secrets
 * @returns {string} - URL with secrets masked
 */
export function maskUrlSecrets(url) {
    if (!url) return url;
    
    // Mask webhook secrets: /webhooks/whatsapp/*/SECRET -> /webhooks/whatsapp/*/[MASKED]
    return url.replace(/\/webhooks\/whatsapp\/[^\/]+\/([^\/\?]+)/g, '/webhooks/whatsapp/$1/[MASKED]');
}

/**
 * Sanitize error for client response
 * Removes stack traces, internal paths, secrets
 * @param {Error|string} error 
 * @returns {string}
 */
export function sanitizeErrorMessage(error) {
    const message = error?.message || String(error);
    
    // Remove file paths
    let cleaned = message.replace(/\/[^\s]+\.(js|ts|json)/g, '[PATH]');
    
    // Remove UUIDs (potential secrets)
    cleaned = cleaned.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[UUID]');
    
    // Remove potential API keys
    cleaned = cleaned.replace(/apikey[=:]\s*[^\s&]+/gi, 'apikey=[MASKED]');
    
    // Truncate if too long
    if (cleaned.length > 200) {
        cleaned = cleaned.substring(0, 200) + '...';
    }
    
    return cleaned;
}

/**
 * Determine status reason from Evolution connection state
 * @param {string} connectionState - Evolution connection state
 * @param {boolean} hasQr - Whether QR code is present
 * @returns {string}
 */
export function getStatusReason(connectionState, hasQr) {
    if (connectionState === 'open') return 'scan_completed';
    if (connectionState === 'close') return 'disconnected';
    if (connectionState === 'connecting' && hasQr) return 'waiting_scan';
    if (connectionState === 'connecting') return 'initializing';
    return 'unknown';
}

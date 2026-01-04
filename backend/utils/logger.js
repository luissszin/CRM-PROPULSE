export const log = {
    info: (msg, ...args) => console.log(`[INFO] ${msg}`, ...args),
    warn: (msg, ...args) => console.warn(`[WARN] ${msg}`, ...args),
    error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args),
    
    // Security specific logs
    security: {
        authFailed: (email, reason) => console.warn(`[SECURITY] Auth Failed: ${email} - ${reason}`),
        authSuccess: (userId, role) => console.log(`[SECURITY] Auth Success: User ${userId} (${role})`),
        crossTenantAttempt: (userId, userUnit, targetUnit) => 
            console.error(`[SECURITY] CROSS-TENANT ATTEMPT: User ${userId} (Unit ${userUnit}) -> Target ${targetUnit}`)
    },

    // WhatsApp specific logs
    whatsapp: {
        webhookReceived: (provider, instance) => console.log(`[WHATSAPP] Webhook received from ${provider} (${instance})`),
        messageSent: (id, to) => console.log(`[WHATSAPP] Message sent: ${id} to ${to}`),
        connectionError: (provider, error) => console.error(`[WHATSAPP] Connection error (${provider}):`, error)
    }
};

export default log;
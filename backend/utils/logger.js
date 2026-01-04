import pino from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';

// Configuração do logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: isDevelopment ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname'
    }
  } : undefined,
  base: {
    env: process.env.NODE_ENV || 'development',
  },
});

// Wrapper functions para facilitar uso
export const log = {
  info: (msg, data = {}) => logger.info(data, msg),
  error: (msg, error = {}) => logger.error({ 
    error: error.message || error, 
    stack: error.stack 
  }, msg),
  warn: (msg, data = {}) => logger.warn(data, msg),
  debug: (msg, data = {}) => logger.debug(data, msg),
  
  // Logs específicos de segurança
  security: {
    authFailed: (email, reason) => logger.warn({ 
      event: 'auth_failed', 
      email, 
      reason 
    }, 'Authentication failed'),
    
    authSuccess: (userId, email) => logger.info({ 
      event: 'auth_success', 
      userId, 
      email 
    }, 'User authenticated'),
    
    forbiddenAccess: (userId, resource, reason) => logger.warn({ 
      event: 'forbidden_access', 
      userId, 
      resource, 
      reason 
    }, 'Forbidden access attempt'),
    
    crossTenantAttempt: (userId, userUnitId, requestedUnitId) => logger.error({ 
      event: 'cross_tenant_attempt', 
      userId, 
      userUnitId, 
      requestedUnitId 
    }, '🚨 SECURITY: Cross-tenant access attempt detected'),
  },
  
  // Logs de WhatsApp
  whatsapp: {
    sent: (phone, status) => logger.info({ 
      event: 'whatsapp_sent', 
      phone, 
      status 
    }, 'WhatsApp message sent'),
    
    failed: (phone, error) => logger.error({ 
      event: 'whatsapp_failed', 
      phone, 
      error 
    }, 'WhatsApp message failed'),
    
    webhookReceived: (provider, instanceId) => logger.info({ 
      event: 'webhook_received', 
      provider, 
      instanceId 
    }, 'WhatsApp webhook received'),
    
    connectionStatus: (instanceId, status) => logger.info({ 
      event: 'connection_status', 
      instanceId, 
      status 
    }, 'WhatsApp connection status changed'),
  },
  
  // Logs de API
  api: {
    request: (method, path, userId) => logger.debug({ 
      event: 'api_request', 
      method, 
      path, 
      userId 
    }, 'API request'),
    
    slowQuery: (query, duration) => logger.warn({ 
      event: 'slow_query', 
      query, 
      duration 
    }, 'Slow database query detected'),
  }
};

export default logger;
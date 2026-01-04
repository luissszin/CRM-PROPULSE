import crypto from 'crypto';
import { log } from '../utils/logger.js';

/**
 * Middleware: Valida assinatura HMAC de webhooks
 * Garante que apenas provedores autorizados podem enviar webhooks
 * 
 * COMO USAR:
 * router.post('/webhook', validateWebhookSignature, handler);
 * 
 * O provedor deve enviar:
 * - Header: X-Webhook-Signature
 * - Algoritmo: HMAC-SHA256 do body raw com WEBHOOK_SECRET
 */
export const validateWebhookSignature = (req, res, next) => {
  try {
    const signature = req.headers['x-webhook-signature'] || req.headers['x-hub-signature-256'];
    
    if (!signature) {
      log.warn('Webhook sem assinatura recebido', { 
        ip: req.ip,
        path: req.path
      });
      // ⚠️ Em produção, devemos rejeitar. Em dev, vamos logar e permitir.
      if (process.env.NODE_ENV === 'production') {
        return res.status(401).json({ error: 'Missing webhook signature' });
      }
      return next(); // Permitir em dev
    }

    // Secret configurável por provedor
    const secret = process.env.WEBHOOK_SECRET || 'dev-webhook-secret-change-in-production';
    
    // Recomputar hash do body
    const bodyString = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(bodyString)
      .digest('hex');
    
    // Comparar assinaturas (timing-safe para prevenir timing attacks)
    const providedSignature = signature.replace('sha256=', '');
    
    if (!crypto.timingSafeEqual(Buffer.from(providedSignature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
      log.security.forbiddenAccess(
        'webhook',
        req.path,
        'Invalid webhook signature'
      );
      return res.status(403).json({ error: 'Invalid webhook signature' });
    }

    log.info('Webhook signature validated', { path: req.path });
    next();
  } catch (err) {
    log.error('Webhook signature validation error', err);
    return res.status(500).json({ error: 'Webhook validation failed' });
  }
};

/**
 * Middleware: Valida que o webhook vem de um IP whitelist
 * Útil para Evolution API e Meta (IPs conhecidos)
 */
export const validateWebhookIP = (allowedIPs = []) => {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (allowedIPs.length === 0) {
      // Se não configurou whitelist, permitir (com log)
      log.warn('Webhook IP validation disabled (no whitelist configured)');
      return next();
    }
    
    if (!allowedIPs.includes(clientIP)) {
      log.security.forbiddenAccess(
        'webhook',
        req.path,
        `Webhook from unauthorized IP: ${clientIP}`
      );
      return res.status(403).json({ error: 'Unauthorized IP address' });
    }
    
    next();
  };
};

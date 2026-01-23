import rateLimit from 'express-rate-limit';
import { log } from '../utils/logger.js';

// Helper for strict test bypass
const isTestBypass = (req) => {
  if (process.env.NODE_ENV !== 'test') return false;
  if (req.headers['x-test-bypass'] !== 'true') return false;
  
  // Extra layer: Must be CI, Localhost or Explicitly Enabled
  // '::1' is IPv6 localhost, '127.0.0.1' is IPv4
  const isLocal = req.ip === '::1' || req.ip === '127.0.0.1' || req.ip === '::ffff:127.0.0.1';
  const isCI = process.env.CI === 'true';
  const isExplicit = process.env.ENABLE_TEST_BYPASS === 'true';

  return isCI || isLocal || isExplicit;
};

// Rate limiter global (aplicado em todas as rotas da API)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, 
  skip: isTestBypass,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true, 
  legacyHeaders: false, 
  handler: (req, res) => {
    log.warn('Rate limit exceeded', { 
      ip: req.ip, 
      path: req.path,
      method: req.method
    });
    res.status(429).json({ error: 'Too many requests, please try again later.' });
  }
});


// Rate limiter ESTRITO para login (prevenir brute force)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo 5 tentativas de login
  skipSuccessfulRequests: true, // Não contar logins bem-sucedidos
  skip: isTestBypass,
  message: { error: 'Too many login attempts, please try again in 15 minutes.' },
  handler: (req, res) => {
    log.security.authFailed(req.body?.email || 'unknown', 'Rate limit exceeded');
    res.status(429).json({ 
      error: 'Too many login attempts, please try again in 15 minutes.' 
    });
  }
});

// Rate limiter para webhooks (prevenir spam)
export const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 60, // Máximo 60 webhooks por minuto (1/segundo)
  message: { error: 'Webhook rate limit exceeded' },
  handler: (req, res) => {
    log.warn('Webhook rate limit exceeded', { 
      ip: req.ip,
      provider: req.body?.provider || 'unknown'
    });
    res.status(429).json({ error: 'Webhook rate limit exceeded' });
  }
});

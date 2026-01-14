import rateLimit from 'express-rate-limit';
import { log } from '../utils/logger.js';

// Rate limiter global (aplicado em todas as rotas da API)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // Máximo de 1000 requests por IP (aumentado para evitar bloqueio em desenvolvimento/polling)
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true, // Retorna info de limite nos headers `RateLimit-*`
  legacyHeaders: false, // Desabilita headers `X-RateLimit-*`
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

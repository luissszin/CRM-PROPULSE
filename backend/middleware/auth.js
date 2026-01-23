import jwt from 'jsonwebtoken';
import { supabase } from '../services/supabaseService.js';
import { log } from '../utils/logger.js';
import { env } from '../config/env.js';

const JWT_SECRET = env.jwtSecret;

/**
 * Middleware: Valida JWT e anexa user ao req
 * Uso: app.use(requireAuth)
 */
export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      log.security.authFailed('unknown', 'Missing authorization header');
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '
    
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      log.security.authFailed('unknown', 'Invalid or expired token');
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Buscar usuário atualizado no DB (segurança extra)
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, role, unit_id')
      .eq('id', decoded.id)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Anexar user ao request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      unitId: user.unit_id
    };

    log.security.authSuccess(user.id, user.email);
    next();
  } catch (err) {
    console.error('[requireAuth] Error:', err);
    return res.status(500).json({ error: 'Authentication error' });
  }
};



/**
 * Middleware: Valida que o user tem role específico
 * Uso: app.use(requireRole(['super_admin']))
 */
export const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Forbidden: Insufficient permissions',
        required: allowedRoles,
        current: req.user.role
      });
    }

    next();
  };
};

/**
 * Middleware: Garante que unitId vem da query ou body e bate com o user
 * Super Admin pode acessar qualquer unidade
 * Outros users DEVEM estar na mesma unidade
 */
export const requireUnitContext = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // 1. Super Admin: Pode definir unitId via query/body
  if (req.user.role === 'super_admin') {
    let requestedUnitId = req.query?.unitId || req.query?.unit_id || req.body?.unitId || req.body?.unit_id || req.params?.unitId;
    
    // Sanitize string "null" or "undefined"
    if (requestedUnitId === 'null' || requestedUnitId === 'undefined') {
      requestedUnitId = null;
    }

    if (requestedUnitId) {
      req.unitId = requestedUnitId; // Admin trocando de contexto
    } else {
      // Se não especificou, usa o contexto pessoal (se tiver)
      req.unitId = req.user.unitId || null;
    }
    return next();
  }


  // 2. Usuários Regulares (Agent, Admin): Contexto é SEMPRE o do token
  if (!req.user.unitId) {
    log.security.authFailed(req.user.email, 'User without unitId attempted action');
    return res.status(403).json({ error: 'Forbidden: User has no assigned unit' });
  }

  // Detect tentative de acesso a outra unidade
  const requestedUnitId = req.query?.unitId || req.query?.unit_id || req.body?.unitId || req.body?.unit_id || req.params?.unitId;
  if (requestedUnitId && requestedUnitId !== req.user.unitId && requestedUnitId !== 'undefined' && requestedUnitId !== 'null') {
      log.security.authFailed(req.user.email, `Cross-tenant access attempt: requested ${requestedUnitId} but belongs to ${req.user.unitId}`);
      return res.status(403).json({ error: 'Forbidden: Accessing data from another unit is not allowed' });
  }

  // Force token's unitId
  req.unitId = req.user.unitId;

  // Final sanitization
  if (req.unitId === 'null' || req.unitId === 'undefined') {
    req.unitId = null;
  }

  next();
};



// Aliases para compatibilidade
export const authenticateToken = requireAuth;
export const requireUnitAccess = requireUnitContext;

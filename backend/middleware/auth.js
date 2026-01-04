import jwt from 'jsonwebtoken';
import { supabase } from '../services/supabaseService.js';
import { log } from '../utils/logger.js';

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'your-access-secret-key-change-in-production';

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

  // Extrair unitId da query, body ou params (suporta unitId e unit_id)
  const requestedUnitId = req.query.unitId || req.query.unit_id || req.body.unitId || req.body.unit_id || req.params.unitId;

  if (!requestedUnitId) {
    // Se não enviou unitId, usa o do usuário (se houver)
    if (req.user.unitId) {
      req.unitId = req.user.unitId;
      return next();
    }
    return res.status(400).json({ error: 'unitId required' });
  }

  // Super Admin pode acessar qualquer unidade
  if (req.user.role === 'super_admin') {
    req.unitId = requestedUnitId;
    return next();
  }

  // Usuários regulares só podem acessar sua própria unidade
  if (req.user.unitId !== requestedUnitId) {
    log.security.crossTenantAttempt(req.user.id, req.user.unitId, requestedUnitId);
    return res.status(403).json({ 
      error: 'Forbidden: Cannot access data from another unit',
      your_unit: req.user.unitId,
      requested_unit: requestedUnitId
    });
  }

  req.unitId = requestedUnitId;
  next();
};

// Aliases para compatibilidade
export const authenticateToken = requireAuth;
export const requireUnitAccess = requireUnitContext;

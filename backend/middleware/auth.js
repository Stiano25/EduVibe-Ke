import { verifyToken } from '../utils/jwt.js';

/**
 * Require a valid Bearer JWT and attach claims to req.user.
 */
export const authenticate = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = header.slice(7).trim();
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.id,
      role: payload.role,
      grade: payload.grade ?? null,
      email: payload.email,
      name: payload.name
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Require req.user.role to be one of the allowed roles.
 * Must run after authenticate.
 */
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  next();
};

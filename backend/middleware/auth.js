const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'bloodchain_super_secret_key_2025';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    logger.warn(`Unauthorized access attempt to ${req.path}`);
    return res.status(401).json({ error: 'Access token required', code: 'UNAUTHORIZED' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      logger.warn(`Invalid JWT token for ${req.path}: ${err.message}`);
      return res.status(403).json({ error: 'Invalid or expired token', code: 'FORBIDDEN' });
    }
    req.user = user;
    next();
  });
}

function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!roles.includes(req.user.role)) {
      logger.warn(`User ${req.user.wallet_address || req.user.username} with role ${req.user.role} attempted to access restricted endpoint ${req.path}`);
      return res.status(403).json({ error: 'Insufficient permissions', code: 'INSUFFICIENT_ROLE' });
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  requireRole,
  JWT_SECRET,
};

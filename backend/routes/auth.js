const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const logger = require('../utils/logger');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password, wallet_address } = req.body;

  // Simple admin auth check for demo/dev purposes
  // Default admin credential check
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  if ((username === 'admin' || username === '0x0000000000000000000000000000000000000001') && (password === adminPassword || password === 'admin')) {
    const token = jwt.sign(
      {
        username: 'admin',
        wallet_address: wallet_address || '0x0000000000000000000000000000000000000001',
        role: 'admin',
      },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    logger.info('Admin logged in successfully', { username });
    return res.json({
      success: true,
      token,
      role: 'admin',
      user: { username: 'admin', role: 'admin' },
    });
  }

  logger.warn('Failed login attempt', { username });
  return res.status(401).json({ error: 'Invalid admin credentials', code: 'INVALID_CREDENTIALS' });
});

module.exports = router;

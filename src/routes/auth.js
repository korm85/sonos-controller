const express = require('express');
const authService = require('../services/auth');
const router = express.Router();

router.post('/google', async (req, res) => {
  try {
    const { authCode } = req.body;
    if (!authCode) return res.status(400).json({ error: 'authCode required' });
    const result = await authService.authenticate(authCode);
    res.json(result);
  } catch (err) {
    console.error('Auth route error:', err.message);
    res.status(401).json({ error: err.message });
  }
});

router.get('/status', async (req, res) => {
  res.json({ authenticated: authService.isAuthenticated() });
});

module.exports = router;
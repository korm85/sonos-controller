const express = require('express');
const sonosService = require('../services/sonos');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const speakers = await sonosService.discoverSpeakers();
    res.json(speakers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/select', async (req, res) => {
  try {
    const { host } = req.body;
    if (!host) return res.status(400).json({ error: 'host required' });
    
    // Ensure we've discovered speakers first
    await sonosService.ensureDiscovered();
    
    const speaker = sonosService.setActiveSpeaker(host);
    res.json(speaker);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
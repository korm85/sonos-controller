const express = require('express');
const streamerService = require('../services/streamer');
const router = express.Router();

// Get cache stats
router.get('/', async (req, res) => {
  try {
    const stats = streamerService.getCacheStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear cache (remove all cached files)
router.post('/clear', async (req, res) => {
  try {
    const result = streamerService.cleanup();
    // Force-delete everything
    const fs = require('fs');
    const path = require('path');
    const CACHE_DIR = '/tmp/sonos-audio-cache';
    let deleted = 0;
    try {
      const files = fs.readdirSync(CACHE_DIR);
      for (const f of files) {
        if (f.endsWith('.mp4') || f.endsWith('.part')) {
          fs.unlinkSync(path.join(CACHE_DIR, f));
          deleted++;
        }
      }
    } catch {}
    res.json({ status: 'cleared', deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

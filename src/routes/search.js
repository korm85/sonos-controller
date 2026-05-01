const express = require('express');
const youtubeService = require('../services/youtube');
const streamerService = require('../services/streamer');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'query required' });

    const results = await youtubeService.search(q);
    
    // Pre-resolve stream URLs for all results (background, don't wait)
    // This makes playback instant when user clicks a result
    const ids = results.map(r => r.id).filter(Boolean);
    if (ids.length > 0) {
      streamerService.preResolve(ids);
    }

    res.json(results);
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

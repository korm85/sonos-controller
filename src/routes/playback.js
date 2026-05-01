const express = require('express');
const sonosService = require('../services/sonos');
const streamerService = require('../services/streamer');
const youtubeService = require('../services/youtube');
const router = express.Router();

// Play a known video ID
router.post('/play', async (req, res) => {
  try {
    const { trackId, title, artist, source = 'youtube', thumbnail = '', duration = 0 } = req.body;
    if (!trackId) return res.status(400).json({ error: 'trackId required' });

    const streamUrl = streamerService.getStreamUrl(trackId);
    console.log(`[playback] Playing: ${title || trackId}`);
    
    await sonosService.play(streamUrl, title, artist, thumbnail, duration);
    res.json({ status: 'playing', trackId, streamUrl });
  } catch (err) {
    console.error('Play error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Search YouTube and play the first result
router.post('/search-play', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'query required' });

    const results = await youtubeService.search(query);
    if (results.length === 0) return res.status(404).json({ error: 'No results found' });

    const track = results[0];
    const streamUrl = streamerService.getStreamUrl(track.id);
    
    await sonosService.play(streamUrl, track.title, track.artist, track.thumbnail, track.duration);
    
    res.json({
      status: 'playing',
      track: {
        id: track.id, title: track.title, artist: track.artist, duration: track.duration, thumbnail: track.thumbnail
      },
      streamUrl,
      results: results.slice(0, 20).map(r => ({
        id: r.id, title: r.title, artist: r.artist, duration: r.duration, thumbnail: r.thumbnail
      }))
    });
  } catch (err) {
    console.error('Search-play error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/pause', async (req, res) => {
  try { await sonosService.pause(); res.json({ status: 'paused' }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/resume', async (req, res) => {
  try { await sonosService.resume(); res.json({ status: 'resumed' }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/stop', async (req, res) => {
  try { await sonosService.stop(); res.json({ status: 'stopped' }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/skip', async (req, res) => {
  try { await sonosService.skip(); res.json({ status: 'skipped' }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/previous', async (req, res) => {
  try { await sonosService.previous(); res.json({ status: 'previous' }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// Seek to position in seconds
router.post('/seek', async (req, res) => {
  try {
    const { position } = req.body;
    if (position === undefined || position < 0) {
      return res.status(400).json({ error: 'position (seconds) required' });
    }
    await sonosService.seek(position);
    res.json({ status: 'seeked', position });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/volume', async (req, res) => {
  try {
    const { level } = req.body;
    if (level === undefined || level < 0 || level > 100) {
      return res.status(400).json({ error: 'level must be 0-100' });
    }
    await sonosService.setVolume(level);
    res.json({ status: 'volume set', level });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/volume/up', async (req, res) => {
  try {
    const current = await sonosService.getVolume();
    const newVol = Math.min(100, current + 10);
    await sonosService.setVolume(newVol);
    res.json({ status: 'volume up', level: newVol });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/volume/down', async (req, res) => {
  try {
    const current = await sonosService.getVolume();
    const newVol = Math.max(0, current - 10);
    await sonosService.setVolume(newVol);
    res.json({ status: 'volume down', level: newVol });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/now-playing', async (req, res) => {
  try {
    const info = await sonosService.getNowPlaying();
    res.json(info);
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// Queue a track (add to Sonos queue without playing)
router.post('/queue', async (req, res) => {
  try {
    const { trackId, title, artist, thumbnail = '', duration = 0 } = req.body;
    if (!trackId) return res.status(400).json({ error: 'trackId required' });

    const streamUrl = streamerService.getStreamUrl(trackId);
    console.log(`[queue] Adding: ${title || trackId}`);
    
    await sonosService.play(streamUrl, title, artist, thumbnail, duration, true);
    res.json({ status: 'queued', trackId });
  } catch (err) {
    console.error('Queue error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

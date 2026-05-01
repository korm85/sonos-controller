const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const config = require('../config');

const CACHE_DIR = '/tmp/sonos-audio-cache';
const MAX_CACHE_MB = 500;
const FILE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000; // every 30 min

class StreamerService {
  constructor() {
    this.server = null;
    this.downloading = new Map();
    this.cleanupTimer = null;
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  getLocalIP() {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) return iface.address;
      }
    }
    return '127.0.0.1';
  }

  getStreamUrl(videoId) {
    const ip = this.getLocalIP();
    return `http://${ip}:${config.STREAM_PORT}/stream/${videoId}.mp4`;
  }

  getCachePath(videoId) {
    return path.join(CACHE_DIR, `${videoId}.mp4`);
  }

  isCached(videoId) {
    try { return fs.statSync(this.getCachePath(videoId)).size > 10000; } catch { return false; }
  }

  /** Get all cached files sorted by mtime (oldest first) */
  _getCachedFiles() {
    try {
      return fs.readdirSync(CACHE_DIR)
        .filter(f => f.endsWith('.mp4'))
        .map(f => ({
          name: f,
          path: path.join(CACHE_DIR, f),
          videoId: f.replace('.mp4', ''),
          stat: fs.statSync(path.join(CACHE_DIR, f))
        }))
        .sort((a, b) => a.stat.mtimeMs - b.stat.mtimeMs);
    } catch { return []; }
  }

  /** Clean up old cache files */
  cleanup() {
    const files = this._getCachedFiles();
    const now = Date.now();
    let totalMB = 0;
    let deleted = 0;

    for (const f of files) {
      totalMB += f.stat.size / (1024 * 1024);
    }

    // Delete stale files (older than TTL) and .part files first
    for (const f of files) {
      const age = now - f.stat.mtimeMs;
      if (age > FILE_TTL_MS) {
        try {
          fs.unlinkSync(f.path);
          deleted++;
        } catch {}
      }
    }

    // If still over limit, delete oldest files
    if (totalMB > MAX_CACHE_MB) {
      const remaining = this._getCachedFiles();
      let overage = totalMB - MAX_CACHE_MB * 0.8; // aim for 80% of max
      for (const f of remaining) {
        if (overage <= 0) break;
        try {
          const sizeMB = f.stat.size / (1024 * 1024);
          fs.unlinkSync(f.path);
          overage -= sizeMB;
          deleted++;
        } catch {}
      }
    }

    // Also clean up orphaned .part files
    try {
      const parts = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.part'));
      for (const p of parts) {
        const age = now - fs.statSync(path.join(CACHE_DIR, p)).mtimeMs;
        if (age > 600000) { // older than 10 min = failed download
          fs.unlinkSync(path.join(CACHE_DIR, p));
        }
      }
    } catch {}

    if (deleted > 0) console.log(`[streamer] Cleaned ${deleted} stale files`);
    return { deleted, totalMB: Math.round(totalMB) };
  }

  /** Get cache stats */
  getCacheStats() {
    const files = this._getCachedFiles();
    const totalMB = files.reduce((s, f) => s + f.stat.size / (1024 * 1024), 0);
    return {
      files: files.length,
      totalMB: Math.round(totalMB * 10) / 10,
      maxMB: MAX_CACHE_MB,
      filesList: files.slice(-10).map(f => ({
        id: f.videoId,
        age: Math.round((Date.now() - f.stat.mtimeMs) / 60000) + 'm',
        size: (f.stat.size / (1024 * 1024)).toFixed(1) + 'MB'
      })).reverse()
    };
  }

  // Pre-download when search results appear
  async preCacheVideo(videoId) {
    if (this.isCached(videoId)) return;
    if (this.downloading.has(videoId)) return this.downloading.get(videoId);

    const promise = new Promise((resolve) => {
      const outPath = this.getCachePath(videoId);
      console.log(`[streamer] Preloading: ${videoId}`);

      const ytdlp = spawn('/tmp/yt-dlp', [
        '-f', 'bestaudio[ext=m4a]/bestaudio',
        '-o', outPath,
        `https://www.youtube.com/watch?v=${videoId}`
      ]);

      ytdlp.on('close', (code) => {
        console.log(`[streamer] Ready: ${videoId} (${code})`);
        this.downloading.delete(videoId);
        // Run cleanup after each download
        this.cleanup();
        resolve(code === 0);
      });
      ytdlp.on('error', () => { this.downloading.delete(videoId); resolve(false); });
    });

    this.downloading.set(videoId, promise);
    return promise;
  }

  preResolve(ids) {
    for (const id of ids) this.preCacheVideo(id).catch(() => {});
  }

  start() {
    this.server = http.createServer((req, res) => {
      const match = req.url.match(/^\/stream\/([a-zA-Z0-9_-]+)(?:\.mp[34])?$/);
      if (!match) { res.writeHead(404); res.end('Not found'); return; }

      const videoId = match[1];
      const cachePath = this.getCachePath(videoId);

      if (this.isCached(videoId)) {
        const stat = fs.statSync(cachePath);
        const range = req.headers['range'];
        if (range) {
          const parts = range.replace(/bytes=/, '').split('-');
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${stat.size}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': end - start + 1,
            'Content-Type': 'audio/mp4'
          });
          fs.createReadStream(cachePath, { start, end }).pipe(res);
        } else {
          res.writeHead(200, {
            'Content-Length': stat.size,
            'Content-Type': 'audio/mp4',
            'Accept-Ranges': 'bytes'
          });
          fs.createReadStream(cachePath).pipe(res);
        }
        return;
      }

      console.log(`[streamer] Downloading on demand: ${videoId}`);
      this.preCacheVideo(videoId).then((ok) => {
        if (ok && this.isCached(videoId)) {
          const stat = fs.statSync(cachePath);
          res.writeHead(200, {
            'Content-Length': stat.size,
            'Content-Type': 'audio/mp4',
            'Accept-Ranges': 'bytes'
          });
          fs.createReadStream(cachePath).pipe(res);
        } else {
          res.writeHead(503);
          res.end('Download failed');
        }
      });
    });

    this.server.listen(config.STREAM_PORT, config.BIND_ADDRESS, () => {
      console.log(`Stream server listening on ${config.BIND_ADDRESS}:${config.STREAM_PORT}`);
    });
    this.server.on('error', (err) => console.error('Stream server error:', err.message));

    // Periodic cleanup
    this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
    // Also run on startup to clean any stale files
    setTimeout(() => this.cleanup(), 5000);
  }

  stop() {
    if (this.server) this.server.close();
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }
}

module.exports = new StreamerService();

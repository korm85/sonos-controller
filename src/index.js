const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const speakersRouter = require('./routes/speakers');
const searchRouter = require('./routes/search');
const playbackRouter = require('./routes/playback');
const cacheRouter = require('./routes/cache');
const authRouter = require('./routes/auth');
const authService = require('./services/auth');
const streamerService = require('./services/streamer');
const websocketService = require('./services/websocket');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// API routes
app.use('/api/speakers', speakersRouter);
app.use('/api/search', searchRouter);
app.use('/api/playback', playbackRouter);
app.use('/api/cache', cacheRouter);
app.use('/api/auth', authRouter);

// Load auth tokens at startup
authService.loadTokens().catch(console.error);

// HTTP server (for LAN compatibility)
const httpServer = http.createServer(app);
httpServer.listen(config.PORT, config.BIND_ADDRESS, () => {
  console.log(`HTTP server on ${config.BIND_ADDRESS}:${config.PORT}`);
});

// HTTPS server (for PWA support — service workers need HTTPS)
let httpsServer = null;
try {
  const sslKey = path.join(__dirname, '..', 'ssl.key');
  const sslCert = path.join(__dirname, '..', 'ssl.crt');
  if (fs.existsSync(sslKey) && fs.existsSync(sslCert)) {
    const httpsOptions = {
      key: fs.readFileSync(sslKey),
      cert: fs.readFileSync(sslCert),
    };
    const HTTPS_PORT = 3443;
    httpsServer = https.createServer(httpsOptions, app);
    httpsServer.listen(HTTPS_PORT, config.BIND_ADDRESS, () => {
      console.log(`HTTPS server on ${config.BIND_ADDRESS}:${HTTPS_PORT}`);
    });
  }
} catch (err) {
  console.error('Failed to start HTTPS:', err.message);
}

// WebSocket on HTTP (WS doesn't work well over self-signed HTTPS)
websocketService.start(httpServer);

// Start stream server (Sonos pulls from this)
streamerService.start();

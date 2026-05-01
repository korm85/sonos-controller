# MikSonos

**YouTube music streamer for Sonos speakers** — a self-hosted PWA with mobile-first UI.

![MikSonos](https://img.shields.io/badge/Node.js-22+-green) ![License](https://img.shields.io/badge/License-MIT-blue)

---

## Features

- 🎵 Search and stream YouTube audio to Sonos
- 📱 Mobile-first PWA — install on phone home screen
- 🎧 Playlist support — queue multiple tracks
- 🔊 Volume control, seek, skip/previous
- 🌐 Works over LAN (HTTP) or internet (HTTPS)
- 🔒 Self-hosted — your data stays on your hardware

---

## Quick Start

### Prerequisites

- Node.js 18+
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) installed at `/tmp/yt-dlp`
- Sonos speaker on the same network
- FFmpeg in PATH

### Install

```bash
git clone https://github.com/korm85/sonos-controller.git
cd sonos-controller
npm install
```

### Configure

Edit `src/config.js` or set environment variables:

```javascript
SONOS_HOST=192.168.1.159  # Your Sonos speaker IP
PORT=3000                 # HTTP port
STREAM_PORT=3456          # Stream relay port
```

### Run

```bash
node src/index.js
```

Open `http://<your-server>:3000` in a browser.

---

## Project Structure

```
sonos-controller/
├── src/
│   ├── index.js        # Server entry
│   ├── config.js        # Configuration
│   ├── routes/          # API endpoints
│   └── services/        # Sonos, YouTube, streamer
├── public/              # Frontend (PWA)
├── ssl/                 # HTTPS certificates
├── systemd/             # Service file
├── SPEC.md              # Architecture spec
└── CHANGELOG.md         # Version history
```

---

## API Reference

### Playback

```bash
# Play a track
POST /api/playback/play
{"trackId": "dQw4w9WgXcQ", "title": "Never Gonna Give You Up", "artist": "Rick Astley"}

# Queue a track
POST /api/playback/queue
{"trackId": "...", "title": "...", "artist": "..."}

# Controls
POST /api/playback/pause
POST /api/playback/resume
POST /api/playback/stop
POST /api/playback/skip
POST /api/playback/previous
POST /api/playback/seek  {"position": 30}
POST /api/playback/volume {"level": 50}

# Now playing
GET /api/playback/now-playing
```

### Search

```bash
GET /api/search?q=never%20gonna%20give%20you%20up
```

Returns:
```json
[
  {
    "id": "dQw4w9WgXcQ",
    "title": "Rick Astley - Never Gonna Give You Up",
    "artist": "Rick Astley",
    "duration": 213,
    "thumbnail": "https://i.ytimg.com/..."
  }
]
```

---

## Development

```bash
# Run in development
node src/index.js

# Run with PM2 (production)
pm2 start src/index.js --name sonos-controller
pm2 save
pm2 startup
```

---

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit with conventional changelog format
4. Open a PR to `main`

All changes must include an update to `CHANGELOG.md`.

---

## License

MIT — Michael Korenevsky, 2026
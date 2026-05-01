# MikSonos — Specification

## Overview

**MikSonos** is a self-hosted YouTube music streamer for Sonos speakers. It provides a mobile-first PWA interface for searching YouTube, streaming audio to Sonos, and building playlists.

---

## Architecture

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────┐
│   Browser   │────▶│  Express.js     │────▶│   Sonos     │
│   (PWA)     │     │  (Node.js)      │     │   Speaker   │
└─────────────┘     └────────┬────────┘     └─────────────┘
                             │
                    ┌────────▼────────┐
                    │  Streamer      │
                    │  (yt-dlp +     │
                    │   FFmpeg)      │
                    └────────────────┘
```

**Ports:**
- HTTP: `3000` (LAN access)
- HTTPS: `3443` (PWA / service worker support)

---

## Tech Stack

- **Backend:** Node.js, Express
- **Sonos:** `sonos` npm package + SSDP discovery
- **YouTube:** `yt-dlp` for search and stream extraction
- **Frontend:** Vanilla JS, CSS (no framework)
- **PWA:** Service worker + manifest for installability
- **Streaming:** FFmpeg stream to Sonos via HTTP

---

## API Endpoints

### Playback
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/playback/play` | Play a track (trackId, title, artist, thumbnail, duration) |
| `POST` | `/api/playback/queue` | Queue a track without playing |
| `POST` | `/api/playback/pause` | Pause |
| `POST` | `/api/playback/resume` | Resume |
| `POST` | `/api/playback/stop` | Stop |
| `POST` | `/api/playback/skip` | Next track |
| `POST` | `/api/playback/previous` | Previous track |
| `POST` | `/api/playback/seek` | Seek (position in seconds) |
| `POST` | `/api/playback/volume` | Set volume (0-100) |
| `GET` | `/api/playback/now-playing` | Current track info + position |

### Search
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/search?q=<query>` | Search YouTube, return track list |

### Cache
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/cache` | Cache stats (files, MB) |
| `POST` | `/api/cache/clear` | Clear stream cache |

### Speakers
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/speakers` | List discovered Sonos speakers |

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/auth/url` | YouTube auth URL |
| `POST` | `/api/auth/callback` | YouTube OAuth callback |
| `GET` | `/api/auth/status` | Auth status |

---

## Data Model

### Track
```javascript
{
  id: string,         // YouTube video ID
  title: string,      // Song title
  artist: string,     // Channel / uploader name
  duration: number,   // Seconds
  thumbnail: string,  // URL
  source: 'youtube'
}
```

### Now Playing Response
```javascript
{
  state: 'playing' | 'paused' | 'stopped' | 'transitioning' | 'error',
  track: {
    title: string,
    artist: string,
    album: string,
    albumArtUri: string,
  },
  volume: number,
  position: number,
  duration: number,
}
```

---

## Playlist System (Client-Side)

- Tracks stored in browser `playlist[]` array
- "+" button adds to playlist
- "▶ Play" plays immediately and queues rest
- Playlist bar shows count + Clear/Play controls
- No persistence (in-memory only, cleared on refresh)

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP server port |
| `BIND_ADDRESS` | `0.0.0.0` | Listen address |
| `SONOS_HOST` | `192.168.1.159` | Default Sonos speaker IP |
| `STREAM_PORT` | `3456` | Stream relay port |

---

## File Structure

```
sonos-controller/
├── src/
│   ├── index.js           # Express server entry
│   ├── config.js          # Configuration
│   ├── routes/
│   │   ├── playback.js    # /api/playback/*
│   │   ├── search.js      # /api/search
│   │   ├── speakers.js    # /api/speakers
│   │   ├── cache.js       # /api/cache
│   │   └── auth.js        # /api/auth (YouTube)
│   └── services/
│       ├── sonos.js       # Sonos device control
│       ├── youtube.js     # YouTube search via yt-dlp
│       ├── streamer.js    # FFmpeg stream handler
│       ├── websocket.js   # WS for real-time updates
│       └── auth.js        # YouTube OAuth
├── public/
│   ├── index.html         # Main PWA UI
│   ├── manifest.json      # PWA manifest
│   └── sw.js             # Service worker
├── ssl/
│   ├── ssl.crt           # Self-signed cert (not in git)
│   └── ssl.key           # Private key (not in git)
├── systemd/
│   └── sonos-controller.service
├── package.json
├── SPEC.md               # This file
├── README.md
└── CHANGELOG.md
```

---

## Known Limitations

- **No persistence:** Playlist is in-memory only (browser refresh clears it)
- **No YouTube auth by default:** Search works without auth; authenticated features need OAuth setup
- **Single speaker:** Uses fixed `SONOS_HOST`; multi-speaker selection not implemented
- **No history:** Previously played tracks not tracked

---

## TODO

- [ ] Playlist persistence (localStorage)
- [ ] Multi-speaker selection UI
- [ ] YouTube OAuth integration
- [ ] Track history / recently played
- [ ] Volume slider with current level from Sonos
- [ ] Album art from YouTube metadata in now-playing
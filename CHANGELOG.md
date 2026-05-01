# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.0.0] — 2026-05-01

### Added

- **Initial project setup** — Express.js server with Sonos integration
- **YouTube search** — `yt-dlp` based search API at `/api/search`
- **Playback routes** — Play, pause, resume, stop, skip, previous, seek, volume
- **Sonos service** — SSDP discovery + direct IP control (default: `192.168.1.159`)
- **Streamer service** — FFmpeg relay for YouTube → Sonos streaming
- **PWA frontend** — Vanilla JS mobile-first UI in `public/index.html`
- **Service worker** — `sw.js` for PWA installability
- **HTTPS support** — Self-signed cert on port 3443 for service worker support
- **Cache management** — `/api/cache` stats and clear endpoint
- **YouTube OAuth routes** — Auth flow at `/api/auth/*` (needs setup)
- **Playlist system** — Client-side queue with + and ▶ Play buttons
- **Track metadata** — Local tracking of title/artist/thumbnail (fixes Sonos showing filename)
- **Queue endpoint** — `/api/playback/queue` for adding tracks without playing

### Fixed

- Now playing returns real song title instead of `.mp4` filename
- Album art populated from YouTube thumbnail data

### Documentation

- `SPEC.md` — Full architecture and API specification
- `README.md` — Quick start and usage guide

---

## [0.0.0] — 2026-04-30

### Added

- Project directory created
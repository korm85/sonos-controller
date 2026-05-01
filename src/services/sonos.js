const SonosDevice = require('sonos').Sonos;
const DeviceDiscovery = require('sonos/lib/deviceDiscovery');

const DEFAULT_HOST = '192.168.1.159';

/**
 * Generate proper DIDL metadata with real song title
 */
function makeDIDL(uri, title, artist) {
  const safeTitle = (title || 'Audio').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const safeArtist = (artist || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  // Sonos recognizes the uri by its .mp4 extension for content type
  return `<DIDL-Lite xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/" xmlns:r="urn:schemas-rinconnetworks-com:metadata-1-0/" xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/">
    <item id="0" parentID="0" restricted="true">
      <dc:title>${safeTitle}</dc:title>
      <dc:creator>${safeArtist}</dc:creator>
      <upnp:class>object.item.audioItem.musicTrack</upnp:class>
      <desc id="cdudn" nameSpace="urn:schemas-rinconnetworks-com:metadata-1-0/">RINCON_AssociatedZPUDN</desc>
    </item>
  </DIDL-Lite>`;
}

class SonosService {
  constructor() {
    this.speakers = new Map();
    this.activeSpeaker = null;
    this.activeHost = null;
    this._discoveryPromise = null;
    // Track current playing info locally (Sonos doesn't always expose it from URLs)
    this._currentTrack = { title: '', artist: '', albumArtUri: '', duration: 0 };
    this._initKnownSpeaker();
  }

  _setCurrentTrack(title, artist, albumArtUri = '', duration = 0) {
    this._currentTrack = { title, artist, albumArtUri, duration };
  }

  _initKnownSpeaker() {
    this.activeHost = DEFAULT_HOST;
    this.activeSpeaker = new SonosDevice(DEFAULT_HOST);
    this.speakers.set(DEFAULT_HOST, {
      id: DEFAULT_HOST,
      name: 'IKEA Symfonisk (Sonos)',
      host: DEFAULT_HOST,
      port: 1400,
      connected: true,
    });
  }

  async discoverSpeakers() {
    if (this._discoveryPromise) return this._discoveryPromise;
    this._discoveryPromise = new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this._discoveryPromise = null;
        resolve(Array.from(this.speakers.values()));
      }, 5000);
      const discovery = new DeviceDiscovery({ timeout: 5000 });
      discovery.on('DeviceAvailable', (device) => {
        if (device.host && device.port) {
          this.speakers.set(device.host, {
            id: device.host,
            name: device.name || 'Sonos Speaker',
            host: device.host,
            port: device.port,
            connected: true,
          });
        }
      });
      discovery.on('timeout', () => {
        clearTimeout(timeout);
        this._discoveryPromise = null;
        resolve(Array.from(this.speakers.values()));
      });
    });
    return this._discoveryPromise;
  }

  async ensureDiscovered() {
    if (this.speakers.size === 0) return this.discoverSpeakers();
    return Array.from(this.speakers.values());
  }

  setActiveSpeaker(host) {
    if (!this.speakers.has(host)) {
      this.speakers.set(host, { id: host, name: `Sonos (${host})`, host, port: 1400, connected: true });
    }
    this.activeHost = host;
    this.activeSpeaker = new SonosDevice(host);
    return this.speakers.get(host);
  }

  async getActiveSpeaker() {
    if (!this.activeSpeaker || !this.activeHost) throw new Error('No active speaker selected');
    return this.activeSpeaker;
  }

  /**
   * Play a song: flush queue, add to queue with proper metadata, play.
   * This shows the real song title on Sonos instead of the filename.
   * Optionally queue to playlist instead of flushing.
   */
  async play(uri, title, artist, albumArtUri = '', duration = 0, queueOnly = false) {
    const speaker = await this.getActiveSpeaker();

    // Stop current playback
    try { await speaker.stop(); } catch {}

    if (!queueOnly) {
      // Clear queue and play immediately
      try { await speaker.flush(); } catch {}

      if (title) {
        const didl = makeDIDL(uri, title, artist);
        const result = await speaker.queue({ uri, metadata: didl });
        if (result && result.FirstTrackNumberEnqueued) {
          await speaker.selectQueue();
          await speaker.selectTrack(result.FirstTrackNumberEnqueued);
        }
      } else {
        await speaker.setAVTransportURI(uri);
      }

      // Track locally so we can return proper info
      this._setCurrentTrack(title, artist, albumArtUri, duration);
      return speaker.play();
    } else {
      // Add to queue without clearing/playing
      if (title) {
        const didl = makeDIDL(uri, title, artist);
        await speaker.queue({ uri, metadata: didl });
      }
      return null;
    }
  }

  /** Play next in queue (after queueing multiple tracks) */
  async playQueued() {
    const speaker = await this.getActiveSpeaker();
    await speaker.selectQueue();
    // Get first track in queue
    const track = await speaker.currentTrack();
    if (track && track.trackUri) {
      await speaker.setAVTransportURI(track.trackUri);
      return speaker.play();
    }
    return speaker.play();
  }

  async pause() { return (await this.getActiveSpeaker()).pause(); }
  async resume() { return (await this.getActiveSpeaker()).play(); }
  async stop() { return (await this.getActiveSpeaker()).stop(); }
  async skip() { return (await this.getActiveSpeaker()).nextTrack(); }
  async previous() { return (await this.getActiveSpeaker()).previousTrack(); }
  async setVolume(level) { return (await this.getActiveSpeaker()).setVolume(level); }
  async getVolume() { return (await this.getActiveSpeaker()).getVolume(); }
  async getCurrentState() { return (await this.getActiveSpeaker()).getCurrentState(); }
  async getCurrentTrack() { return (await this.getActiveSpeaker()).currentTrack(); }

  /** Seek to position in seconds */
  async seek(seconds) {
    return (await this.getActiveSpeaker()).seek(seconds);
  }

  async getNowPlaying() {
    try {
      const speaker = await this.getActiveSpeaker();
      const [state, track, volume] = await Promise.all([
        speaker.getCurrentState(),
        speaker.currentTrack(),
        speaker.getVolume(),
      ]);
      // Prefer locally-tracked track info (has proper title/artwork from streaming URLs)
      // Fall back to Sonos track info if we don't have local data
      const title = this._currentTrack.title || track.title || 'Unknown';
      const artist = this._currentTrack.artist || track.artist || '';
      const albumArtUri = this._currentTrack.albumArtUri || track.albumArtURL || '';
      const position = track.position || 0;
      const duration = this._currentTrack.duration || track.duration || 0;
      return {
        state: state,
        track: {
          title: title,
          artist: artist,
          album: track.album || '',
          albumArtUri: albumArtUri,
        },
        volume: volume,
        position: position,
        duration: duration,
      };
    } catch (err) {
      return {
        state: 'error',
        track: { title: '', artist: '', album: '', albumArtUri: '' },
        volume: 0,
        position: 0,
        duration: 0,
      };
    }
  }
}

module.exports = new SonosService();

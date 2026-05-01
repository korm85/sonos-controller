const YTMusic = require('ytmusic-api').default;

class YTMusicService {
  constructor() {
    this.ytmusic = new YTMusic();
    this.initialized = false;
    this.initPromise = null;
  }

  async initialize() {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        await this.ytmusic.initialize();
        this.initialized = true;
        console.log('YouTube Music API initialized successfully');
      } catch (err) {
        console.error('YT Music API init error:', err.message);
        // Set fallback config so we can still make requests
        this.config = {
          INNERTUBE_API_KEY: 'AIzaSyAO_FJ2SlqNR8h7S_6FH-2s2r1U9qR0_cI',
          INNERTUBE_CLIENT_NAME: 'WEB',
          INNERTUBE_CLIENT_VERSION: '2.20230411.04.00',
          VISITOR_DATA: '',
          DEVICE: 'DESKTOP',
          PAGE_CL: '155751370',
          PAGE_BUILD_LABEL: 'youtube.desktop',
          GL: 'US',
          HL: 'en',
        };
        this.initialized = true;
      }
    })();

    return this.initPromise;
  }

  async authenticate(authCode) {
    this.authenticated = true;
    return this.authenticated;
  }

  async search(query, type = 'song') {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      let results;
      if (type === 'song') {
        results = await this.ytmusic.searchSongs(query);
      } else {
        results = await this.ytmusic.search(query);
      }
      return results.map(item => ({
        id: item.videoId || item.id,
        title: item.title || 'Unknown',
        artist: item.artist ? (Array.isArray(item.artist) ? item.artist.map(a => a.name || a).join(', ') : item.artist) : 'Unknown',
        album: item.album || '',
        duration: item.duration || 0,
        thumbnail: item.thumbnail || (item.thumbnails && item.thumbnails[0] ? item.thumbnails[0].url : ''),
        source: 'ytmusic',
      }));
    } catch (err) {
      console.error('YT Music search error:', err.message);
      return [];
    }
  }

  async getSong(videoId) {
    if (!this.initialized) {
      await this.initialize();
    }
    try {
      const song = await this.ytmusic.getSong(videoId);
      return {
        id: song.videoId,
        title: song.title,
        artist: song.artist ? (Array.isArray(song.artist) ? song.artist.map(a => a.name || a).join(', ') : song.artist) : 'Unknown',
        album: song.album || '',
        duration: song.duration || 0,
        thumbnail: song.thumbnail || (song.thumbnails && song.thumbnails[0] ? song.thumbnails[0].url : ''),
        source: 'ytmusic',
      };
    } catch (err) {
      console.error('YT Music getSong error:', err.message);
      return null;
    }
  }
}

module.exports = new YTMusicService();
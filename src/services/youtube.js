const { spawn } = require('child_process');

class YouTubeService {
  async search(query, limit = 20) {
    return new Promise((resolve) => {
      const ytdlp = spawn('/tmp/yt-dlp', [
        '--flat-playlist',
        '--dump-json',
        `ytsearch${limit}:${query}`
      ]);

      let output = '';
      ytdlp.stdout.on('data', d => output += d.toString());
      ytdlp.on('close', () => {
        const results = output.trim().split('\n').filter(l => l.trim()).map(line => {
          try {
            const item = JSON.parse(line);
            return {
              id: item.id,
              title: item.title || 'Unknown',
              artist: item.channel || item.uploader || 'Unknown',
              duration: item.duration || 0,
              thumbnail: item.thumbnails?.[0]?.url || '',
              source: 'youtube',
              url: `https://www.youtube.com/watch?v=${item.id}`
            };
          } catch { return null; }
        }).filter(Boolean);
        resolve(results);
      });
      ytdlp.on('error', () => resolve([]));
    });
  }

  async searchFirst(query) {
    const results = await this.search(query);
    return results.length > 0 ? results[0] : null;
  }
}

module.exports = new YouTubeService();

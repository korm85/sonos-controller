const WebSocket = require('ws');
const sonosService = require('./sonos');

class WebSocketService {
  constructor() {
    this.clients = new Set();
  }

  start(server) {
    this.wss = new WebSocket.Server({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
      if (request.url === '/ws') {
        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.wss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    });

    this.wss.on('connection', (ws) => {
      console.log('WebSocket client connected');
      this.clients.add(ws);

      // Start sending now-playing updates
      const interval = setInterval(async () => {
        try {
          const info = await sonosService.getNowPlaying();
          const message = JSON.stringify({ event: 'nowPlaying', data: info });
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(message);
          }
        } catch (err) {
          // Speaker may be offline
        }
      }, 2000);

      ws.on('close', () => {
        clearInterval(interval);
        this.clients.delete(ws);
        console.log('WebSocket client disconnected');
      });

      ws.on('error', (err) => {
        console.error('WebSocket error:', err.message);
        clearInterval(interval);
        this.clients.delete(ws);
      });
    });
  }

  broadcast(message) {
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  broadcastNowPlaying() {
    sonosService.getNowPlaying().then(info => {
      this.broadcast(JSON.stringify({ event: 'nowPlaying', data: info }));
    }).catch(() => {});
  }
}

module.exports = new WebSocketService();
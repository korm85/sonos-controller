module.exports = {
  PORT: process.env.PORT || 3000,
  STREAM_PORT: process.env.STREAM_PORT || 3001,
  BIND_ADDRESS: process.env.BIND_ADDRESS || '0.0.0.0',
  TOKEN_PATH: process.env.TOKEN_PATH || '/home/nuc/.sonos-controller-tokens.json',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
};
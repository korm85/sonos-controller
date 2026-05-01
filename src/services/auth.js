const fs = require('fs').promises;
const { OAuth2Client } = require('google-auth-library');
const config = require('../config');

class AuthService {
  constructor() {
    this.client = new OAuth2Client(
      config.GOOGLE_CLIENT_ID,
      config.GOOGLE_CLIENT_SECRET,
      'postmessage'
    );
    this.tokens = null;
  }

  async loadTokens() {
    try {
      const data = await fs.readFile(config.TOKEN_PATH, 'utf8');
      this.tokens = JSON.parse(data);
      console.log('Google tokens loaded from file');
    } catch (err) {
      console.log('No existing Google tokens found');
    }
  }

  async saveTokens() {
    const dir = require('path').dirname(config.TOKEN_PATH);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(config.TOKEN_PATH, JSON.stringify(this.tokens, null, 2));
  }

  async authenticate(authCode) {
    try {
      const { tokens } = await this.client.getToken(authCode);
      this.tokens = tokens;
      await this.saveTokens();
      return { authenticated: true };
    } catch (err) {
      console.error('Auth error:', err.message);
      throw new Error('Authentication failed');
    }
  }

  async refreshToken() {
    if (!this.tokens || !this.tokens.refresh_token) {
      throw new Error('No refresh token available');
    }
    try {
      const { tokens } = await this.client.refreshToken(this.tokens.refresh_token);
      this.tokens = tokens;
      await this.saveTokens();
      return tokens;
    } catch (err) {
      console.error('Token refresh error:', err.message);
      throw err;
    }
  }

  async getAccessToken() {
    if (!this.tokens) {
      throw new Error('Not authenticated');
    }
    if (this.tokens.expiry_date && this.tokens.expiry_date < Date.now()) {
      await this.refreshToken();
    }
    return this.tokens.access_token;
  }

  isAuthenticated() {
    return !!this.tokens;
  }
}

module.exports = new AuthService();
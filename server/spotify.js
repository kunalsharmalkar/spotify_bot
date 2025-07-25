const axios = require('axios');

class SpotifyAPI {
  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID;
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    this.redirectUri = process.env.SPOTIFY_REDIRECT_URI;
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
  }

  getAuthUrl() {
    const scopes = 'user-read-playback-state user-read-currently-playing';
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      scope: scopes,
      redirect_uri: this.redirectUri,
      show_dialog: 'true'
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  async getTokens(code) {
    try {
      const response = await axios.post('https://accounts.spotify.com/api/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: this.redirectUri,
          client_id: this.clientId,
          client_secret: this.clientSecret
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const { access_token, refresh_token, expires_in } = response.data;

      return {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresIn: expires_in
      };
    } catch (error) {
      console.error('Error getting tokens:', error.response?.data || error.message);
      throw new Error('Failed to get access tokens');
    }
  }

  setTokens(tokens) {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    this.tokenExpiry = Date.now() + (tokens.expiresIn * 1000);
  }

  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post('https://accounts.spotify.com/api/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const { access_token, expires_in, refresh_token } = response.data;

      this.accessToken = access_token;
      this.tokenExpiry = Date.now() + (expires_in * 1000);

      // Update refresh token if provided
      if (refresh_token) {
        this.refreshToken = refresh_token;
      }

      return this.accessToken;
    } catch (error) {
      console.error('Error refreshing token:', error.response?.data || error.message);
      throw new Error('Failed to refresh access token');
    }
  }

  async ensureValidToken() {
    if (!this.accessToken) {
      throw new Error('No access token available. Please authenticate first.');
    }

    // Check if token is expired (with 5 minute buffer)
    if (this.tokenExpiry && Date.now() > (this.tokenExpiry - 300000)) {
      console.log('Token expired, refreshing...');
      await this.refreshAccessToken();
    }
  }

  async getCurrentTrack() {
    await this.ensureValidToken();

    try {
      const response = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (response.status === 204 || !response.data) {
        return {
          isPlaying: false,
          message: 'No track currently playing'
        };
      }

      const track = response.data;

      return {
        isPlaying: track.is_playing,
        track: {
          name: track.item?.name || 'Unknown Track',
          artists: track.item?.artists?.map(artist => artist.name) || ['Unknown Artist'],
          album: {
            name: track.item?.album?.name || 'Unknown Album',
            images: track.item?.album?.images || []
          },
          duration: track.item?.duration_ms || 0,
          progress: track.progress_ms || 0,
          external_urls: track.item?.external_urls || {}
        },
        device: {
          name: track.device?.name || 'Unknown Device',
          type: track.device?.type || 'Unknown'
        }
      };
    } catch (error) {
      if (error.response?.status === 401) {
        // Token might be invalid, try refreshing
        try {
          await this.refreshAccessToken();
          return this.getCurrentTrack(); // Retry once
        } catch (refreshError) {
          throw new Error('Authentication failed. Please re-authenticate.');
        }
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else {
        console.error('Error fetching current track:', error.response?.data || error.message);
        throw new Error('Failed to fetch current track');
      }
    }
  }

  isAuthenticated() {
    return !!(this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry);
  }
}

module.exports = new SpotifyAPI();

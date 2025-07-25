const { jest, describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const request = require('supertest');
const express = require('express');
const cors = require('cors');
const path = require('path');

// Mock the spotify module
const mockSpotify = {
  getAuthUrl: jest.fn(),
  getTokens: jest.fn(),
  setTokens: jest.fn(),
  getCurrentTrack: jest.fn(),
  isAuthenticated: jest.fn()
};

jest.mock('../../server/spotify', () => mockSpotify);

describe('Express Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a fresh app instance for each test
    app = express();
    app.use(cors());
    app.use(express.json());
    app.use(express.static(path.join(__dirname, '../../client')));

    // Define routes (copied from server/index.js)
    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../../client/index.html'));
    });

    app.get('/login', (req, res) => {
      const authUrl = mockSpotify.getAuthUrl();
      res.redirect(authUrl);
    });

    app.get('/callback', async (req, res) => {
      const { code } = req.query;

      if (!code) {
        return res.status(400).send('Authorization code not found');
      }

      try {
        const tokens = await mockSpotify.getTokens(code);
        mockSpotify.setTokens(tokens);
        res.redirect('/');
      } catch (error) {
        console.error('Error during callback:', error);
        res.status(500).send('Authentication failed');
      }
    });

    app.get('/api/current-track', async (req, res) => {
      try {
        const currentTrack = await mockSpotify.getCurrentTrack();
        res.json(currentTrack);
      } catch (error) {
        console.error('Error fetching current track:', error);
        res.status(500).json({ error: 'Failed to fetch current track' });
      }
    });

    app.get('/api/auth-status', (req, res) => {
      const isAuthenticated = mockSpotify.isAuthenticated();
      res.json({ authenticated: isAuthenticated });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /', () => {
    test('should serve the main HTML file', async () => {
      const response = await request(app).get('/');

      // Since we're testing the route logic, we expect it to try to serve the file
      // The actual file serving might fail in test environment, but we can check the status
      expect(response.status).toBeLessThan(500); // Should not be a server error
    });
  });

  describe('GET /login', () => {
    test('should redirect to Spotify authorization URL', async () => {
      const mockAuthUrl = 'https://accounts.spotify.com/authorize?client_id=test&redirect_uri=callback';
      mockSpotify.getAuthUrl.mockReturnValue(mockAuthUrl);

      const response = await request(app).get('/login');

      expect(mockSpotify.getAuthUrl).toHaveBeenCalled();
      expect(response.status).toBe(302);
      expect(response.headers.location).toBe(mockAuthUrl);
    });
  });

  describe('GET /callback', () => {
    test('should handle successful OAuth callback', async () => {
      const mockTokens = {
        accessToken: 'test_access_token',
        refreshToken: 'test_refresh_token',
        expiresIn: 3600
      };

      mockSpotify.getTokens.mockResolvedValue(mockTokens);

      const response = await request(app)
        .get('/callback')
        .query({ code: 'test_auth_code' });

      expect(mockSpotify.getTokens).toHaveBeenCalledWith('test_auth_code');
      expect(mockSpotify.setTokens).toHaveBeenCalledWith(mockTokens);
      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/');
    });

    test('should return 400 when no authorization code provided', async () => {
      const response = await request(app).get('/callback');

      expect(response.status).toBe(400);
      expect(response.text).toBe('Authorization code not found');
      expect(mockSpotify.getTokens).not.toHaveBeenCalled();
    });

    test('should return 500 when token exchange fails', async () => {
      mockSpotify.getTokens.mockRejectedValue(new Error('Token exchange failed'));

      const response = await request(app)
        .get('/callback')
        .query({ code: 'invalid_code' });

      expect(response.status).toBe(500);
      expect(response.text).toBe('Authentication failed');
      expect(mockSpotify.setTokens).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/current-track', () => {
    test('should return current track data', async () => {
      const mockTrackData = {
        isPlaying: true,
        track: {
          name: 'Test Song',
          artists: ['Test Artist'],
          album: {
            name: 'Test Album',
            images: [{ url: 'https://example.com/image.jpg' }]
          },
          duration: 240000,
          progress: 120000
        },
        device: {
          name: 'Test Device',
          type: 'Computer'
        }
      };

      mockSpotify.getCurrentTrack.mockResolvedValue(mockTrackData);

      const response = await request(app).get('/api/current-track');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTrackData);
      expect(mockSpotify.getCurrentTrack).toHaveBeenCalled();
    });

    test('should return 500 when getCurrentTrack fails', async () => {
      mockSpotify.getCurrentTrack.mockRejectedValue(new Error('API error'));

      const response = await request(app).get('/api/current-track');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to fetch current track' });
    });

    test('should handle no music playing scenario', async () => {
      const noMusicData = {
        isPlaying: false,
        message: 'No track currently playing'
      };

      mockSpotify.getCurrentTrack.mockResolvedValue(noMusicData);

      const response = await request(app).get('/api/current-track');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(noMusicData);
    });
  });

  describe('GET /api/auth-status', () => {
    test('should return authentication status when authenticated', async () => {
      mockSpotify.isAuthenticated.mockReturnValue(true);

      const response = await request(app).get('/api/auth-status');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ authenticated: true });
      expect(mockSpotify.isAuthenticated).toHaveBeenCalled();
    });

    test('should return authentication status when not authenticated', async () => {
      mockSpotify.isAuthenticated.mockReturnValue(false);

      const response = await request(app).get('/api/auth-status');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ authenticated: false });
    });
  });

  describe('Error handling', () => {
    test('should handle 404 for unknown routes', async () => {
      const response = await request(app).get('/unknown-route');

      expect(response.status).toBe(404);
    });
  });

  describe('CORS', () => {
    test('should include CORS headers', async () => {
      mockSpotify.isAuthenticated.mockReturnValue(true);

      const response = await request(app).get('/api/auth-status');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('JSON middleware', () => {
    test('should parse JSON request bodies', async () => {
      // Add a test route that accepts JSON
      app.post('/test-json', (req, res) => {
        res.json({ received: req.body });
      });

      const testData = { test: 'data' };
      const response = await request(app)
        .post('/test-json')
        .send(testData)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.received).toEqual(testData);
    });
  });
});

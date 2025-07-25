const { jest, describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } = require('@jest/globals');
const request = require('supertest');
const express = require('express');
const cors = require('cors');
const path = require('path');

// Import the actual modules for integration testing
const spotify = require('../../server/spotify');

describe('End-to-End Integration Tests', () => {
  let app;
  let server;

  beforeAll(() => {
    // Create the actual Express app
    app = express();
    app.use(cors());
    app.use(express.json());
    app.use(express.static(path.join(__dirname, '../../client')));

    // Define routes (same as server/index.js)
    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../../client/index.html'));
    });

    app.get('/login', (req, res) => {
      const authUrl = spotify.getAuthUrl();
      res.redirect(authUrl);
    });

    app.get('/callback', async (req, res) => {
      const { code } = req.query;

      if (!code) {
        return res.status(400).send('Authorization code not found');
      }

      try {
        const tokens = await spotify.getTokens(code);
        spotify.setTokens(tokens);
        res.redirect('/');
      } catch (error) {
        console.error('Error during callback:', error);
        res.status(500).send('Authentication failed');
      }
    });

    app.get('/api/current-track', async (req, res) => {
      try {
        const currentTrack = await spotify.getCurrentTrack();
        res.json(currentTrack);
      } catch (error) {
        console.error('Error fetching current track:', error);
        res.status(500).json({ error: 'Failed to fetch current track' });
      }
    });

    app.get('/api/auth-status', (req, res) => {
      const isAuthenticated = spotify.isAuthenticated();
      res.json({ authenticated: isAuthenticated });
    });

    // Start server on a test port
    const PORT = 3001;
    server = app.listen(PORT);
  });

  afterAll((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  beforeEach(() => {
    // Reset spotify state before each test
    spotify.accessToken = null;
    spotify.refreshToken = null;
    spotify.tokenExpiry = null;
  });

  describe('Authentication Flow', () => {
    test('should redirect to Spotify auth URL on /login', async () => {
      const response = await request(app).get('/login');

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('https://accounts.spotify.com/authorize');
      expect(response.headers.location).toContain('client_id=test_client_id');
      expect(response.headers.location).toContain('scope=user-read-playback-state');
    });

    test('should return unauthenticated status initially', async () => {
      const response = await request(app).get('/api/auth-status');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ authenticated: false });
    });

    test('should handle callback without code', async () => {
      const response = await request(app).get('/callback');

      expect(response.status).toBe(400);
      expect(response.text).toBe('Authorization code not found');
    });
  });

  describe('API Endpoints', () => {
    test('should return error when fetching track without authentication', async () => {
      const response = await request(app).get('/api/current-track');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to fetch current track' });
    });

    test('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/auth-status')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Static File Serving', () => {
    test('should serve static files from client directory', async () => {
      // Test that static files are being served (even if they don't exist in test env)
      const response = await request(app).get('/styles.css');

      // Should either serve the file (200) or return 404, but not 500
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/unknown-endpoint');

      expect(response.status).toBe(404);
    });

    test('should handle malformed JSON requests gracefully', async () => {
      const response = await request(app)
        .post('/api/current-track')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      // Should handle malformed JSON without crashing
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Security Headers', () => {
    test('should include CORS headers in API responses', async () => {
      const response = await request(app).get('/api/auth-status');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    test('should handle different HTTP methods appropriately', async () => {
      // Test that POST to GET-only endpoint returns method not allowed or similar
      const response = await request(app).post('/api/auth-status');

      expect([404, 405]).toContain(response.status);
    });
  });

  describe('Application Flow Simulation', () => {
    test('should simulate complete user flow (without actual Spotify)', async () => {
      // 1. Check initial auth status
      let response = await request(app).get('/api/auth-status');
      expect(response.body.authenticated).toBe(false);

      // 2. Try to get current track (should fail)
      response = await request(app).get('/api/current-track');
      expect(response.status).toBe(500);

      // 3. Get login URL
      response = await request(app).get('/login');
      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('spotify.com');

      // 4. Simulate callback failure (no code)
      response = await request(app).get('/callback');
      expect(response.status).toBe(400);
    });
  });

  describe('Performance and Reliability', () => {
    test('should handle multiple concurrent requests', async () => {
      const requests = Array(10).fill().map(() =>
        request(app).get('/api/auth-status')
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ authenticated: false });
      });
    });

    test('should respond within reasonable time', async () => {
      const startTime = Date.now();

      await request(app).get('/api/auth-status');

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });
  });
});

const { jest, describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const axios = require('axios');

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('Spotify API', () => {
  let SpotifyAPI;
  let spotify;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Reset modules to get fresh instance
    jest.resetModules();

    // Require the module after mocking
    SpotifyAPI = require('../../server/spotify');
    spotify = SpotifyAPI;

    // Reset spotify instance state
    spotify.accessToken = null;
    spotify.refreshToken = null;
    spotify.tokenExpiry = null;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAuthUrl', () => {
    test('should generate correct Spotify authorization URL', () => {
      const authUrl = spotify.getAuthUrl();

      expect(authUrl).toContain('https://accounts.spotify.com/authorize');
      expect(authUrl).toContain('client_id=test_client_id');
      expect(authUrl).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback');
      expect(authUrl).toContain('scope=user-read-playback-state%20user-read-currently-playing');
      expect(authUrl).toContain('response_type=code');
      expect(authUrl).toContain('show_dialog=true');
    });
  });

  describe('getTokens', () => {
    test('should successfully exchange code for tokens', async () => {
      const mockResponse = {
        data: {
          access_token: 'mock_access_token',
          refresh_token: 'mock_refresh_token',
          expires_in: 3600
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await spotify.getTokens('test_code');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://accounts.spotify.com/api/token',
        expect.any(URLSearchParams),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        })
      );

      expect(result).toEqual({
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
        expiresIn: 3600
      });
    });

    test('should handle token exchange errors', async () => {
      const mockError = {
        response: {
          data: { error: 'invalid_grant' }
        }
      };

      mockedAxios.post.mockRejectedValueOnce(mockError);

      await expect(spotify.getTokens('invalid_code')).rejects.toThrow('Failed to get access tokens');
    });
  });

  describe('setTokens', () => {
    test('should set tokens and calculate expiry time', () => {
      const tokens = {
        accessToken: 'test_access_token',
        refreshToken: 'test_refresh_token',
        expiresIn: 3600
      };

      const beforeTime = Date.now();
      spotify.setTokens(tokens);
      const afterTime = Date.now();

      expect(spotify.accessToken).toBe('test_access_token');
      expect(spotify.refreshToken).toBe('test_refresh_token');
      expect(spotify.tokenExpiry).toBeGreaterThanOrEqual(beforeTime + 3600000);
      expect(spotify.tokenExpiry).toBeLessThanOrEqual(afterTime + 3600000);
    });
  });

  describe('refreshAccessToken', () => {
    test('should successfully refresh access token', async () => {
      spotify.refreshToken = 'test_refresh_token';

      const mockResponse = {
        data: {
          access_token: 'new_access_token',
          expires_in: 3600,
          refresh_token: 'new_refresh_token'
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await spotify.refreshAccessToken();

      expect(result).toBe('new_access_token');
      expect(spotify.accessToken).toBe('new_access_token');
      expect(spotify.refreshToken).toBe('new_refresh_token');
    });

    test('should throw error when no refresh token available', async () => {
      spotify.refreshToken = null;

      await expect(spotify.refreshAccessToken()).rejects.toThrow('No refresh token available');
    });

    test('should handle refresh token errors', async () => {
      spotify.refreshToken = 'invalid_refresh_token';

      const mockError = {
        response: {
          data: { error: 'invalid_grant' }
        }
      };

      mockedAxios.post.mockRejectedValueOnce(mockError);

      await expect(spotify.refreshAccessToken()).rejects.toThrow('Failed to refresh access token');
    });
  });

  describe('getCurrentTrack', () => {
    beforeEach(() => {
      spotify.accessToken = 'valid_access_token';
      spotify.tokenExpiry = Date.now() + 3600000; // 1 hour from now
    });

    test('should return current track data when music is playing', async () => {
      const mockTrackData = {
        is_playing: true,
        item: {
          name: 'Test Song',
          artists: [{ name: 'Test Artist' }],
          album: {
            name: 'Test Album',
            images: [{ url: 'https://example.com/image.jpg' }]
          },
          duration_ms: 240000,
          external_urls: { spotify: 'https://open.spotify.com/track/123' }
        },
        progress_ms: 120000,
        device: {
          name: 'Test Device',
          type: 'Computer'
        }
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockTrackData });

      const result = await spotify.getCurrentTrack();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.spotify.com/v1/me/player/currently-playing',
        {
          headers: {
            'Authorization': 'Bearer valid_access_token'
          }
        }
      );

      expect(result).toEqual({
        isPlaying: true,
        track: {
          name: 'Test Song',
          artists: ['Test Artist'],
          album: {
            name: 'Test Album',
            images: [{ url: 'https://example.com/image.jpg' }]
          },
          duration: 240000,
          progress: 120000,
          external_urls: { spotify: 'https://open.spotify.com/track/123' }
        },
        device: {
          name: 'Test Device',
          type: 'Computer'
        }
      });
    });

    test('should return no track playing when response is 204', async () => {
      mockedAxios.get.mockResolvedValueOnce({ status: 204, data: null });

      const result = await spotify.getCurrentTrack();

      expect(result).toEqual({
        isPlaying: false,
        message: 'No track currently playing'
      });
    });

    test('should handle 401 unauthorized and retry after refresh', async () => {
      const unauthorizedError = {
        response: { status: 401 }
      };

      const mockTrackData = {
        is_playing: true,
        item: {
          name: 'Test Song After Refresh',
          artists: [{ name: 'Test Artist' }],
          album: {
            name: 'Test Album',
            images: []
          },
          duration_ms: 180000
        },
        progress_ms: 90000,
        device: { name: 'Test Device' }
      };

      // First call fails with 401, second call succeeds
      mockedAxios.get
        .mockRejectedValueOnce(unauthorizedError)
        .mockResolvedValueOnce({ data: mockTrackData });

      // Mock refresh token call
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'refreshed_access_token',
          expires_in: 3600
        }
      });

      spotify.refreshToken = 'valid_refresh_token';

      const result = await spotify.getCurrentTrack();

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://accounts.spotify.com/api/token',
        expect.any(URLSearchParams),
        expect.any(Object)
      );

      expect(result.track.name).toBe('Test Song After Refresh');
    });

    test('should handle rate limiting (429 error)', async () => {
      const rateLimitError = {
        response: { status: 429 }
      };

      mockedAxios.get.mockRejectedValueOnce(rateLimitError);

      await expect(spotify.getCurrentTrack()).rejects.toThrow('Rate limit exceeded. Please try again later.');
    });

    test('should throw error when no access token available', async () => {
      spotify.accessToken = null;

      await expect(spotify.getCurrentTrack()).rejects.toThrow('No access token available. Please authenticate first.');
    });
  });

  describe('isAuthenticated', () => {
    test('should return true when token is valid and not expired', () => {
      spotify.accessToken = 'valid_token';
      spotify.tokenExpiry = Date.now() + 3600000; // 1 hour from now

      expect(spotify.isAuthenticated()).toBe(true);
    });

    test('should return false when no access token', () => {
      spotify.accessToken = null;
      spotify.tokenExpiry = Date.now() + 3600000;

      expect(spotify.isAuthenticated()).toBe(false);
    });

    test('should return false when token is expired', () => {
      spotify.accessToken = 'valid_token';
      spotify.tokenExpiry = Date.now() - 1000; // 1 second ago

      expect(spotify.isAuthenticated()).toBe(false);
    });

    test('should return false when no token expiry set', () => {
      spotify.accessToken = 'valid_token';
      spotify.tokenExpiry = null;

      expect(spotify.isAuthenticated()).toBe(false);
    });
  });

  describe('ensureValidToken', () => {
    test('should refresh token when close to expiry', async () => {
      spotify.accessToken = 'valid_token';
      spotify.refreshToken = 'valid_refresh_token';
      spotify.tokenExpiry = Date.now() + 200000; // 3.33 minutes from now (less than 5 minute buffer)

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'refreshed_token',
          expires_in: 3600
        }
      });

      await spotify.ensureValidToken();

      expect(mockedAxios.post).toHaveBeenCalled();
      expect(spotify.accessToken).toBe('refreshed_token');
    });

    test('should not refresh token when not close to expiry', async () => {
      spotify.accessToken = 'valid_token';
      spotify.tokenExpiry = Date.now() + 3600000; // 1 hour from now

      await spotify.ensureValidToken();

      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });
});

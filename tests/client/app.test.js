/**
 * @jest-environment jsdom
 */

const { jest, describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

// Mock fetch globally
global.fetch = jest.fn();

describe('VibeCanvas Frontend', () => {
  let vibeCanvas;
  let mockElements;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';

    // Create mock DOM elements
    mockElements = {
      authSection: document.createElement('div'),
      loadingSection: document.createElement('div'),
      musicSection: document.createElement('div'),
      errorSection: document.createElement('div'),
      noMusicSection: document.createElement('div'),
      loginBtn: document.createElement('button'),
      refreshBtn: document.createElement('button'),
      logoutBtn: document.createElement('button'),
      retryBtn: document.createElement('button'),
      checkAgainBtn: document.createElement('button'),
      albumArt: document.createElement('img'),
      trackName: document.createElement('h2'),
      artistName: document.createElement('p'),
      albumName: document.createElement('p'),
      playStatus: document.createElement('div'),
      progressFill: document.createElement('div'),
      currentTime: document.createElement('span'),
      totalTime: document.createElement('span'),
      deviceName: document.createElement('span'),
      errorMessage: document.createElement('p')
    };

    // Set IDs for elements
    Object.keys(mockElements).forEach(key => {
      const elementId = key.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
      mockElements[key].id = elementId;
      document.body.appendChild(mockElements[key]);
    });

    // Add hidden class to sections
    ['authSection', 'loadingSection', 'musicSection', 'errorSection', 'noMusicSection'].forEach(section => {
      mockElements[section].classList.add('hidden');
    });

    // Clear all mocks
    jest.clearAllMocks();
    fetch.mockClear();

    // Load the VibeCanvas class
    const fs = require('fs');
    const path = require('path');
    const appJs = fs.readFileSync(path.join(__dirname, '../../client/app.js'), 'utf8');

    // Remove the DOMContentLoaded event listener for testing
    const modifiedAppJs = appJs.replace(/document\.addEventListener\('DOMContentLoaded'.*?\}\);/s, '');
    eval(modifiedAppJs);

    // Create instance manually
    vibeCanvas = new VibeCanvas();
  });

  afterEach(() => {
    jest.clearAllMocks();
    if (vibeCanvas && vibeCanvas.updateInterval) {
      clearInterval(vibeCanvas.updateInterval);
    }
  });

  describe('Initialization', () => {
    test('should initialize with correct default values', () => {
      expect(vibeCanvas.updateInterval).toBeNull();
      expect(vibeCanvas.isAuthenticated).toBe(false);
      expect(vibeCanvas.currentTrack).toBeNull();
    });

    test('should initialize DOM elements correctly', () => {
      expect(vibeCanvas.authSection).toBe(mockElements.authSection);
      expect(vibeCanvas.loginBtn).toBe(mockElements.loginBtn);
      expect(vibeCanvas.trackName).toBe(mockElements.trackName);
    });
  });

  describe('showSection', () => {
    test('should show auth section and hide others', () => {
      vibeCanvas.showSection('auth');

      expect(mockElements.authSection.classList.contains('hidden')).toBe(false);
      expect(mockElements.loadingSection.classList.contains('hidden')).toBe(true);
      expect(mockElements.musicSection.classList.contains('hidden')).toBe(true);
      expect(mockElements.errorSection.classList.contains('hidden')).toBe(true);
      expect(mockElements.noMusicSection.classList.contains('hidden')).toBe(true);
    });

    test('should show music section and hide others', () => {
      vibeCanvas.showSection('music');

      expect(mockElements.authSection.classList.contains('hidden')).toBe(true);
      expect(mockElements.musicSection.classList.contains('hidden')).toBe(false);
      expect(mockElements.loadingSection.classList.contains('hidden')).toBe(true);
    });

    test('should show error section and hide others', () => {
      vibeCanvas.showSection('error');

      expect(mockElements.errorSection.classList.contains('hidden')).toBe(false);
      expect(mockElements.authSection.classList.contains('hidden')).toBe(true);
      expect(mockElements.musicSection.classList.contains('hidden')).toBe(true);
    });
  });

  describe('checkAuthStatus', () => {
    test('should start polling when authenticated', async () => {
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ authenticated: true })
      });

      const startPollingSpy = jest.spyOn(vibeCanvas, 'startPolling').mockImplementation(() => {});

      await vibeCanvas.checkAuthStatus();

      expect(fetch).toHaveBeenCalledWith('/api/auth-status');
      expect(vibeCanvas.isAuthenticated).toBe(true);
      expect(startPollingSpy).toHaveBeenCalled();
    });

    test('should show auth section when not authenticated', async () => {
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ authenticated: false })
      });

      const showSectionSpy = jest.spyOn(vibeCanvas, 'showSection');

      await vibeCanvas.checkAuthStatus();

      expect(vibeCanvas.isAuthenticated).toBe(false);
      expect(showSectionSpy).toHaveBeenCalledWith('auth');
    });

    test('should handle auth check errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const showSectionSpy = jest.spyOn(vibeCanvas, 'showSection');

      await vibeCanvas.checkAuthStatus();

      expect(showSectionSpy).toHaveBeenCalledWith('auth');
    });
  });

  describe('fetchCurrentTrack', () => {
    beforeEach(() => {
      vibeCanvas.isAuthenticated = true;
    });

    test('should display track when music is playing', async () => {
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
          name: 'Test Device'
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTrackData)
      });

      const updateDisplaySpy = jest.spyOn(vibeCanvas, 'updateDisplay');
      const showSectionSpy = jest.spyOn(vibeCanvas, 'showSection');

      await vibeCanvas.fetchCurrentTrack();

      expect(fetch).toHaveBeenCalledWith('/api/current-track');
      expect(updateDisplaySpy).toHaveBeenCalledWith(mockTrackData);
      expect(showSectionSpy).toHaveBeenCalledWith('music');
      expect(vibeCanvas.currentTrack).toBe(mockTrackData);
    });

    test('should show no music section when not playing', async () => {
      const mockResponse = {
        isPlaying: false,
        message: 'No track currently playing'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const showSectionSpy = jest.spyOn(vibeCanvas, 'showSection');

      await vibeCanvas.fetchCurrentTrack();

      expect(showSectionSpy).toHaveBeenCalledWith('no-music');
    });

    test('should show error section on API failure', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      const showSectionSpy = jest.spyOn(vibeCanvas, 'showSection');

      await vibeCanvas.fetchCurrentTrack();

      expect(showSectionSpy).toHaveBeenCalledWith('error');
      expect(mockElements.errorMessage.textContent).toContain('HTTP error! status: 500');
    });

    test('should show auth section when not authenticated', async () => {
      vibeCanvas.isAuthenticated = false;

      const showSectionSpy = jest.spyOn(vibeCanvas, 'showSection');

      await vibeCanvas.fetchCurrentTrack();

      expect(showSectionSpy).toHaveBeenCalledWith('auth');
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('updateDisplay', () => {
    test('should update all track information correctly', () => {
      const trackData = {
        isPlaying: true,
        track: {
          name: 'Test Song',
          artists: ['Artist 1', 'Artist 2'],
          album: {
            name: 'Test Album',
            images: [{ url: 'https://example.com/image.jpg' }]
          },
          duration: 240000,
          progress: 120000
        },
        device: {
          name: 'Test Device'
        }
      };

      // Create play indicator element
      const playIndicator = document.createElement('div');
      playIndicator.className = 'play-indicator';
      document.body.appendChild(playIndicator);

      vibeCanvas.updateDisplay(trackData);

      expect(mockElements.trackName.textContent).toBe('Test Song');
      expect(mockElements.artistName.textContent).toBe('Artist 1, Artist 2');
      expect(mockElements.albumName.textContent).toBe('Test Album');
      expect(mockElements.albumArt.src).toBe('https://example.com/image.jpg');
      expect(mockElements.playStatus.textContent).toBe('▶️');
      expect(mockElements.deviceName.textContent).toBe('Playing on Test Device');
    });

    test('should handle missing album art', () => {
      const trackData = {
        isPlaying: false,
        track: {
          name: 'Test Song',
          artists: ['Test Artist'],
          album: {
            name: 'Test Album',
            images: []
          },
          duration: 180000,
          progress: 90000
        },
        device: { name: 'Test Device' }
      };

      const playIndicator = document.createElement('div');
      playIndicator.className = 'play-indicator';
      document.body.appendChild(playIndicator);

      vibeCanvas.updateDisplay(trackData);

      expect(mockElements.albumArt.src).toContain('data:image/svg+xml');
      expect(mockElements.playStatus.textContent).toBe('⏸️');
    });

    test('should update progress bar correctly', () => {
      const trackData = {
        isPlaying: true,
        track: {
          name: 'Test Song',
          artists: ['Test Artist'],
          album: { name: 'Test Album', images: [] },
          duration: 200000, // 200 seconds
          progress: 100000  // 100 seconds (50%)
        },
        device: { name: 'Test Device' }
      };

      const playIndicator = document.createElement('div');
      playIndicator.className = 'play-indicator';
      document.body.appendChild(playIndicator);

      vibeCanvas.updateDisplay(trackData);

      expect(mockElements.progressFill.style.width).toBe('50%');
      expect(mockElements.currentTime.textContent).toBe('1:40');
      expect(mockElements.totalTime.textContent).toBe('3:20');
    });
  });

  describe('formatTime', () => {
    test('should format milliseconds to MM:SS correctly', () => {
      expect(vibeCanvas.formatTime(0)).toBe('0:00');
      expect(vibeCanvas.formatTime(30000)).toBe('0:30');
      expect(vibeCanvas.formatTime(60000)).toBe('1:00');
      expect(vibeCanvas.formatTime(90000)).toBe('1:30');
      expect(vibeCanvas.formatTime(3600000)).toBe('60:00');
    });
  });

  describe('Event Handlers', () => {
    test('should handle login button click', () => {
      const originalLocation = window.location;
      delete window.location;
      window.location = { href: '' };

      mockElements.loginBtn.click();

      expect(window.location.href).toBe('/login');

      window.location = originalLocation;
    });

    test('should handle refresh button click', () => {
      const fetchSpy = jest.spyOn(vibeCanvas, 'fetchCurrentTrack').mockImplementation(() => {});

      mockElements.refreshBtn.click();

      expect(fetchSpy).toHaveBeenCalled();
    });

    test('should handle logout button click', () => {
      vibeCanvas.isAuthenticated = true;
      vibeCanvas.updateInterval = setInterval(() => {}, 1000);

      const showSectionSpy = jest.spyOn(vibeCanvas, 'showSection');

      mockElements.logoutBtn.click();

      expect(vibeCanvas.isAuthenticated).toBe(false);
      expect(vibeCanvas.updateInterval).toBeNull();
      expect(showSectionSpy).toHaveBeenCalledWith('auth');
    });
  });

  describe('Polling', () => {
    test('should start polling and show loading', () => {
      const fetchSpy = jest.spyOn(vibeCanvas, 'fetchCurrentTrack').mockImplementation(() => {});
      const showSectionSpy = jest.spyOn(vibeCanvas, 'showSection');

      vibeCanvas.startPolling();

      expect(showSectionSpy).toHaveBeenCalledWith('loading');
      expect(fetchSpy).toHaveBeenCalled();
      expect(vibeCanvas.updateInterval).not.toBeNull();
    });

    test('should stop polling', () => {
      vibeCanvas.updateInterval = setInterval(() => {}, 1000);

      vibeCanvas.stopPolling();

      expect(vibeCanvas.updateInterval).toBeNull();
    });
  });
});

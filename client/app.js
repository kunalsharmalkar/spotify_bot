class VibeCanvas {
    constructor() {
        this.updateInterval = null;
        this.isAuthenticated = false;
        this.currentTrack = null;

        this.initializeElements();
        this.bindEvents();
        this.checkAuthStatus();
    }

    initializeElements() {
        // Sections
        this.authSection = document.getElementById('auth-section');
        this.loadingSection = document.getElementById('loading-section');
        this.musicSection = document.getElementById('music-section');
        this.errorSection = document.getElementById('error-section');
        this.noMusicSection = document.getElementById('no-music-section');

        // Buttons
        this.loginBtn = document.getElementById('login-btn');
        this.refreshBtn = document.getElementById('refresh-btn');
        this.logoutBtn = document.getElementById('logout-btn');
        this.retryBtn = document.getElementById('retry-btn');
        this.checkAgainBtn = document.getElementById('check-again-btn');

        // Music display elements
        this.albumArt = document.getElementById('album-art');
        this.trackName = document.getElementById('track-name');
        this.artistName = document.getElementById('artist-name');
        this.albumName = document.getElementById('album-name');
        this.playStatus = document.getElementById('play-status');
        this.progressFill = document.getElementById('progress-fill');
        this.currentTime = document.getElementById('current-time');
        this.totalTime = document.getElementById('total-time');
        this.deviceName = document.getElementById('device-name');
        this.errorMessage = document.getElementById('error-message');
    }

    bindEvents() {
        this.loginBtn.addEventListener('click', () => this.login());
        this.refreshBtn.addEventListener('click', () => this.fetchCurrentTrack());
        this.logoutBtn.addEventListener('click', () => this.logout());
        this.retryBtn.addEventListener('click', () => this.fetchCurrentTrack());
        this.checkAgainBtn.addEventListener('click', () => this.fetchCurrentTrack());
    }

    showSection(sectionName) {
        // Hide all sections
        [this.authSection, this.loadingSection, this.musicSection,
         this.errorSection, this.noMusicSection].forEach(section => {
            section.classList.add('hidden');
        });

        // Show the requested section
        switch(sectionName) {
            case 'auth':
                this.authSection.classList.remove('hidden');
                break;
            case 'loading':
                this.loadingSection.classList.remove('hidden');
                break;
            case 'music':
                this.musicSection.classList.remove('hidden');
                break;
            case 'error':
                this.errorSection.classList.remove('hidden');
                break;
            case 'no-music':
                this.noMusicSection.classList.remove('hidden');
                break;
        }
    }

    async checkAuthStatus() {
        try {
            const response = await fetch('/api/auth-status');
            const data = await response.json();

            if (data.authenticated) {
                this.isAuthenticated = true;
                this.startPolling();
            } else {
                this.showSection('auth');
            }
        } catch (error) {
            console.error('Error checking auth status:', error);
            this.showSection('auth');
        }
    }

    login() {
        window.location.href = '/login';
    }

    logout() {
        this.isAuthenticated = false;
        this.stopPolling();
        // In a real app, you'd call a logout endpoint here
        this.showSection('auth');
    }

    async fetchCurrentTrack() {
        if (!this.isAuthenticated) {
            this.showSection('auth');
            return;
        }

        try {
            const response = await fetch('/api/current-track');

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            if (!data.isPlaying || data.message) {
                this.showSection('no-music');
                return;
            }

            this.currentTrack = data;
            this.updateDisplay(data);
            this.showSection('music');

        } catch (error) {
            console.error('Error fetching current track:', error);
            this.errorMessage.textContent = error.message || 'Failed to fetch track information';
            this.showSection('error');
        }
    }

    updateDisplay(trackData) {
        const { track, isPlaying, device } = trackData;

        // Update track information
        this.trackName.textContent = track.name;
        this.artistName.textContent = track.artists.join(', ');
        this.albumName.textContent = track.album.name;

        // Update album art
        if (track.album.images && track.album.images.length > 0) {
            // Use the largest available image (usually the first one)
            this.albumArt.src = track.album.images[0].url;
            this.albumArt.alt = `${track.album.name} album art`;
        } else {
            this.albumArt.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjNDQ0Ii8+Cjx0ZXh0IHg9IjE1MCIgeT0iMTUwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+';
            this.albumArt.alt = 'No album art available';
        }

        // Update play status
        this.playStatus.textContent = isPlaying ? '▶️' : '⏸️';
        const playIndicator = document.querySelector('.play-indicator');
        if (isPlaying) {
            playIndicator.classList.add('playing');
        } else {
            playIndicator.classList.remove('playing');
        }

        // Update progress bar
        if (track.duration && track.progress !== undefined) {
            const progressPercent = (track.progress / track.duration) * 100;
            this.progressFill.style.width = `${progressPercent}%`;

            // Update time displays
            this.currentTime.textContent = this.formatTime(track.progress);
            this.totalTime.textContent = this.formatTime(track.duration);
        }

        // Update device info
        if (device && device.name) {
            this.deviceName.textContent = `Playing on ${device.name}`;
        }
    }

    formatTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    startPolling() {
        this.showSection('loading');
        this.fetchCurrentTrack();

        // Poll every 5 seconds
        this.updateInterval = setInterval(() => {
            this.fetchCurrentTrack();
        }, 5000);
    }

    stopPolling() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VibeCanvas();
});

// Handle page visibility changes to pause/resume polling
document.addEventListener('visibilitychange', () => {
    const app = window.vibeCanvas;
    if (app) {
        if (document.hidden) {
            app.stopPolling();
        } else if (app.isAuthenticated) {
            app.startPolling();
        }
    }
});

// Handle window focus/blur for better performance
window.addEventListener('focus', () => {
    const app = window.vibeCanvas;
    if (app && app.isAuthenticated && !app.updateInterval) {
        app.startPolling();
    }
});

window.addEventListener('blur', () => {
    const app = window.vibeCanvas;
    if (app) {
        app.stopPolling();
    }
});

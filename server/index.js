const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const spotify = require('./spotify');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Spotify OAuth routes
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
    // Store tokens in session or database in production
    // For MVP, we'll store in memory (not recommended for production)
    spotify.setTokens(tokens);

    res.redirect('/');
  } catch (error) {
    console.error('Error during callback:', error);
    res.status(500).send('Authentication failed');
  }
});

// API routes
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

// Start server
app.listen(PORT, () => {
  console.log(`🎵 VibeCanvas server running on http://localhost:${PORT}`);
  console.log(`🔐 Visit http://localhost:${PORT}/login to authenticate with Spotify`);
});

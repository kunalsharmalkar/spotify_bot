# spotify_bot

# 🎨 VibeCanvas

**VibeCanvas** is an ambient music-visualization project that transforms your currently playing Spotify song into a live digital experience. This MVP version focuses on building a local GUI that fetches and displays the current song and album artwork using the Spotify API.

---

## 🧠 Project Overview

### Goal

Create a local application that:
- Authenticates with Spotify
- Fetches the currently playing song
- Displays the song title, artist, and album art in a minimalist frontend

Future versions will introduce dynamic generative artwork and projector display modes based on the *vibe* of the music.

---

## 🧩 MVP Scope

The MVP (v0.1) includes:
- ✅ Spotify OAuth integration
- ✅ Backend API to fetch the currently playing song
- ✅ Lightweight frontend GUI displaying:
  - Song title
  - Artist name(s)
  - Album art

---

## 📁 Project Structure

```
vibecanvas/
├── server/
│   ├── index.js           # Express server entry point
│   ├── spotify.js         # Handles auth and Spotify API logic
│   └── .env               # Secrets (excluded via .gitignore)
├── client/
│   ├── index.html         # Main frontend
│   ├── styles.css         # Optional styling
│   └── app.js             # Frontend JS to fetch now playing song
├── .gitignore
├── package.json
└── README.md
```

---

## 🛠️ Setup Instructions

### 1. Spotify Developer Setup

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Set the **Redirect URI** to:

```
http://localhost:3000/callback
```

4. Copy your **Client ID** and **Client Secret**

---

### 2. Environment Variables

Create a `server/.env` file with:

```env
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:3000/callback
```

Never commit this file — it is ignored via .gitignore.

---

### 3. Installation

```bash
git clone https://github.com/yourname/vibecanvas.git
cd vibecanvas
npm install
```

**Required Dependencies:**
- `express` - Web server framework
- `axios` - HTTP client for API requests
- `dotenv` - Environment variable management
- `cors` - Cross-origin resource sharing

---

### 4. Run the App

```bash
node server/index.js
```

This will:
- Start the Express server on http://localhost:3000
- Automatically open the Spotify login page in your browser

---

### 5. Using the App

Once logged in:
- Visit http://localhost:3000
- You'll see the currently playing track info (auto-updates every 5 seconds)

---

## 🚀 Future Versions

Planned extensions beyond MVP:
- 🎨 Generative art visuals using p5.js / Three.js
- 📽️ Projector support for ambient room visuals
- 🧠 Vibe classifier using Spotify's audio features
- 💡 Smart lighting sync (e.g., Philips Hue)
- 🎙️ Voice-based vibe switching

---

## 🔐 Security

Secrets are stored in a `.env` file, which is ignored by Git. Never expose your credentials in code. Always revoke credentials if accidentally pushed.

---

## 📄 .env.example

Provide this file in the repo for others:

```env
# Copy to .env and fill in your details
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://localhost:3000/callback
```

---

## 🛠️ Troubleshooting

### Common Issues

**"Cannot find module" errors:**
```bash
npm install
```

**Spotify authentication fails:**
- Verify your Client ID and Client Secret in `.env`
- Ensure Redirect URI matches exactly: `http://localhost:3000/callback`
- Check that your Spotify app is not in development mode restrictions

**"No currently playing track" message:**
- Make sure Spotify is actively playing music
- Verify the OAuth scope includes `user-read-playback-state`
- Try refreshing the page or restarting the server

**Port 3000 already in use:**
```bash
lsof -ti:3000 | xargs kill -9
```

**CORS errors:**
- Ensure the `cors` package is installed and configured in your Express server

---

## 📦 Package.json Example

```json
{
  "name": "vibecanvas",
  "version": "0.1.0",
  "description": "Ambient music visualization with Spotify integration",
  "main": "server/index.js",
  "scripts": {
    "start": "node server/index.js",
    "dev": "nodemon server/index.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "axios": "^1.4.0",
    "dotenv": "^16.0.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "nodemon": "^2.0.0"
  }
}
```

---

## 🧠 For Claude (or other assistants)

**Technical Stack:**
- Use Node.js + Express for the backend
- Use axios for API calls
- Frontend is plain HTML/CSS/JS with polling logic in `client/app.js`
- OAuth scope required: `user-read-playback-state`

**Key Implementation Notes:**
- Implement proper error handling for API failures
- Add rate limiting to prevent API quota exhaustion
- Include CORS middleware for cross-origin requests
- Use environment variables for all sensitive data

If building from scratch, scaffold each file as described in the project structure above.

---

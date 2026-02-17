# 🎵 SoundWaves — Audio Visualizer + Synced Lyrics

Real-time audio visualizer with 4 visualization modes, 5 color themes, synced lyrics karaoke overlay, AI lyrics generation, and music file support. Built with React, Canvas API, Web Audio API, and Claude AI.

![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?logo=vite&logoColor=white)
![Claude AI](https://img.shields.io/badge/Claude_AI-Sonnet_4-orange?logo=anthropic&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

- **4 Visualization Modes** — Bars (mirrored), Circular, Waveform, Galaxy (particle system)
- **5 Color Themes** — Neon, Fire, Ocean, Aurora, Sakura
- **Synced Lyrics** — Fetches real song lyrics from lrclib.net with LRC timestamp sync
- **Karaoke Overlay** — Full-screen lyrics display synced to the music in real-time
- **AI Lyrics Generator** — Claude AI generates original lyrics based on audio mood analysis
- **Paste Lyrics** — Manual lyrics input for any song
- **Live Mood Detection** — Real-time frequency analysis (bass/mid/high) with mood classification
- **Microphone Input** — Visualize ambient sound in real-time
- **Music File Support** — Upload MP3, WAV, OGG, FLAC, or any audio format
- **Gain Control** — Adjustable sensitivity slider
- **60 FPS Canvas Rendering** — Smooth animations with HiDPI support

## 🚀 Quick Start

```bash
git clone https://github.com/Penguh38/sound-waves.git
cd sound-waves
npm install
npm run dev
```

For AI lyrics generation (optional):
```bash
cp .env.example .env
# Add your Anthropic API key
```

## 🏗️ Tech Stack

| Technology | Purpose |
|---|---|
| **React 18** | UI framework with hooks |
| **Vite 5** | Build tool and dev server |
| **Canvas API** | Hardware-accelerated 2D rendering at 60fps |
| **Web Audio API** | Real-time FFT frequency analysis |
| **lrclib.net API** | Synced lyrics search (LRC format with timestamps) |
| **Claude AI API** | AI-powered mood-based lyrics generation |
| **Google Fonts** | Syne + Outfit typography |

## 🎨 Visualization Modes

| Mode | Description |
|---|---|
| **Bars** | Mirrored frequency spectrum with logarithmic scaling and glow effects |
| **Circular** | Radial frequency display with pulsing center and rotating bars |
| **Waveform** | Oscilloscope-style wave with layered traces and gradient fill |
| **Galaxy** | 300-particle system reacting to bass, mid, and high frequency bands |

## 🎤 Lyrics System

Three ways to get lyrics:

| Mode | How it works |
|---|---|
| **🔍 Search** | Searches lrclib.net using the filename. Returns synced lyrics (LRC) when available for real-time karaoke sync |
| **✍ AI** | Claude AI analyzes the audio mood and generates original lyrics matching the energy and genre |
| **📋 Paste** | Manually paste lyrics from Genius, AZLyrics, or any source |

The karaoke overlay reads `audio.currentTime` and matches it to LRC timestamps for frame-accurate lyric sync. For best results, name files as `Artist - Song Title.mp3`.

## 📐 Architecture

```
src/
├── main.jsx       # Entry point
└── App.jsx        # Single-file application
    ├── LRC Parser     # Synced lyrics timestamp parser
    ├── Lyrics Search  # lrclib.net API integration
    ├── AI Lyrics      # Claude API + mood detection + demo fallback
    ├── Themes         # 5 color themes with dynamic color functions
    ├── Renderers      # 4 canvas-based visualization functions
    ├── Audio Engine    # Web Audio API (mic + file sources)
    └── UI             # Karaoke overlay, side panel, controls
```

## 🔑 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_ANTHROPIC_API_KEY` | No | Anthropic API key for AI lyrics. App works fully without it — search and paste modes need no key. |

## 🌐 Deployment

```bash
npm run build
npx vercel
```

## 📄 License

MIT License

---

Built with ❤️ by Pengu

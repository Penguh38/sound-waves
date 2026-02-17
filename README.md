# 🎵 SoundWaves — Audio Visualizer + AI Lyrics

Real-time audio visualizer with 4 visualization modes, 5 color themes, AI-powered lyrics generation, microphone input, and music file support. Built with React, Canvas API, Web Audio API, and Claude AI.

![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?logo=vite&logoColor=white)
![Claude AI](https://img.shields.io/badge/Claude_AI-Sonnet_4-orange?logo=anthropic&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

- **4 Visualization Modes** — Bars, Circular, Waveform, Galaxy (particle system)
- **5 Color Themes** — Neon, Fire, Ocean, Aurora, Sakura
- **AI Lyrics Generator** — Analyzes audio mood in real-time and generates matching song lyrics using Claude AI
- **Live Mood Detection** — Real-time frequency analysis detecting mood, energy, and genre feel
- **Microphone Input** — Real-time visualization of ambient sound
- **Music File Support** — Upload any audio file (MP3, WAV, OGG, etc.)
- **Gain Control** — Adjustable sensitivity slider
- **60 FPS Canvas Rendering** — Smooth animations with device pixel ratio support
- **Demo Mode** — Works without API key with pre-written lyrics for each mood
- **Responsive** — Full-screen immersive experience on any device

## 🚀 Quick Start

```bash
git clone https://github.com/Penguh38/sound-waves.git
cd sound-waves
npm install

# (Optional) Add API key for real AI lyrics generation
cp .env.example .env
# Edit .env and add your key from https://console.anthropic.com/

npm run dev
```

## 🏗️ Tech Stack

| Technology | Purpose |
|---|---|
| **React 18** | UI framework with hooks |
| **Vite 5** | Build tool |
| **Canvas API** | Hardware-accelerated 2D rendering at 60fps |
| **Web Audio API** | Real-time audio analysis (FFT, frequency data, waveform) |
| **Claude AI API** | AI-powered song lyrics generation based on audio mood |
| **AnalyserNode** | Fast Fourier Transform for frequency decomposition |
| **Google Fonts** | Syne + Outfit typography |

## 🎨 Visualization Modes

| Mode | Description |
|---|---|
| **Bars** | Classic frequency spectrum with rounded bars, reflections, and glow |
| **Circular** | Radial frequency display with pulsing center and rotating bars |
| **Waveform** | Oscilloscope-style wave with layered traces and gradient fill |
| **Galaxy** | 300-particle system with physics, split by bass/mid/high frequency bands |

## 🤖 AI Lyrics Generator

The lyrics feature works by:
1. **Analyzing audio** — Web Audio API decomposes sound into bass, mid, and high frequency bands
2. **Detecting mood** — Algorithm classifies the audio mood (intense, bright, dark, melancholic, warm, chill)
3. **AI Generation** — Claude AI generates original song lyrics matching the detected mood, energy, and genre
4. **Live display** — Lyrics panel shows alongside the visualization with real-time audio analysis bars

Mood detection uses frequency band analysis:
- **High bass + high energy** → Intense (electronic/hip-hop)
- **High treble + medium energy** → Bright (pop/dance)
- **High bass + low energy** → Dark (ambient/trap)
- **Low overall energy** → Melancholic (ballad/acoustic)
- **Balanced mids** → Warm (R&B/soul)

## 📐 Architecture

```
src/
├── main.jsx       # Entry point
└── App.jsx        # Complete application
    ├── AI         # Mood detection, Claude API integration, demo lyrics
    ├── Themes     # 5 color themes with dynamic color functions
    ├── Renderers  # 4 canvas-based visualization draw functions
    ├── Audio      # Web Audio API setup (mic + file sources)
    └── UI         # Controls overlay, lyrics panel, mood indicator
```

## 🔑 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_ANTHROPIC_API_KEY` | No | Anthropic API key for AI lyrics. App runs in demo mode without it. |

## 🌐 Deployment

```bash
npm run build
npx vercel
```

## 📄 License

MIT License

---

Built with ❤️ by Pengu

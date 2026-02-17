# 🎵 SoundWaves — Audio Visualizer

Real-time audio visualizer with 4 visualization modes, 5 color themes, microphone input, and music file support. Built with React, Canvas API, and Web Audio API.

![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?logo=vite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

- **4 Visualization Modes** — Bars, Circular, Waveform, Galaxy (particle system)
- **5 Color Themes** — Neon, Fire, Ocean, Aurora, Sakura
- **Microphone Input** — Real-time visualization of ambient sound
- **Music File Support** — Upload any audio file (MP3, WAV, OGG, etc.)
- **Gain Control** — Adjustable sensitivity slider
- **60 FPS Canvas Rendering** — Smooth animations with device pixel ratio support
- **Responsive** — Full-screen immersive experience on any device
- **Glow Effects** — Dynamic glow and shadow effects reactive to audio energy
- **Particle Physics** — Galaxy mode with 300 particles reacting to bass, mid, and high frequencies

## 🚀 Quick Start

```bash
git clone https://github.com/Penguh38/sound-waves.git
cd sound-waves
npm install
npm run dev
```

## 🏗️ Tech Stack

| Technology | Purpose |
|---|---|
| **React 18** | UI framework with hooks |
| **Vite 5** | Build tool |
| **Canvas API** | Hardware-accelerated 2D rendering at 60fps |
| **Web Audio API** | Real-time audio analysis (FFT, frequency data, waveform) |
| **AnalyserNode** | Fast Fourier Transform for frequency decomposition |
| **Google Fonts** | Syne + Outfit typography |

## 🎨 Visualization Modes

| Mode | Description |
|---|---|
| **Bars** | Classic frequency spectrum with rounded bars, reflections, and glow |
| **Circular** | Radial frequency display with pulsing center and rotating bars |
| **Waveform** | Oscilloscope-style wave with layered traces and gradient fill |
| **Galaxy** | 300-particle system with physics, split by bass/mid/high frequency bands |

## 📐 Architecture

```
src/
├── main.jsx       # Entry point
└── App.jsx        # Complete application
    ├── Themes     # 5 color themes with dynamic color functions
    ├── Renderers  # 4 canvas-based visualization draw functions
    ├── Audio      # Web Audio API setup (mic + file sources)
    └── UI         # Controls overlay with mode/theme/gain controls
```

### Technical Highlights

- **Web Audio API AnalyserNode** with FFT size 512 for frequency decomposition
- **Device Pixel Ratio** aware canvas for crisp rendering on retina displays
- **requestAnimationFrame** loop for smooth 60fps rendering
- **Particle system** with per-particle frequency band assignment (bass/mid/high)
- **Dynamic glow** effects using canvas shadow API, intensity mapped to audio energy

## 🌐 Deployment

```bash
npm run build
npx vercel
```

## 📄 License

MIT License

---

Built with ❤️ by Pengu

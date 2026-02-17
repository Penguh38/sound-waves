import { useState, useEffect, useRef, useCallback } from "react";

// ─── Config ──────────────────────────────────────────────
const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || "";

// ─── Mood Detection ──────────────────────────────────────
function detectMood(analyser) {
  if (!analyser) return { energy: "medium", mood: "chill", genre: "pop", bpm: "medium" };
  const freq = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(freq);

  const bass = freq.slice(0, 10).reduce((a, b) => a + b, 0) / 10 / 255;
  const mid = freq.slice(10, 40).reduce((a, b) => a + b, 0) / 30 / 255;
  const high = freq.slice(40, 80).reduce((a, b) => a + b, 0) / 40 / 255;
  const overall = (bass + mid + high) / 3;

  let energy = overall > 0.5 ? "high" : overall > 0.25 ? "medium" : "low";
  let mood, genre;

  if (bass > 0.5 && overall > 0.4) { mood = "intense"; genre = "electronic/hip-hop"; }
  else if (high > mid && overall > 0.3) { mood = "bright"; genre = "pop/dance"; }
  else if (bass > mid && overall < 0.3) { mood = "dark"; genre = "ambient/trap"; }
  else if (overall < 0.2) { mood = "melancholic"; genre = "ballad/acoustic"; }
  else if (mid > bass && mid > high) { mood = "warm"; genre = "r&b/soul"; }
  else { mood = "chill"; genre = "indie/alternative"; }

  return { energy, mood, genre, bass: Math.round(bass * 100), mid: Math.round(mid * 100), high: Math.round(high * 100) };
}

// ─── Demo Lyrics ─────────────────────────────────────────
const DEMO_LYRICS = {
  intense: {
    title: "Neon Pulse",
    verses: "Bass drops heavy through the night\nNeon lights painting shadows bright\nFeel the rhythm in my veins\nBreaking free from all these chains\n\nLouder now the speakers cry\nWe're alive beneath this sky\nEvery beat a heart reborn\nDancing through the eye of storm",
    mood_emoji: "⚡",
  },
  bright: {
    title: "Golden Hour",
    verses: "Sunlight streaming through the haze\nLost inside these golden days\nMelody lifts me off the ground\nSpinning to the sweetest sound\n\nColors burst behind my eyes\nChasing echoes through the skies\nThis moment's all we ever need\nA symphony that sets us free",
    mood_emoji: "☀️",
  },
  dark: {
    title: "Midnight Echo",
    verses: "Shadows whisper in the deep\nSecrets that the darkness keeps\nBass lines crawl beneath the floor\nKnocking on a hidden door\n\nEchoes fade to silent screams\nNothing here is what it seems\nLost in waves of endless sound\nSinking deeper underground",
    mood_emoji: "🌑",
  },
  melancholic: {
    title: "Paper Hearts",
    verses: "Silence fills the empty room\nMelodies of fading bloom\nEvery note a memory\nOf the way you looked at me\n\nStrings pull tight across my chest\nSearching for a place to rest\nIn the quiet I can hear\nAll the words that disappeared",
    mood_emoji: "💔",
  },
  warm: {
    title: "Velvet Sun",
    verses: "Smooth like honey, slow like rain\nEvery chord dissolves the pain\nGroove that wraps around your soul\nMaking broken pieces whole\n\nSwaying to a deeper call\nLetting go and feeling small\nIn this pocket of the night\nEverything just feels so right",
    mood_emoji: "✨",
  },
  chill: {
    title: "Drifting",
    verses: "Floating through the afternoon\nHumming someone else's tune\nWindows down and volume low\nNowhere that I need to go\n\nClouds are painting stories high\nI just watch them rolling by\nEvery second, every breath\nNothing more and nothing less",
    mood_emoji: "🌊",
  },
};

// ─── Lyrics Search (lrclib.net — free, no API key) ──────

// Parse LRC format: [mm:ss.xx]text → [{time: seconds, text: "..."}]
function parseLRC(lrc) {
  if (!lrc) return null;
  const lines = [];
  for (const line of lrc.split("\n")) {
    const match = line.match(/^\[(\d+):(\d+\.\d+)\]\s*(.*)$/);
    if (match) {
      const time = parseInt(match[1]) * 60 + parseFloat(match[2]);
      const text = match[3].trim();
      if (text) lines.push({ time, text });
    }
  }
  return lines.length > 0 ? lines : null;
}

async function searchLyrics(songFileName) {
  const cleanName = songFileName
    ? songFileName.replace(/\.(mp3|wav|ogg|flac|m4a|aac|wma)$/i, "")
        .replace(/[_\-]+/g, " ")
        .replace(/\d{3,}/g, "")
        .replace(/\s+/g, " ")
        .trim()
    : "";

  if (!cleanName) return null;

  try {
    const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(cleanName)}`);
    const data = await res.json();

    const buildResult = (best) => ({
      title: best.trackName || cleanName,
      artist: best.artistName || "Unknown",
      verses: best.plainLyrics || "Lyrics niso na voljo.",
      syncedLines: parseLRC(best.syncedLyrics),
      mood_emoji: "🎵",
      source: "lrclib.net",
    });

    if (data && data.length > 0) {
      // Prefer results with synced lyrics
      const best = data.find((d) => d.syncedLyrics && d.plainLyrics) || data.find((d) => d.plainLyrics) || data[0];
      return buildResult(best);
    }

    // Try shorter query
    const shortName = cleanName.split(" ").slice(0, 3).join(" ");
    if (shortName !== cleanName) {
      const res2 = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(shortName)}`);
      const data2 = await res2.json();
      if (data2 && data2.length > 0) {
        const best = data2.find((d) => d.syncedLyrics && d.plainLyrics) || data2.find((d) => d.plainLyrics) || data2[0];
        return buildResult(best);
      }
    }

    return null;
  } catch (err) {
    console.error("Lyrics search error:", err);
    return null;
  }
}

async function generateLyrics(moodData, songFileName) {
  // Clean up filename to get song name
  const cleanName = songFileName
    ? songFileName.replace(/\.(mp3|wav|ogg|flac|m4a|aac|wma)$/i, "")
        .replace(/[_\-]+/g, " ")
        .replace(/\d{3,}/g, "")
        .replace(/\s+/g, " ")
        .trim()
    : "";

  if (!API_KEY) {
    await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));
    const lyrics = DEMO_LYRICS[moodData.mood] || DEMO_LYRICS.chill;
    return {
      ...lyrics,
      title: cleanName || `[DEMO] ${lyrics.title}`,
      note: !cleanName ? "Demo mode — dodaj API ključ za prave lyrics" : "Demo mode",
    };
  }

  const prompt = cleanName
    ? `The user is listening to a song. The filename suggests: "${cleanName}"

If you recognize the song, write original lyrics INSPIRED BY its themes, style, and emotional tone — do NOT reproduce the actual copyrighted lyrics. Match the song's vibe, topic, and feeling but use entirely original words.

If you don't recognize the song, write original lyrics that fit the title and audio mood.

Audio analysis:
- Mood: ${moodData.mood}
- Energy: ${moodData.energy}
- Genre feel: ${moodData.genre}

Respond ONLY with JSON (no markdown, no backticks):
{
  "title": "the song title",
  "artist": "artist name if known, or 'Unknown'",
  "verses": "full original lyrics with \\n for line breaks, 3-4 verses",
  "mood_emoji": "one emoji that fits"
}`
    : `Write original song lyrics matching this audio mood.

Mood: ${moodData.mood}, Energy: ${moodData.energy}, Genre: ${moodData.genre}

Respond ONLY with JSON (no markdown, no backticks):
{
  "title": "song title",
  "artist": "Original",
  "verses": "full lyrics with \\n for line breaks, 3-4 verses",
  "mood_emoji": "one emoji"
}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json();
  const raw = data.content.map((i) => i.text || "").join("\n");
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}

// ─── Color Themes ────────────────────────────────────────
const THEMES = {
  neon: {
    name: "Neon", icon: "🌈",
    colors: (i, total) => {
      const hue = (i / total) * 300 + 260;
      return `hsl(${hue % 360}, 90%, 65%)`;
    },
    bg: "#08070e",
    accent: "#a855f7",
    glow: "rgba(168,85,247,0.3)",
  },
  fire: {
    name: "Fire", icon: "🔥",
    colors: (i, total) => {
      const t = i / total;
      const r = 255;
      const g = Math.floor(t < 0.5 ? t * 2 * 180 : 180 - (t - 0.5) * 2 * 80);
      const b = Math.floor(t < 0.3 ? 20 : 0);
      return `rgb(${r},${g},${b})`;
    },
    bg: "#0e0806",
    accent: "#f97316",
    glow: "rgba(249,115,22,0.3)",
  },
  ocean: {
    name: "Ocean", icon: "🌊",
    colors: (i, total) => {
      const hue = (i / total) * 60 + 180;
      return `hsl(${hue}, 80%, 60%)`;
    },
    bg: "#060e10",
    accent: "#06b6d4",
    glow: "rgba(6,182,212,0.3)",
  },
  aurora: {
    name: "Aurora", icon: "✨",
    colors: (i, total) => {
      const t = i / total;
      const hue = t * 120 + 100;
      return `hsl(${hue}, 85%, ${55 + t * 15}%)`;
    },
    bg: "#060a0e",
    accent: "#34d399",
    glow: "rgba(52,211,153,0.3)",
  },
  sakura: {
    name: "Sakura", icon: "🌸",
    colors: (i, total) => {
      const t = i / total;
      const hue = t * 30 + 330;
      return `hsl(${hue % 360}, 75%, 72%)`;
    },
    bg: "#0e060a",
    accent: "#f472b6",
    glow: "rgba(244,114,182,0.3)",
  },
};

// ─── Visualization Renderers ─────────────────────────────

function drawBars(ctx, w, h, freq, wave, theme, time) {
  const barCount = 48;
  const gap = 4;
  const totalW = barCount * gap + barCount * ((w * 0.8) / barCount - gap);
  const barW = (w * 0.8 - gap * (barCount - 1)) / barCount;
  const offsetX = (w - (barW + gap) * barCount + gap) / 2;
  const cy = h / 2;
  const maxBarH = h * 0.38;

  for (let i = 0; i < barCount; i++) {
    // Logarithmic frequency mapping
    const t = i / barCount;
    const logIdx = Math.round(Math.exp(Math.log(1) + t * (Math.log(freq.length - 1) - Math.log(1))));
    
    // Sample a few bins around the log index
    let sum = 0, cnt = 0;
    for (let j = Math.max(0, logIdx - 2); j <= Math.min(freq.length - 1, logIdx + 2); j++) {
      sum += freq[j]; cnt++;
    }
    const raw = (sum / cnt) / 255;
    
    // Apply curve so quiet parts still show something
    const val = Math.pow(raw, 0.8);
    const barH = Math.max(4, val * maxBarH);

    const x = offsetX + i * (barW + gap);
    const color = theme.colors(i, barCount);

    // Top bar (grows upward from center)
    ctx.fillStyle = color;
    ctx.fillRect(x, cy - barH, barW, barH);

    // Bottom bar (mirror, grows downward, slightly dimmer)
    ctx.globalAlpha = 0.5;
    ctx.fillRect(x, cy, barW, barH);
    ctx.globalAlpha = 1;

    // Glow on loud bars
    if (val > 0.4) {
      ctx.shadowColor = color;
      ctx.shadowBlur = val * 20;
      ctx.fillRect(x, cy - barH, barW, 2);
      ctx.shadowBlur = 0;
    }
  }

  // Subtle center line
  ctx.strokeStyle = theme.accent + "12";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(offsetX, cy);
  ctx.lineTo(offsetX + (barW + gap) * barCount, cy);
  ctx.stroke();
}

function drawCircular(ctx, w, h, freq, wave, theme, time) {
  const cx = w / 2;
  const cy = h / 2;
  const baseR = Math.min(w, h) * 0.22;
  const barCount = 120;

  // Logarithmic frequency value getter
  const getFreqValue = (i) => {
    const t = i / barCount;
    const logIdx = Math.round(Math.exp(Math.log(1) + t * (Math.log(freq.length - 1) - Math.log(1))));
    const range = Math.max(1, Math.floor(freq.length / barCount / 2));
    let sum = 0, count = 0;
    for (let j = Math.max(0, logIdx - range); j <= Math.min(freq.length - 1, logIdx + range); j++) { sum += freq[j]; count++; }
    return Math.pow((sum / count) / 255, 0.7);
  };

  // Outer glow ring
  const avgEnergy = freq.reduce((a, b) => a + b, 0) / freq.length / 255;
  ctx.beginPath();
  ctx.arc(cx, cy, baseR + 5, 0, Math.PI * 2);
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.15 + avgEnergy * 0.3;
  ctx.shadowColor = theme.accent;
  ctx.shadowBlur = 20 + avgEnergy * 30;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;

  // Inner pulsing circle
  const pulseR = baseR * (0.4 + avgEnergy * 0.3);
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseR);
  gradient.addColorStop(0, theme.accent + "22");
  gradient.addColorStop(1, "transparent");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < barCount; i++) {
    const val = getFreqValue(i);

    const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2 + time * 0.0003;
    const barLen = val * baseR * 1.2 + 3;

    const x1 = cx + Math.cos(angle) * (baseR + 4);
    const y1 = cy + Math.sin(angle) * (baseR + 4);
    const x2 = cx + Math.cos(angle) * (baseR + 4 + barLen);
    const y2 = cy + Math.sin(angle) * (baseR + 4 + barLen);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = theme.colors(i, barCount);
    ctx.lineWidth = Math.max(1.5, (w / barCount) * 0.6);
    ctx.lineCap = "round";

    if (val > 0.4) {
      ctx.shadowColor = theme.colors(i, barCount);
      ctx.shadowBlur = val * 15;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Inner mirror (shorter)
    const innerLen = barLen * 0.3;
    const ix1 = cx + Math.cos(angle) * (baseR - 2);
    const iy1 = cy + Math.sin(angle) * (baseR - 2);
    const ix2 = cx + Math.cos(angle) * (baseR - 2 - innerLen);
    const iy2 = cy + Math.sin(angle) * (baseR - 2 - innerLen);

    ctx.beginPath();
    ctx.moveTo(ix1, iy1);
    ctx.lineTo(ix2, iy2);
    ctx.globalAlpha = 0.25;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Center text
  ctx.fillStyle = "#fff";
  ctx.globalAlpha = 0.12;
  ctx.font = `bold ${18}px 'Syne', sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("♫", cx, cy);
  ctx.globalAlpha = 1;
}

function drawWaveform(ctx, w, h, freq, wave, theme, time) {
  const cy = h / 2;
  const sliceW = w / wave.length;

  // Draw multiple layered waves
  for (let layer = 0; layer < 3; layer++) {
    ctx.beginPath();
    const offset = layer * 0.15;

    for (let i = 0; i < wave.length; i++) {
      const v = (wave[i] / 128.0 - 1);
      const amp = layer === 0 ? 1 : layer === 1 ? 0.6 : 0.3;
      const y = cy + v * (h * 0.4) * amp;
      const x = i * sliceW;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.strokeStyle = theme.colors(layer * 30, 90);
    ctx.lineWidth = layer === 0 ? 2.5 : layer === 1 ? 1.5 : 1;
    ctx.globalAlpha = layer === 0 ? 1 : layer === 1 ? 0.4 : 0.15;

    if (layer === 0) {
      ctx.shadowColor = theme.accent;
      ctx.shadowBlur = 15;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;

  // Fill under main wave
  ctx.beginPath();
  ctx.moveTo(0, cy);
  for (let i = 0; i < wave.length; i++) {
    const v = (wave[i] / 128.0 - 1);
    const y = cy + v * (h * 0.4);
    ctx.lineTo(i * sliceW, y);
  }
  ctx.lineTo(w, cy);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, cy - h * 0.4, 0, cy + h * 0.4);
  grad.addColorStop(0, theme.accent + "15");
  grad.addColorStop(0.5, theme.accent + "08");
  grad.addColorStop(1, theme.accent + "15");
  ctx.fillStyle = grad;
  ctx.fill();

  // Center line
  ctx.beginPath();
  ctx.moveTo(0, cy);
  ctx.lineTo(w, cy);
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawGalaxy(ctx, w, h, freq, wave, theme, time, particlesRef) {
  const cx = w / 2;
  const cy = h / 2;
  const avgBass = (freq.slice(0, 10).reduce((a, b) => a + b, 0) / 10) / 255;
  const avgMid = (freq.slice(10, 40).reduce((a, b) => a + b, 0) / 30) / 255;
  const avgHigh = (freq.slice(40, 80).reduce((a, b) => a + b, 0) / 40) / 255;

  // Initialize particles
  if (!particlesRef.current || particlesRef.current.length === 0) {
    particlesRef.current = Array.from({ length: 300 }, () => ({
      angle: Math.random() * Math.PI * 2,
      radius: 30 + Math.random() * Math.min(w, h) * 0.42,
      speed: (Math.random() - 0.5) * 0.008,
      size: Math.random() * 2.5 + 0.5,
      band: Math.floor(Math.random() * 3), // 0=bass, 1=mid, 2=high
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: (Math.random() - 0.5) * 0.02,
    }));
  }

  const particles = particlesRef.current;
  const energy = [avgBass, avgMid, avgHigh];

  // Central glow
  const cGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60 + avgBass * 80);
  cGrad.addColorStop(0, theme.accent + "33");
  cGrad.addColorStop(0.5, theme.accent + "11");
  cGrad.addColorStop(1, "transparent");
  ctx.fillStyle = cGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 60 + avgBass * 80, 0, Math.PI * 2);
  ctx.fill();

  // Update and draw particles
  particles.forEach((p) => {
    const e = energy[p.band];
    p.angle += p.speed * (1 + e * 3);
    p.wobble += p.wobbleSpeed;

    const wobbleOffset = Math.sin(p.wobble) * (5 + e * 20);
    const r = p.radius + wobbleOffset + e * 30;

    const x = cx + Math.cos(p.angle) * r;
    const y = cy + Math.sin(p.angle) * r;

    const size = p.size * (1 + e * 2);

    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = theme.colors(
      Math.floor(((p.angle + time * 0.0002) % (Math.PI * 2)) / (Math.PI * 2) * 100),
      100
    );
    ctx.globalAlpha = 0.3 + e * 0.6;

    if (e > 0.5) {
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = size * 4;
    }
    ctx.fill();
    ctx.shadowBlur = 0;
  });
  ctx.globalAlpha = 1;

  // Connecting lines between nearby bass particles
  if (avgBass > 0.3) {
    const bassParticles = particles.filter((p) => p.band === 0).slice(0, 30);
    ctx.globalAlpha = avgBass * 0.15;
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 0.5;
    for (let i = 0; i < bassParticles.length; i++) {
      const p = bassParticles[i];
      const r1 = p.radius + Math.sin(p.wobble) * 5 + avgBass * 30;
      const x1 = cx + Math.cos(p.angle) * r1;
      const y1 = cy + Math.sin(p.angle) * r1;
      for (let j = i + 1; j < bassParticles.length; j++) {
        const p2 = bassParticles[j];
        const r2 = p2.radius + Math.sin(p2.wobble) * 5 + avgBass * 30;
        const x2 = cx + Math.cos(p2.angle) * r2;
        const y2 = cy + Math.sin(p2.angle) * r2;
        const dist = Math.hypot(x2 - x1, y2 - y1);
        if (dist < 100) {
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
  }
}

const MODES = [
  { key: "bars", name: "Bars", icon: "▐▐▐", draw: drawBars },
  { key: "circular", name: "Circular", icon: "◎", draw: drawCircular },
  { key: "waveform", name: "Wave", icon: "∿", draw: drawWaveform },
  { key: "galaxy", name: "Galaxy", icon: "✦", draw: drawGalaxy },
];

// ─── Main App ────────────────────────────────────────────

export default function App() {
  const [mode, setMode] = useState("bars");
  const [themeKey, setThemeKey] = useState("neon");
  const [source, setSource] = useState(null); // 'mic' | 'file'
  const [isPlaying, setIsPlaying] = useState(false);
  const [fileName, setFileName] = useState("");
  const [sensitivity, setSensitivity] = useState(1.0);
  const [showControls, setShowControls] = useState(true);
  const [lyrics, setLyrics] = useState(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [currentMood, setCurrentMood] = useState(null);
  const [customLyrics, setCustomLyrics] = useState("");
  const [lyricsMode, setLyricsMode] = useState("search"); // "search" | "ai" | "paste"
  const [lyricsView, setLyricsView] = useState("overlay"); // "overlay" | "panel"
  const [karaokeIndex, setKaraokeIndex] = useState(0);
  const [karaokePlaying, setKaraokePlaying] = useState(false);
  const karaokeRef = useRef(null);

  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const streamRef = useRef(null);
  const audioElRef = useRef(null);
  const particlesRef = useRef(null);

  const theme = THEMES[themeKey];

  const cleanup = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    if (audioElRef.current) { audioElRef.current.pause(); audioElRef.current = null; }
    if (sourceNodeRef.current) { try { sourceNodeRef.current.disconnect(); } catch {} }
    sourceNodeRef.current = null;
    streamRef.current = null;
    particlesRef.current = null;
    setIsPlaying(false);
    setSource(null);
    setFileName("");
  }, []);

  const startMic = useCallback(async () => {
    cleanup();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") await ctx.resume();

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.82;
      analyserRef.current = analyser;

      const src = ctx.createMediaStreamSource(stream);
      src.connect(analyser);
      sourceNodeRef.current = src;

      setSource("mic");
      setIsPlaying(true);
    } catch (err) {
      console.error("Microphone error:", err);
    }
  }, [cleanup]);

  const startFile = useCallback(async (file) => {
    cleanup();
    setFileName(file.name);

    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") await ctx.resume();

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.82;
    analyserRef.current = analyser;

    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.src = URL.createObjectURL(file);
    audioElRef.current = audio;

    const src = ctx.createMediaElementSource(audio);
    src.connect(analyser);
    analyser.connect(ctx.destination);
    sourceNodeRef.current = src;

    audio.play();
    audio.onended = () => { setIsPlaying(false); };

    setSource("file");
    setIsPlaying(true);
  }, [cleanup]);

  const togglePause = useCallback(() => {
    if (!audioElRef.current) return;
    if (audioElRef.current.paused) {
      audioElRef.current.play();
      setIsPlaying(true);
    } else {
      audioElRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleGenerateLyrics = useCallback(async () => {
    if (lyricsLoading) return;
    setLyricsLoading(true);
    const mood = detectMood(analyserRef.current);
    setCurrentMood(mood);
    try {
      const result = await generateLyrics(mood, fileName);
      setLyrics(result);
      setShowLyrics(true);
      setLyricsMode("ai");
    } catch (err) {
      console.error("Lyrics generation error:", err);
    }
    setLyricsLoading(false);
  }, [lyricsLoading, fileName]);

  const handleSearchLyrics = useCallback(async () => {
    if (lyricsLoading || !fileName) return;
    setLyricsLoading(true);
    try {
      const result = await searchLyrics(fileName);
      if (result) {
        setLyrics(result);
        setShowLyrics(true);
        setLyricsMode("search");
      } else {
        setLyrics({ title: "Ni zadetkov", artist: "", verses: "Lyrics za to pesem niso bili najdeni.\n\nPoskusi:\n• Preimenuj datoteko v format: Artist - Song Title.mp3\n• Uporabi 📋 Prilepi tab in ročno prilepi lyrics\n• Uporabi ✍ AI Lyrics za generirane lyrics", mood_emoji: "😕" });
        setShowLyrics(true);
        setLyricsMode("search");
      }
    } catch (err) {
      console.error("Lyrics search error:", err);
    }
    setLyricsLoading(false);
  }, [lyricsLoading, fileName]);

  // Periodically update mood display
  useEffect(() => {
    if (!isPlaying || !analyserRef.current) { setCurrentMood(null); return; }
    const interval = setInterval(() => {
      setCurrentMood(detectMood(analyserRef.current));
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Karaoke sync — uses synced timestamps or falls back to auto-scroll
  useEffect(() => {
    if (!showLyrics || !lyrics || lyricsView !== "overlay" || !isPlaying) {
      setKaraokePlaying(false);
      return;
    }

    setKaraokePlaying(true);

    // If we have synced lyrics + audio element, use real timestamps
    if (lyrics.syncedLines && audioElRef.current) {
      const syncInterval = setInterval(() => {
        const currentTime = audioElRef.current?.currentTime || 0;
        const lines = lyrics.syncedLines;
        let idx = 0;
        for (let i = lines.length - 1; i >= 0; i--) {
          if (currentTime >= lines[i].time) { idx = i; break; }
        }
        setKaraokeIndex(idx);
      }, 100); // Check 10x per second for smooth sync

      return () => clearInterval(syncInterval);
    }

    // Fallback: auto-scroll for mic input or non-synced lyrics
    const lines = lyrics.verses.split("\n").filter((l) => l.trim() !== "");
    if (lines.length === 0) return;
    setKaraokeIndex(0);

    const speed = currentMood?.energy === "high" ? 2500 : currentMood?.energy === "low" ? 4000 : 3200;
    karaokeRef.current = setInterval(() => {
      setKaraokeIndex((prev) => (prev + 1) % lines.length);
    }, speed);

    return () => clearInterval(karaokeRef.current);
  }, [showLyrics, lyrics, lyricsView, isPlaying]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const analyser = analyserRef.current;
    const freqData = new Uint8Array(analyser.frequencyBinCount);
    const waveData = new Uint8Array(analyser.fftSize);

    const currentMode = MODES.find((m) => m.key === mode);

    const render = (time) => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      const w = rect.width;
      const h = rect.height;

      // Clear with theme bg
      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, w, h);

      // Get audio data
      analyser.getByteFrequencyData(freqData);
      analyser.getByteTimeDomainData(waveData);

      // Apply sensitivity
      const scaledFreq = new Uint8Array(freqData.length);
      for (let i = 0; i < freqData.length; i++) {
        scaledFreq[i] = Math.min(255, Math.floor(freqData[i] * sensitivity));
      }

      // Draw
      currentMode.draw(ctx, w, h, scaledFreq, waveData, theme, time, particlesRef);

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying, mode, themeKey, sensitivity, theme]);

  // Draw idle state
  useEffect(() => {
    if (isPlaying || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Idle animation
    ctx.fillStyle = theme.accent + "12";
    ctx.font = `bold 120px 'Syne', sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("♫", rect.width / 2, rect.height / 2);
  }, [isPlaying, themeKey, theme]);

  return (
    <div style={{
      minHeight: "100vh", background: theme.bg,
      fontFamily: "'Syne', 'Outfit', sans-serif",
      color: "#e0e0e0", position: "relative", overflow: "hidden",
      transition: "background 0.5s",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        * { margin:0; padding:0; box-sizing:border-box; }
        body { background: ${theme.bg}; overflow: hidden; }
        button:focus { outline:none; }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        input[type="range"] {
          -webkit-appearance: none; appearance: none;
          width: 100%; height: 4px; border-radius: 2px;
          background: rgba(255,255,255,0.1); outline: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 14px; height: 14px; border-radius: 50%;
          background: ${theme.accent}; cursor: pointer;
          box-shadow: 0 0 8px ${theme.glow};
        }
        input[type="range"]::-moz-range-thumb {
          width: 14px; height: 14px; border-radius: 50%;
          background: ${theme.accent}; cursor: pointer; border: none;
        }
      `}</style>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed", inset: 0,
          width: "100vw", height: "100vh",
          display: "block",
        }}
      />

      {/* UI Overlay */}
      <div style={{ position: "fixed", inset: 0, zIndex: 10, pointerEvents: "none" }}>
        {/* Top bar */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "16px 24px", pointerEvents: "auto",
        }}>
          <div style={{
            fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em",
            background: `linear-gradient(135deg, ${theme.accent}, #fff)`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            SOUNDWAVES
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {currentMood && isPlaying && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "rgba(0,0,0,0.4)", backdropFilter: "blur(12px)",
                padding: "6px 14px", borderRadius: 20,
                border: `1px solid ${theme.accent}33`,
                fontSize: 11, color: theme.accent,
                transition: "all 0.3s",
              }}>
                <span style={{ opacity: 0.6 }}>MOOD</span>
                <span style={{ fontWeight: 700, textTransform: "uppercase" }}>{currentMood.mood}</span>
                <span style={{ opacity: 0.4 }}>|</span>
                <span style={{ opacity: 0.6 }}>⚡{currentMood.energy}</span>
              </div>
            )}
            {source && isPlaying && (
              <button
                onClick={() => { setShowLyrics(true); setLyricsView("overlay"); setLyricsMode("search"); handleSearchLyrics(); }}
                disabled={lyricsLoading || !fileName}
                title={!fileName ? "Naloži glasbo za iskanje lyrics" : "Poišči lyrics pesmi"}
                style={{
                  background: lyricsLoading ? "rgba(255,255,255,0.04)" : `${theme.accent}22`,
                  backdropFilter: "blur(12px)",
                  border: `1px solid ${theme.accent}44`, borderRadius: 20,
                  padding: "6px 14px", color: !fileName ? "#555" : theme.accent, fontSize: 12,
                  fontWeight: 700, cursor: lyricsLoading ? "wait" : !fileName ? "not-allowed" : "pointer",
                  fontFamily: "'Syne', sans-serif", transition: "all 0.2s",
                }}
              >
                {lyricsLoading ? "⟳ Iščem..." : "🔍 Lyrics"}
              </button>
            )}
            {(lyrics || source) && (
              <button onClick={() => {
                if (!showLyrics) { setShowLyrics(true); setLyricsView("overlay"); }
                else if (lyricsView === "overlay") { setLyricsView("panel"); }
                else { setShowLyrics(false); setLyricsView("overlay"); }
              }} title={!showLyrics ? "Prikaži lyrics" : lyricsView === "overlay" ? "Odpri panel" : "Skrij lyrics"} style={{
                background: showLyrics ? `${theme.accent}22` : "rgba(0,0,0,0.4)",
                backdropFilter: "blur(12px)",
                border: `1px solid ${showLyrics ? theme.accent : "rgba(255,255,255,0.06)"}`,
                borderRadius: 10, width: 36, height: 36,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: showLyrics ? theme.accent : "#999", fontSize: 14, cursor: "pointer",
                fontFamily: "'Syne', sans-serif", fontWeight: 700,
              }}>{!showLyrics ? "♫" : lyricsView === "overlay" ? "☰" : "✕"}</button>
            )}
            {source && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "rgba(0,0,0,0.4)", backdropFilter: "blur(12px)",
                padding: "6px 14px", borderRadius: 20,
                border: "1px solid rgba(255,255,255,0.06)",
                fontSize: 12, color: "#999",
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: isPlaying ? "#22c55e" : "#ef4444",
                  animation: isPlaying ? "pulse 1.5s infinite" : "none",
                }} />
                {source === "mic" ? "Mikrofon" : fileName || "Datoteka"}
              </div>
            )}
            <button
              onClick={() => setShowControls(!showControls)}
              style={{
                background: "rgba(0,0,0,0.4)", backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10,
                width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
                color: "#999", fontSize: 16, cursor: "pointer",
              }}
            >
              {showControls ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Center content when idle */}
        {!source && (
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center", pointerEvents: "auto",
            animation: "fadeIn 0.8s ease",
          }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>♫</div>
            <div style={{
              fontWeight: 800, fontSize: 32, marginBottom: 8,
              background: `linear-gradient(135deg, ${theme.accent}, #fff)`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              Izberi vir zvoka
            </div>
            <div style={{ color: "#aaa", fontSize: 14, marginBottom: 32 }}>
              Poveži mikrofon ali naloži glasbo
            </div>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={startMic}
                style={{
                  background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent}cc)`,
                  border: "none", borderRadius: 14, padding: "14px 32px",
                  color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer",
                  fontFamily: "'Syne', sans-serif",
                  boxShadow: `0 0 30px ${theme.glow}`,
                  transition: "transform 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
                🎤 Mikrofon
              </button>
              <label style={{
                background: "rgba(255,255,255,0.06)",
                border: "2px solid rgba(255,255,255,0.08)", borderRadius: 14,
                padding: "14px 32px", color: "#ccc", fontWeight: 700, fontSize: 15,
                cursor: "pointer", fontFamily: "'Syne', sans-serif",
                transition: "all 0.2s",
              }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = theme.accent}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
              >
                📁 Naloži glasbo
                <input type="file" accept="audio/*" hidden
                  onChange={(e) => e.target.files[0] && startFile(e.target.files[0])}
                />
              </label>
            </div>
          </div>
        )}

        {/* Bottom Controls Panel */}
        {showControls && source && (
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            background: "linear-gradient(transparent, rgba(0,0,0,0.7) 30%, rgba(0,0,0,0.85))",
            padding: "48px 24px 24px", pointerEvents: "auto",
            animation: "slideUp 0.3s ease",
          }}>
            <div style={{ maxWidth: 700, margin: "0 auto" }}>
              {/* Viz mode buttons */}
              <div style={{ display: "flex", gap: 8, marginBottom: 16, justifyContent: "center" }}>
                {MODES.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => { setMode(m.key); particlesRef.current = null; }}
                    style={{
                      background: mode === m.key ? `${theme.accent}22` : "rgba(255,255,255,0.04)",
                      border: `1.5px solid ${mode === m.key ? theme.accent : "rgba(255,255,255,0.08)"}`,
                      borderRadius: 10, padding: "8px 18px",
                      color: mode === m.key ? theme.accent : "#888",
                      fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13,
                      cursor: "pointer", transition: "all 0.2s",
                      display: "flex", alignItems: "center", gap: 6,
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{m.icon}</span>
                    {m.name}
                  </button>
                ))}
              </div>

              {/* Theme + controls row */}
              <div style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
                {/* Themes */}
                <div style={{ display: "flex", gap: 6 }}>
                  {Object.entries(THEMES).map(([key, t]) => (
                    <button
                      key={key}
                      onClick={() => setThemeKey(key)}
                      title={t.name}
                      style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: themeKey === key ? `${t.accent}33` : "rgba(255,255,255,0.04)",
                        border: `1.5px solid ${themeKey === key ? t.accent : "rgba(255,255,255,0.08)"}`,
                        cursor: "pointer", fontSize: 14, transition: "all 0.2s",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      {t.icon}
                    </button>
                  ))}
                </div>

                <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.08)" }} />

                {/* Sensitivity */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "#aaa", fontWeight: 600 }}>GAIN</span>
                  <input
                    type="range" min="0.3" max="3" step="0.1"
                    value={sensitivity}
                    onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                    style={{ width: 100 }}
                  />
                </div>

                <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.08)" }} />

                {/* Action buttons */}
                <div style={{ display: "flex", gap: 8 }}>
                  {source === "file" && (
                    <button
                      onClick={togglePause}
                      style={{
                        background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.1)",
                        borderRadius: 10, padding: "8px 18px",
                        color: "#ccc", fontFamily: "'Syne', sans-serif", fontWeight: 600,
                        fontSize: 13, cursor: "pointer",
                      }}
                    >
                      {isPlaying ? "⏸ Pavza" : "▶ Predvajaj"}
                    </button>
                  )}
                  <button
                    onClick={startMic}
                    style={{
                      background: source === "mic" ? `${theme.accent}22` : "rgba(255,255,255,0.04)",
                      border: `1.5px solid ${source === "mic" ? theme.accent : "rgba(255,255,255,0.08)"}`,
                      borderRadius: 10, padding: "8px 14px",
                      color: source === "mic" ? theme.accent : "#888",
                      fontFamily: "'Syne', sans-serif", fontWeight: 600,
                      fontSize: 13, cursor: "pointer",
                    }}
                  >
                    🎤
                  </button>
                  <label style={{
                    background: source === "file" ? `${theme.accent}22` : "rgba(255,255,255,0.04)",
                    border: `1.5px solid ${source === "file" ? theme.accent : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 10, padding: "8px 14px",
                    color: source === "file" ? theme.accent : "#888",
                    fontFamily: "'Syne', sans-serif", fontWeight: 600,
                    fontSize: 13, cursor: "pointer",
                  }}>
                    📁
                    <input type="file" accept="audio/*" hidden
                      onChange={(e) => e.target.files[0] && startFile(e.target.files[0])}
                    />
                  </label>
                  <button
                    onClick={cleanup}
                    style={{
                      background: "rgba(239,68,68,0.1)", border: "1.5px solid rgba(239,68,68,0.2)",
                      borderRadius: 10, padding: "8px 14px",
                      color: "#ef4444", fontFamily: "'Syne', sans-serif", fontWeight: 600,
                      fontSize: 13, cursor: "pointer",
                    }}
                  >
                    ■ Stop
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Karaoke Lyrics Overlay */}
      {showLyrics && lyrics && lyricsView === "overlay" && (() => {
        // Use synced lines if available, otherwise fall back to plain text
        const useSynced = lyrics.syncedLines && lyrics.syncedLines.length > 0;
        const lines = useSynced
          ? lyrics.syncedLines.map((l) => l.text)
          : lyrics.verses.split("\n").filter((l) => l.trim() !== "");
        if (lines.length === 0) return null;
        const idx = Math.min(karaokeIndex, lines.length - 1);

        return (
          <div
            onClick={() => !useSynced && setKaraokeIndex((prev) => (prev + 1) % lines.length)}
            style={{
              position: "fixed", inset: 0,
              zIndex: 40, cursor: useSynced ? "default" : "pointer",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              pointerEvents: "auto",
            }}
          >
            <style>{`
              @keyframes lyricPop { from{opacity:0;transform:scale(0.9) translateY(15px)} to{opacity:1;transform:scale(1) translateY(0)} }
              @keyframes lyricDim { from{opacity:0} to{opacity:0.25} }
            `}</style>

            {/* Song info pill - top */}
            <div style={{
              position: "absolute", top: 60,
              display: "flex", alignItems: "center", gap: 8,
              background: "rgba(0,0,0,0.5)", backdropFilter: "blur(12px)",
              padding: "6px 18px", borderRadius: 20,
              border: `1px solid ${theme.accent}22`,
            }}>
              <span style={{ fontSize: 13 }}>{lyrics.mood_emoji}</span>
              <span style={{ fontSize: 12, color: theme.accent, fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>
                {lyrics.title}
              </span>
              {lyrics.artist && lyrics.artist !== "Unknown" && lyrics.artist !== "Original" && (
                <span style={{ fontSize: 12, color: "#aaa" }}>— {lyrics.artist}</span>
              )}
              {useSynced && (
                <span style={{ fontSize: 9, color: "#888", marginLeft: 4 }}>● SYNCED</span>
              )}
            </div>

            {/* Lyrics area - centered */}
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: 8, maxWidth: "80vw", padding: "0 20px",
            }}>
              {/* Previous line */}
              {idx > 0 && (
                <div key={`p-${idx}`} style={{
                  fontSize: "clamp(16px, 2.5vw, 22px)", color: "#fff", opacity: 0.15,
                  fontFamily: "'Outfit', sans-serif", fontWeight: 500,
                  textAlign: "center",
                  textShadow: "0 2px 10px rgba(0,0,0,0.8)",
                  animation: "lyricDim 0.3s ease",
                }}>
                  {lines[idx - 1]}
                </div>
              )}

              {/* Current line — BIG */}
              <div key={`c-${idx}`} style={{
                fontSize: "clamp(28px, 5vw, 52px)",
                color: "#fff", fontWeight: 800,
                fontFamily: "'Outfit', sans-serif",
                textAlign: "center",
                textShadow: `0 0 40px ${theme.accent}55, 0 0 80px ${theme.accent}22, 0 4px 20px rgba(0,0,0,0.8)`,
                animation: "lyricPop 0.4s cubic-bezier(0.34,1.56,0.64,1)",
                lineHeight: 1.3,
              }}>
                {lines[idx]}
              </div>

              {/* Next line */}
              {idx < lines.length - 1 && (
                <div key={`n-${idx}`} style={{
                  fontSize: "clamp(16px, 2.5vw, 22px)", color: "#fff", opacity: 0.15,
                  fontFamily: "'Outfit', sans-serif", fontWeight: 500,
                  textAlign: "center",
                  textShadow: "0 2px 10px rgba(0,0,0,0.8)",
                  animation: "lyricDim 0.3s ease",
                }}>
                  {lines[idx + 1]}
                </div>
              )}
            </div>

            {/* Progress bar — bottom */}
            <div style={{
              position: "absolute", bottom: 70, left: "10%", right: "10%",
              height: 3, borderRadius: 2, background: "rgba(255,255,255,0.08)",
            }}>
              <div style={{
                height: "100%", borderRadius: 2, background: theme.accent,
                width: `${((idx + 1) / lines.length) * 100}%`,
                transition: "width 0.3s ease",
                boxShadow: `0 0 10px ${theme.accent}55`,
              }} />
            </div>
          </div>
        );
      })()}

      {/* Lyrics Side Panel */}
      {showLyrics && lyricsView === "panel" && (
        <div style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: 380, maxWidth: "90vw", zIndex: 50,
          background: "rgba(8,7,14,0.92)", backdropFilter: "blur(20px)",
          borderLeft: `1px solid ${theme.accent}22`,
          animation: "slideLeft 0.4s ease",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          <style>{`@keyframes slideLeft { from{transform:translateX(100%);opacity:0} to{transform:translateX(0);opacity:1} }`}</style>

          {/* Header */}
          <div style={{
            padding: "16px 20px", borderBottom: `1px solid ${theme.accent}15`,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            {/* Mode tabs */}
            <div style={{ display: "flex", gap: 4 }}>
              {[
                { key: "search", label: "🔍 Poišči" },
                { key: "ai", label: "✍ AI" },
                { key: "paste", label: "📋 Prilepi" },
              ].map((tab) => (
                <button key={tab.key} onClick={() => setLyricsMode(tab.key)} style={{
                  background: lyricsMode === tab.key ? `${theme.accent}22` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${lyricsMode === tab.key ? theme.accent + "55" : "rgba(255,255,255,0.06)"}`,
                  borderRadius: 8, padding: "6px 12px",
                  color: lyricsMode === tab.key ? theme.accent : "#666",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                  fontFamily: "'Syne', sans-serif",
                }}>{tab.label}</button>
              ))}
            </div>
            <button onClick={() => setShowLyrics(false)} style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8, width: 32, height: 32, color: "#aaa", fontSize: 14,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}>✕</button>
          </div>

          {lyricsMode === "paste" ? (
            /* Paste Mode */
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px 20px" }}>
              <div style={{ fontSize: 11, color: "#aaa", marginBottom: 8, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Prilepi lyrics pesmi
              </div>
              <textarea
                value={customLyrics}
                onChange={(e) => setCustomLyrics(e.target.value)}
                placeholder={"Prilepi besedilo pesmi tukaj...\n\nLyrics lahko najdeš na:\n• Genius.com\n• AZLyrics.com\n• Musixmatch.com"}
                style={{
                  flex: 1, background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10,
                  padding: "14px 16px", color: "#ccc", fontSize: 14,
                  fontFamily: "'Outfit', sans-serif", resize: "none",
                  lineHeight: 1.8,
                }}
                onFocus={(e) => e.target.style.borderColor = theme.accent + "55"}
                onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
              />
              {customLyrics && (
                <button onClick={() => {
                  setLyrics({ title: fileName?.replace(/\.(mp3|wav|ogg|flac|m4a)$/i, "").replace(/[_\-]+/g, " ") || "Custom", verses: customLyrics, mood_emoji: "🎵", artist: "Custom" });
                  setLyricsMode("ai");
                }} style={{
                  marginTop: 12, background: `${theme.accent}15`,
                  border: `1px solid ${theme.accent}33`, borderRadius: 10,
                  padding: "10px", color: theme.accent, fontWeight: 700,
                  fontSize: 13, cursor: "pointer", fontFamily: "'Syne', sans-serif",
                }}>
                  ✓ Uporabi te lyrics
                </button>
              )}
            </div>
          ) : (
            /* AI Lyrics Mode */
            <>
              {/* Song Info */}
              {lyrics && (
                <div style={{ padding: "16px 20px", borderBottom: `1px solid ${theme.accent}10` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 28 }}>{lyrics.mood_emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: 800, fontSize: 18, color: "#fff",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {lyrics.title}
                      </div>
                      {lyrics.artist && lyrics.artist !== "Unknown" && lyrics.artist !== "Original" && (
                        <div style={{ fontSize: 13, color: theme.accent, fontWeight: 500, marginTop: 2 }}>
                          {lyrics.artist}
                        </div>
                      )}
                    </div>
                  </div>
                  {lyrics.note && (
                    <div style={{ fontSize: 10, color: "#999", marginTop: 8, fontStyle: "italic" }}>
                      {lyrics.note}
                    </div>
                  )}
                </div>
              )}

              {/* Audio Analysis */}
              {currentMood && (
                <div style={{ padding: "12px 20px", borderBottom: `1px solid ${theme.accent}08` }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[
                      { label: "Bass", value: currentMood.bass, color: "#f72585" },
                      { label: "Mid", value: currentMood.mid, color: "#4cc9f0" },
                      { label: "High", value: currentMood.high, color: "#06d6a0" },
                    ].map((band) => (
                      <div key={band.label} style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#888", marginBottom: 3 }}>
                          <span>{band.label}</span>
                          <span style={{ color: band.color }}>{band.value}%</span>
                        </div>
                        <div style={{ height: 2, borderRadius: 1, background: "rgba(255,255,255,0.04)" }}>
                          <div style={{
                            height: "100%", borderRadius: 1, background: band.color,
                            width: `${band.value}%`, transition: "width 0.5s ease",
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lyrics Content */}
              <div style={{
                flex: 1, overflow: "auto", padding: "20px 24px",
                fontFamily: "'Outfit', sans-serif",
              }}>
                {lyrics ? lyrics.verses.split("\n").map((line, i) => (
                  <div key={i} style={{
                    fontSize: line.trim() === "" ? 8 : 15,
                    color: line.trim() === "" ? "transparent" : "#ccc",
                    lineHeight: 2,
                    fontWeight: 400,
                    ...(line.trim() === "" ? { height: 20 } : {}),
                  }}>
                    {line || " "}
                  </div>
                )) : (
                  <div style={{ textAlign: "center", color: "#999", paddingTop: 40 }}>
                    <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>
                      {lyricsMode === "search" ? "🔍" : "✍"}
                    </div>
                    <div style={{ fontSize: 14 }}>
                      {lyricsMode === "search"
                        ? "Klikni 'Poišči' za iskanje lyrics"
                        : "Klikni 'Generiraj' za AI lyrics"}
                    </div>
                    <div style={{ fontSize: 12, marginTop: 6, color: "#888" }}>
                      {lyricsMode === "search"
                        ? "Ime datoteke se uporabi za iskanje"
                        : "AI generira lyrics na podlagi mooda glasbe"}
                    </div>
                  </div>
                )}
              </div>

              {/* Source attribution */}
              {lyrics?.source && (
                <div style={{ padding: "0 20px 8px", fontSize: 10, color: "#888" }}>
                  Vir: {lyrics.source}
                </div>
              )}

              {/* Bottom Actions */}
              <div style={{ padding: "12px 20px", borderTop: `1px solid ${theme.accent}10`, display: "flex", gap: 8 }}>
                {lyricsMode === "search" ? (
                  <button
                    onClick={handleSearchLyrics}
                    disabled={lyricsLoading || !fileName}
                    style={{
                      flex: 1, background: `${theme.accent}15`,
                      border: `1px solid ${theme.accent}33`, borderRadius: 10,
                      padding: "10px", color: !fileName ? "#555" : theme.accent, fontWeight: 700,
                      fontSize: 12, cursor: lyricsLoading ? "wait" : !fileName ? "not-allowed" : "pointer",
                      fontFamily: "'Syne', sans-serif",
                    }}
                  >
                    {lyricsLoading ? "⟳ Iščem..." : "🔍 Poišči lyrics"}
                  </button>
                ) : (
                  <button
                    onClick={handleGenerateLyrics}
                    disabled={lyricsLoading}
                    style={{
                      flex: 1, background: `${theme.accent}15`,
                      border: `1px solid ${theme.accent}33`, borderRadius: 10,
                      padding: "10px", color: theme.accent, fontWeight: 700,
                      fontSize: 12, cursor: lyricsLoading ? "wait" : "pointer",
                      fontFamily: "'Syne', sans-serif",
                    }}
                  >
                    {lyricsLoading ? "⟳ Generiram..." : "✍ AI Generiraj lyrics"}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Keyboard shortcuts hint */}
      {source && showControls && (
        <div style={{
          position: "fixed", bottom: 8, left: "50%", transform: "translateX(-50%)",
          zIndex: 20, fontSize: 10, color: "#888", letterSpacing: "0.06em",
        }}>
          SOUNDWAVES v1.0 — Built with React + Web Audio API by Pengu
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from "react";

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
  const barCount = 80;
  const gap = 2;
  const barW = (w - gap * barCount) / barCount;
  const step = Math.floor(freq.length / barCount);

  for (let i = 0; i < barCount; i++) {
    let sum = 0;
    for (let j = 0; j < step; j++) sum += freq[i * step + j];
    const val = (sum / step) / 255;
    const barH = val * h * 0.85 + 2;

    const x = i * (barW + gap);
    const y = h - barH;

    const color = theme.colors(i, barCount);
    ctx.fillStyle = color;

    // Main bar with rounded top
    const radius = Math.min(barW / 2, 4);
    ctx.beginPath();
    ctx.moveTo(x, h);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.lineTo(x + barW - radius, y);
    ctx.quadraticCurveTo(x + barW, y, x + barW, y + radius);
    ctx.lineTo(x + barW, h);
    ctx.fill();

    // Glow effect
    if (val > 0.4) {
      ctx.shadowColor = color;
      ctx.shadowBlur = val * 20;
      ctx.fillRect(x, y, barW, 2);
      ctx.shadowBlur = 0;
    }

    // Reflection
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.08;
    ctx.fillRect(x, h, barW, barH * 0.2);
    ctx.globalAlpha = 1;
  }
}

function drawCircular(ctx, w, h, freq, wave, theme, time) {
  const cx = w / 2;
  const cy = h / 2;
  const baseR = Math.min(w, h) * 0.22;
  const barCount = 120;
  const step = Math.floor(freq.length / barCount);

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
    let sum = 0;
    for (let j = 0; j < step; j++) sum += freq[i * step + j];
    const val = (sum / step) / 255;

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
  const [sensitivity, setSensitivity] = useState(1.2);
  const [showControls, setShowControls] = useState(true);

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

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
            <div style={{ color: "#666", fontSize: 14, marginBottom: 32 }}>
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
                  <span style={{ fontSize: 11, color: "#666", fontWeight: 600 }}>GAIN</span>
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

      {/* Keyboard shortcuts hint */}
      {source && showControls && (
        <div style={{
          position: "fixed", bottom: 8, left: "50%", transform: "translateX(-50%)",
          zIndex: 20, fontSize: 10, color: "#444", letterSpacing: "0.06em",
        }}>
          SOUNDWAVES v1.0 — Built with React + Web Audio API by Pengu
        </div>
      )}
    </div>
  );
}

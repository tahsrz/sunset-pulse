'use client';

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { useVibe } from '@/context/VibeContext';

interface TacticalClothProps {
  id?: string;
  status?: string;
  moodColor?: string; // Fallback or override
  videoSrc?: string;
  width?: number;
  height?: number;
  className?: string;
}

export interface TacticalClothRef {
  applyForce: (x: number, y: number, radius: number, strength: number) => void;
  pet: () => void;
  glitch: () => void;
}

/**
 * TacticalCloth - A high-performance Verlet-integration cloth simulation 
 * wrapped in the Sunset Pulse tactical UI framework.
 * 
 * v3.2: Added dynamic scaling for "Bubble Trouble" integration.
 */
const TacticalCloth = forwardRef<TacticalClothRef, TacticalClothProps>(({ 
  id = "042", 
  status: initialStatus = "AWAKE", 
  moodColor: overrideColor,
  videoSrc = "/videos/jamie_base.mp4",
  width = 194,
  height = 228,
  className = ""
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { currentVibe, vibeTheme } = useVibe();
  
  // Local state for animation triggers
  const [status, setStatus] = useState(initialStatus);

  // Simulation State
  const points = useRef<any[]>([]);
  const constraints = useRef<any[]>([]);
  const mouse = useRef({ x: 0, y: 0, px: 0, py: 0, down: false });

  // Map vibes to colors and behaviors
  const activeColor = overrideColor || vibeTheme?.variables?.['--primary-glow'] || "#22c55e";
  const isGlitching = currentVibe === 'vibe-maxxing';

  useImperativeHandle(ref, () => ({
    applyForce: (x: number, y: number, radius: number, strength: number) => {
      points.current.forEach(p => {
        const dx = p.x - x;
        const dy = p.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < radius) {
          p.px = p.x - strength * (Math.random() - 0.5);
          p.py = p.y - strength;
        }
      });
    },
    pet: () => {
      points.current.forEach(p => {
        if (!p.pinned) {
          p.py -= 8;
          p.px += (Math.random() - 0.5) * 8;
        }
      });
    },
    glitch: () => {
      points.current.forEach(p => {
        if (!p.pinned && Math.random() > 0.8) {
          p.x += (Math.random() - 0.5) * 40;
          p.y += (Math.random() - 0.5) * 40;
        }
      });
    }
  }));

  useEffect(() => {
    if (isGlitching) {
      setStatus("MAXXING");
    } else {
      setStatus(currentVibe.replace('vibe-', '').toUpperCase() || "AWAKE");
    }
  }, [currentVibe, isGlitching]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    const video = videoRef.current;
    if (video) {
      video.play().catch(() => {});
    }

    // Cloth settings
    const spacing = Math.max(4, Math.floor(width / 22)); // Dynamic spacing based on width
    const cols = Math.floor(width / spacing);
    const rows = Math.floor(height / spacing);
    const stiffness = 0.9;
    const gravity = 0.12;
    const friction = 0.99;

    // Initialize points
    const pts = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const pt = {
          x: x * spacing + (width - cols * spacing) / 2,
          y: y * spacing + 10,
          px: x * spacing + (width - cols * spacing) / 2,
          py: y * spacing + 10,
          pinned: y === 0
        };
        pts.push(pt);
      }
    }

    // Initialize constraints
    const cons = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (x < cols - 1) cons.push([pts[y * cols + x], pts[y * cols + x + 1], spacing]);
        if (y < rows - 1) cons.push([pts[y * cols + x], pts[(y + 1) * cols + x], spacing]);
      }
    }

    points.current = pts;
    constraints.current = cons;

    let animationFrameId: number;

    const update = () => {
      // Verlet Integration
      points.current.forEach(p => {
        if (!p.pinned) {
          const vx = (p.x - p.px) * friction;
          const vy = (p.y - p.py) * friction;
          p.px = p.x;
          p.py = p.y;
          p.x += vx;
          p.y += vy + gravity;

          // Reactive behavior: Jitter in maxxing vibe
          if (isGlitching && Math.random() > 0.99) {
            p.x += (Math.random() - 0.5) * 2;
          }
        }

        // Mouse interaction
        if (mouse.current.down) {
          const dx = p.x - mouse.current.x;
          const dy = p.y - mouse.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 30) {
            p.px = p.x - (mouse.current.x - mouse.current.px);
            p.py = p.y - (mouse.current.y - mouse.current.py);
          }
        }
      });

      // Constraints satisfaction
      for (let i = 0; i < 5; i++) {
        constraints.current.forEach(c => {
          const p1 = c[0];
          const p2 = c[1];
          const targetDist = c[2];
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist === 0) return;
          const diff = (targetDist - dist) / dist;
          const offsetX = dx * diff * 0.5 * stiffness;
          const offsetY = dy * diff * 0.5 * stiffness;

          if (!p1.pinned) {
            p1.x -= offsetX;
            p1.y -= offsetY;
          }
          if (!p2.pinned) {
            p2.x += offsetX;
            p2.y += offsetY;
          }
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Draw grid lines
      ctx.beginPath();
      // Use the active mood color for the grid lines
      ctx.strokeStyle = `${activeColor}33`; // 20% opacity
      ctx.lineWidth = 0.5;
      constraints.current.forEach(c => {
        ctx.moveTo(c[0].x, c[0].y);
        ctx.lineTo(c[1].x, c[1].y);
      });
      ctx.stroke();

      // Draw scanline effect
      ctx.fillStyle = `${activeColor}08`; // 3% opacity
      for (let i = 0; i < height; i += 4) {
        ctx.fillRect(0, i, width, 1);
      }
    };

    const loop = () => {
      update();
      draw();
      animationFrameId = requestAnimationFrame(loop);
    };

    loop();

    return () => cancelAnimationFrame(animationFrameId);
  }, [activeColor, isGlitching, width, height]);


  const handlePointerDown = (e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouse.current.down = true;
    mouse.current.x = mouse.current.px = e.clientX - rect.left;
    mouse.current.y = mouse.current.py = e.clientY - rect.top;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouse.current.px = mouse.current.x;
    mouse.current.py = mouse.current.y;
    mouse.current.x = e.clientX - rect.left;
    mouse.current.y = e.clientY - rect.top;
  };

  const handlePointerUp = () => {
    mouse.current.down = false;
  };

  return (
    <div 
      ref={containerRef}
      className="main flex flex-col items-center bg-black/40 backdrop-blur-xl border border-white/10 p-4 rounded-2xl w-fit group"
    >
      <div className="face-col space-y-4">
        <div 
          className="face-frame relative overflow-hidden rounded-lg border bg-black/20"
          style={{ borderColor: `${activeColor}33` }}
        >
          <video 
            ref={videoRef}
            src={videoSrc}
            muted loop playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-60 grayscale contrast-125"
          />
          <canvas 
            ref={canvasRef}
            id={`htc-video-canvas-${id}`} 
            className="relative z-10 cursor-crosshair touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
          <div 
            className="absolute inset-0 pointer-events-none opacity-50 z-20"
            style={{ background: `gradient(linear, left top, left bottom, from(${activeColor}1a), to(transparent))` }}
          />
        </div>

        <div className="id-strip flex justify-between items-center font-mono text-[10px] tracking-tighter text-white/40 border-t border-white/5 pt-3">
          <span className="flex items-center gap-2">
            <div 
              className="w-1.5 h-1.5 rounded-full animate-pulse" 
              style={{ backgroundColor: activeColor }}
            />
            ID / {id}
          </span>
          <span className="uppercase tracking-widest" style={{ color: `${activeColor}99` }}>STATUS / {status}</span>
        </div>

        <div className="mood flex items-center gap-3 font-mono text-[9px] text-white/20 uppercase tracking-[0.2em]">
          <span>Mood_Engine</span>
          <span 
            className="mood-dot w-2 h-2 rounded-full" 
            style={{ backgroundColor: activeColor, boxShadow: `0 0 8px ${activeColor}` }}
          />
          <span id="htc-mood-t" className="text-white/40">{vibeTheme?.jamiePersonality || "Stable"}</span>
        </div>
      </div>
    </div>
  );
});

TacticalCloth.displayName = 'TacticalCloth';

export default TacticalCloth;

'use client';

import React, { useEffect, useRef } from 'react';

export type GlobeNode = {
  id: string;
  slug: string;
  title: string;
  source: string;
  domain: {
    id: string;
    label: string;
    color: string;
  };
  status: 'mapped' | 'discovered' | 'empty';
  coverage: number;
  confidence: number;
  snippetCount: number;
  byteSize: number;
  shardCount: number;
  lat: number;
  lng: number;
  radius: number;
  coordinateSource: 'domain-hash';
  lastMappedAt: string | null;
  routes: {
    html: string;
    headless: string;
    api: string;
    meta: string;
  };
  summary: string;
  searchQuery: string;
};

export type AtlasGlobe = {
  generatedAt: string;
  source: string;
  progress: {
    targetNodes: number;
    knownNodes: number;
    plottedNodes: number;
    mappedNodes: number;
    unmappedNodes: number;
    worldCompletion: number;
    catalogCoverage: number;
    averageCoverage: number;
    indexedSnippets: number;
    byteSize: number;
    lastSwarmRunAt: string | null;
  };
  domains: Array<{
    id: string;
    label: string;
    color: string;
    knownNodes: number;
    mappedNodes: number;
    coverage: number;
  }>;
  nodes: GlobeNode[];
};

type AtlasGlobeCanvasProps = {
  globe: AtlasGlobe;
  selectedSlug?: string;
  onSelect?: (node: GlobeNode) => void;
  className?: string;
  showFeed?: boolean;
  showMetrics?: boolean;
  backgroundMode?: boolean;
  spinSpeed?: number;
};

export default function AtlasGlobeCanvas({
  globe,
  selectedSlug,
  onSelect,
  className = '',
  showFeed = true,
  showMetrics = true,
  backgroundMode = false,
  spinSpeed = 0.0016
}: AtlasGlobeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const projectedRef = useRef<Array<{ node: GlobeNode; x: number; y: number; visible: boolean; radius: number }>>([]);
  const selectedSlugRef = useRef(selectedSlug);

  useEffect(() => {
    selectedSlugRef.current = selectedSlug;
  }, [selectedSlug]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    let frame = 0;
    let raf = 0;

    const render = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      const width = Math.max(1, bounds.width);
      const height = Math.max(1, bounds.height);

      if (canvas.width !== Math.floor(width * ratio) || canvas.height !== Math.floor(height * ratio)) {
        canvas.width = Math.floor(width * ratio);
        canvas.height = Math.floor(height * ratio);
      }

      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const globeRadius = Math.max(120, Math.min(width, height) * (backgroundMode ? 0.44 : 0.37));
      const rotation = frame * spinSpeed;
      const projected: Array<{ node: GlobeNode; x: number; y: number; visible: boolean; radius: number }> = [];

      const oceanGradient = context.createRadialGradient(cx - globeRadius * 0.32, cy - globeRadius * 0.38, globeRadius * 0.1, cx, cy, globeRadius);
      oceanGradient.addColorStop(0, backgroundMode ? 'rgba(34, 211, 238, 0.42)' : 'rgba(34, 211, 238, 0.34)');
      oceanGradient.addColorStop(0.48, backgroundMode ? 'rgba(15, 23, 42, 0.8)' : 'rgba(15, 23, 42, 0.88)');
      oceanGradient.addColorStop(1, 'rgba(2, 6, 23, 0.98)');

      context.save();
      context.shadowColor = backgroundMode ? 'rgba(34, 211, 238, 0.72)' : 'rgba(34, 211, 238, 0.55)';
      context.shadowBlur = backgroundMode ? 54 : 32;
      context.fillStyle = oceanGradient;
      context.beginPath();
      context.arc(cx, cy, globeRadius, 0, Math.PI * 2);
      context.fill();
      context.restore();

      context.strokeStyle = backgroundMode ? 'rgba(248, 250, 252, 0.16)' : 'rgba(148, 163, 184, 0.14)';
      context.lineWidth = 1;
      for (let index = -60; index <= 60; index += 30) {
        context.beginPath();
        const y = cy - (index / 90) * globeRadius;
        const rx = globeRadius * Math.cos((index * Math.PI) / 180);
        context.ellipse(cx, y, rx, globeRadius * 0.08, 0, 0, Math.PI * 2);
        context.stroke();
      }
      for (let index = 0; index < 12; index++) {
        context.beginPath();
        context.ellipse(cx, cy, globeRadius * Math.abs(Math.cos(index)), globeRadius, 0, 0, Math.PI * 2);
        context.stroke();
      }

      for (const node of globe.nodes) {
        const point = projectNode(node, rotation);
        const x = cx + point.x * globeRadius;
        const y = cy - point.y * globeRadius;
        const visible = point.z > -0.12;
        const radius = node.radius * (backgroundMode ? 1.2 : 1) * (visible ? 1 : 0.55);
        projected.push({ node, x, y, visible, radius });
      }

      projected
        .sort((a, b) => Number(a.visible) - Number(b.visible))
        .forEach(point => {
          const alpha = point.visible ? (backgroundMode ? 0.86 : 0.92) : (backgroundMode ? 0.14 : 0.18);
          const color = point.node.domain.color || '#94a3b8';
          context.globalAlpha = alpha;
          context.shadowColor = color;
          context.shadowBlur = point.node.status === 'mapped' ? (backgroundMode ? 22 : 16) : 6;
          context.fillStyle = point.node.status === 'mapped' ? color : 'rgba(148, 163, 184, 0.72)';
          context.beginPath();
          context.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
          context.fill();

          if (point.node.slug === selectedSlugRef.current) {
            context.globalAlpha = 1;
            context.shadowBlur = 0;
            context.strokeStyle = '#f8fafc';
            context.lineWidth = 2;
            context.beginPath();
            context.arc(point.x, point.y, point.radius + 5, 0, Math.PI * 2);
            context.stroke();
          }
        });

      if (showMetrics) {
        context.globalAlpha = backgroundMode ? 0.62 : 1;
        context.shadowBlur = 0;
        context.fillStyle = 'rgba(248, 250, 252, 0.8)';
        context.font = '10px JetBrains Mono, monospace';
        context.fillText(`${globe.progress.knownNodes} known nodes`, cx - globeRadius, cy + globeRadius + 32);
        context.fillText(`${globe.progress.worldCompletion}% world completion`, cx - globeRadius, cy + globeRadius + 48);
      }

      context.globalAlpha = 1;
      projectedRef.current = projected;
      frame += 1;
      raf = window.requestAnimationFrame(render);
    };

    raf = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [globe, backgroundMode, showMetrics, spinSpeed]);

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSelect) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const hit = projectedRef.current
      .filter(point => point.visible)
      .map(point => ({
        ...point,
        distance: Math.hypot(point.x - x, point.y - y)
      }))
      .filter(point => point.distance <= Math.max(12, point.radius + 7))
      .sort((a, b) => a.distance - b.distance)[0];

    if (hit) onSelect(hit.node);
  };

  return (
    <div className={`relative h-full w-full ${className}`}>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className={`h-full w-full ${onSelect ? 'cursor-crosshair' : 'pointer-events-none'}`}
        aria-label="TAH knowledge globe"
      />
      {showFeed && (
        <div className="pointer-events-none absolute bottom-8 right-8 max-w-sm rounded border border-white/10 bg-black/35 p-4 backdrop-blur-xl">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Globe Feed</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Bright nodes are mapped cartridges. Dim nodes are discovered knowledge waiting for deeper swarm coverage.
          </p>
        </div>
      )}
    </div>
  );
}

function projectNode(node: GlobeNode, rotation: number) {
  const lat = (node.lat * Math.PI) / 180;
  const lng = (node.lng * Math.PI) / 180 + rotation;
  const x = Math.cos(lat) * Math.sin(lng);
  const y = Math.sin(lat);
  const z = Math.cos(lat) * Math.cos(lng);

  return { x, y, z };
}

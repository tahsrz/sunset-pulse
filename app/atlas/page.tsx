'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

type AtlasNode = {
  id: string;
  label: string;
  type: 'world' | 'continent' | 'cartridge';
  group: string;
  slug?: string;
  source?: string;
  displayTitle?: string;
  summary?: string;
  format?: string;
  byteSize?: number;
  shardCount?: number;
  progress: number;
  val: number;
  url?: string;
  headlessUrl?: string;
  apiUrl?: string;
  searchQuery?: string;
  x?: number;
  y?: number;
};

type AtlasMap = {
  progress: {
    totalCartridges: number;
    targetCartridges: number;
    percent: number;
    stages: Array<{ id: string; label: string; threshold: number; complete: boolean }>;
  };
  nodes: AtlasNode[];
  links: Array<{ source: string; target: string; value: number }>;
};

type ProbeItem = {
  slug: string;
  source: string;
  displayTitle: string;
  domain: {
    id: string;
    label: string;
    color: string;
  };
  searchQuery: string;
  byteSize: number;
  payloadByteSize: number;
  shardCount: number;
  bloomBits: string;
  hashCount: number;
  format: string;
  summary: string;
};

type ProbeState = {
  mapped: number;
  total: number;
  percent: number;
  done: boolean;
  published?: boolean;
  items: ProbeItem[];
};

type GlobeNode = {
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

type AtlasGlobe = {
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

type AtlasPulse = {
  name: string;
  scope: string;
  progress: {
    percent: number;
    boundPlaces: number;
    livePlaces: number;
    totalSeededPlaces: number;
    plannedRegions: number;
  };
  places: Array<{
    slug: string;
    name: string;
    region: string;
    atlasPulse: {
      physicalAnchor: string;
      bindingStrength: number;
      activeStage: string;
    };
  }>;
};

const DOMAIN_COLORS: Record<string, string> = {
  world: '#f8fafc',
  'texas-history': '#facc15',
  pulse: '#22d3ee',
  'real-estate': '#34d399',
  'computer-science': '#a78bfa',
  ai: '#f472b6',
  medicine: '#fb7185',
  'local-world': '#facc15',
  'web-captures': '#38bdf8',
  knowledge: '#94a3b8'
};

export default function MemoriaAtlasPage() {
  const [atlas, setAtlas] = useState<AtlasMap | null>(null);
  const [globe, setGlobe] = useState<AtlasGlobe | null>(null);
  const [atlasPulse, setAtlasPulse] = useState<AtlasPulse | null>(null);
  const [selectedNode, setSelectedNode] = useState<AtlasNode | null>(null);
  const [selectedGlobeNode, setSelectedGlobeNode] = useState<GlobeNode | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [probeState, setProbeState] = useState<ProbeState>({ mapped: 0, total: 0, percent: 0, done: false, items: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/tah/atlas/map', { cache: 'no-store' }).then(res => res.json()),
      fetch('/api/tah/atlas/globe', { cache: 'no-store' }).then(res => res.json()),
      fetch('/api/atlas-pulse', { cache: 'no-store' }).then(res => res.json())
    ])
      .then(([mapData, globeData, pulseData]) => {
        setAtlas(mapData);
        setGlobe(globeData);
        setAtlasPulse(pulseData.atlasPulse || null);
        setSelectedNode(mapData.nodes?.[0] || null);
        setSelectedGlobeNode(globeData.nodes?.[0] || null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!atlas) return;

    let cancelled = false;

    async function mapCartridges() {
      const manifestResponse = await fetch('/api/tah/atlas/manifest', { cache: 'no-store' });
      const manifest = await manifestResponse.json();

      if (!cancelled && manifest.published && Array.isArray(manifest.items)) {
        setProbeState({
          mapped: manifest.mapped,
          total: manifest.total,
          percent: manifest.percent,
          done: true,
          published: true,
          items: manifest.items
        });
        return;
      }

      let cursor: number | null = 0;
      const items: ProbeItem[] = [];

      while (cursor !== null && !cancelled) {
        const response = await fetch(`/api/tah/atlas/probe?cursor=${cursor}&limit=18`, { cache: 'no-store' });
        const body = await response.json();
        items.push(...body.items);

        if (cancelled) return;
        setProbeState({
          mapped: body.mapped,
          total: body.total,
          percent: body.percent,
          done: body.done,
          items: [...items]
        });

        cursor = body.nextCursor;
        if (cursor !== null) {
          await new Promise(resolve => window.setTimeout(resolve, 350));
        }
      }
    }

    mapCartridges().catch(() => {
      if (!cancelled) {
        setProbeState(prev => ({ ...prev, done: true }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [atlas]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timeout = window.setTimeout(() => {
      fetch(`/api/tah?q=${encodeURIComponent(query)}&limit=6`, { cache: 'no-store' })
        .then(res => res.json())
        .then(body => setResults(body.data?.results || []))
        .catch(() => setResults([]));
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [query]);

  const worldStages = atlas?.progress.stages || [];
  const visibleNodes = useMemo(() => atlas?.nodes || [], [atlas]);
  const mappedBySlug = useMemo(() => new Map(probeState.items.map(item => [item.slug, item])), [probeState.items]);
  const domainStats = useMemo(() => {
    if (globe?.domains?.length) {
      return globe.domains.map(domain => ({
        id: domain.id,
        label: domain.label,
        count: domain.knownNodes,
        mapped: domain.mappedNodes,
        coverage: domain.coverage,
        color: domain.color
      }));
    }

    const continents = visibleNodes.filter(node => node.type === 'continent');
    return continents.map(continent => ({
      id: continent.id,
      label: continent.label,
      count: visibleNodes.filter(node => node.type === 'cartridge' && node.group === continent.id).length,
      mapped: 0,
      coverage: 0,
      color: DOMAIN_COLORS[continent.group] || '#94a3b8'
    }));
  }, [globe, visibleNodes]);
  const selectedProbe = selectedNode?.slug ? mappedBySlug.get(selectedNode.slug) : null;
  const selectedGlobe = selectedGlobeNode || (selectedNode?.slug ? globe?.nodes.find(node => node.slug === selectedNode.slug) : null);

  const selectGlobeNode = (node: GlobeNode) => {
    setSelectedGlobeNode(node);
    setSelectedNode(visibleNodes.find(candidate => candidate.slug === node.slug) || selectedNode);
  };

  return (
    <main className="relative h-screen overflow-hidden bg-[#071013] text-slate-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(244,114,182,0.14),transparent_30%),linear-gradient(135deg,#071013_0%,#0f1f24_48%,#1f2937_100%)]" />

      <section className="absolute left-0 right-0 top-0 z-30 border-b border-white/10 bg-black/35 px-5 py-4 backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-200">Atlas Pulse</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">Physical TAH Map</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              A living map of digital cartridges and the real places they are most strongly linked to. The map is the progress bar: every verified source, forged shard, and physical anchor pushes the Texas layer forward.
            </p>
          </div>

          <div className="w-full max-w-xl">
            <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              <span>World Completion</span>
              <span className="text-cyan-200">{globe?.progress.worldCompletion || atlas?.progress.percent || 0}%</span>
            </div>
            <div className="grid grid-cols-5 overflow-hidden rounded border border-white/10 bg-white/10">
              {worldStages.map(stage => (
                <div key={stage.id} className={`border-r border-black/20 px-2 py-2 text-center text-[10px] font-black uppercase tracking-tight last:border-r-0 ${stage.complete ? 'bg-cyan-300 text-slate-950' : 'bg-white/10 text-slate-400'}`}>
                  {stage.label}
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              {globe?.progress.knownNodes || atlas?.progress.totalCartridges || 0} known nodes out of a {globe?.progress.targetNodes || atlas?.progress.targetCartridges || 1000}-node atlas target. {globe?.progress.indexedSnippets || 0} snippets/shards are visible to the map.
            </p>
            <p className="mt-1 text-xs leading-5 text-emerald-200">
              {globe?.progress.plottedNodes || 0} of {globe?.progress.knownNodes || 0} cartridges are physically plotted on the globe.
            </p>
            {atlasPulse && (
              <div className="mt-4 rounded border border-amber-200/20 bg-amber-200/10 p-3">
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.18em]">
                  <span className="text-amber-100">Physical Binding</span>
                  <span className="text-amber-100">{atlasPulse.progress.percent}%</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded bg-black/35">
                  <div className="h-full bg-amber-200" style={{ width: `${atlasPulse.progress.percent}%` }} />
                </div>
                <p className="mt-2 text-xs leading-5 text-amber-50/70">
                  {atlasPulse.progress.boundPlaces} bound place out of {atlasPulse.progress.totalSeededPlaces} seeded Texas place. {atlasPulse.progress.plannedRegions} regions are queued.
                </p>
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              <Link className="rounded bg-cyan-300 px-3 py-2 text-slate-950" href="/tah">Archive</Link>
              <Link className="rounded bg-emerald-300 px-3 py-2 text-slate-950" href="/tah/index.json">JSON</Link>
              <Link className="rounded bg-pink-300 px-3 py-2 text-slate-950" href="/tah/headless">Headless</Link>
              <Link className="rounded bg-violet-300 px-3 py-2 text-slate-950" href="/api/tah/atlas/globe">Globe JSON</Link>
              <Link className="rounded bg-amber-200 px-3 py-2 text-slate-950" href="/api/atlas-pulse">Atlas Pulse JSON</Link>
              <Link className="rounded border border-white/20 px-3 py-2 text-white" href="/llms.txt">llms.txt</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="absolute bottom-0 left-0 top-44 z-20 w-full lg:w-96 border-r border-white/10 bg-black/30 p-5 backdrop-blur-xl">
        <div className="rounded border border-white/10 bg-white/[0.04] p-4">
          <label className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200" htmlFor="atlas-query">
            Pulse Query
          </label>
          <input
            id="atlas-query"
            value={query}
            onChange={event => setQuery(event.target.value)}
            className="mt-3 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none focus:border-cyan-200"
            placeholder="Search the world..."
          />
        </div>

        <div className="mt-4 rounded border border-white/10 bg-white/[0.04] p-4">
          <div className="mb-4 border-b border-white/10 pb-4">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.18em]">
              <span className="text-cyan-200">Mapping Run</span>
              <span className={probeState.done ? 'text-emerald-200' : 'text-pink-200'}>
                {globe?.progress.catalogCoverage ?? probeState.percent}%
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded bg-white/10">
              <div className="h-full bg-cyan-300 transition-all duration-300" style={{ width: `${globe?.progress.catalogCoverage ?? probeState.percent}%` }} />
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {globe?.progress.mappedNodes ?? probeState.mapped} of {globe?.progress.knownNodes || probeState.total || atlas?.progress.totalCartridges || 0} cartridge headers {globe?.source === 'published-swarm-manifest' ? 'loaded from the local swarm manifest' : 'mapped from the live local catalog'}.
            </p>
          </div>
          <div className="mb-4 border-b border-white/10 pb-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200">Domains</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {domainStats.map(domain => (
                <button
                  key={domain.id}
                  type="button"
                  onClick={() => setSelectedNode(visibleNodes.find(node => node.id === domain.id) || selectedNode)}
                  className="rounded border border-white/10 bg-black/20 p-2 text-left transition hover:border-cyan-200/60"
                >
                  <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-300">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: domain.color }} />
                    {domain.label}
                  </span>
                  <span className="mt-1 block text-lg font-black text-white">{domain.count}</span>
                  <span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">{domain.coverage}% mapped</span>
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-pink-200">Selected Region</p>
          <h2 className="mt-3 text-2xl font-black">{selectedGlobe?.title || selectedNode?.displayTitle || selectedNode?.label || 'Loading Atlas'}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {selectedNode?.type === 'world' && `${globe?.progress.knownNodes || atlas?.progress.totalCartridges || 0} cartridges are discoverable out of a ${globe?.progress.targetNodes || atlas?.progress.targetCartridges || 1000}-node atlas target.`}
            {selectedNode?.type === 'continent' && 'A knowledge continent grouping related cartridges into a navigable region.'}
            {selectedNode?.type === 'cartridge' && `Source: ${selectedNode.source}. Query seed: ${selectedNode.searchQuery || selectedNode.label}`}
            {!selectedNode?.type && selectedGlobe && `Source: ${selectedGlobe.source}. Query seed: ${selectedGlobe.searchQuery}`}
          </p>
          {selectedGlobe && (
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <MetricPill label="Coverage" value={`${selectedGlobe.coverage}%`} />
              <MetricPill label="Confidence" value={`${selectedGlobe.confidence}%`} />
              <MetricPill label="Snippets" value={String(selectedGlobe.snippetCount)} />
            </div>
          )}
          {selectedGlobe && (
            <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
              Plotted at {selectedGlobe.lat}, {selectedGlobe.lng} via {selectedGlobe.coordinateSource}
            </p>
          )}
          {selectedNode?.type === 'cartridge' && selectedNode.summary && (
            <p className="mt-3 line-clamp-4 text-sm leading-6 text-slate-400">{selectedNode.summary}</p>
          )}
          {selectedProbe && (
            <div className="mt-4 rounded border border-white/10 bg-black/25 p-3 text-xs leading-5 text-slate-300">
              <div className="grid grid-cols-2 gap-2 font-mono text-[10px] uppercase tracking-tight text-slate-400">
                <span>Format: {selectedProbe.format}</span>
                <span>Shards: {selectedProbe.shardCount}</span>
                <span>Bloom: {selectedProbe.bloomBits}</span>
                <span>Hashes: {selectedProbe.hashCount}</span>
                <span>File: {formatBytes(selectedProbe.byteSize)}</span>
                <span>Payload: {formatBytes(selectedProbe.payloadByteSize)}</span>
              </div>
              <p className="mt-3 line-clamp-4 text-slate-400">{selectedProbe.summary}</p>
            </div>
          )}
          {selectedNode?.url && (
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
              <Link className="rounded bg-cyan-300 px-3 py-2 text-slate-950" href={selectedNode.url.replace('https://sunsetpulse.com', '')}>Open</Link>
              {selectedNode.headlessUrl && <Link className="rounded bg-pink-300 px-3 py-2 text-slate-950" href={selectedNode.headlessUrl.replace('https://sunsetpulse.com', '')}>Headless</Link>}
              {selectedNode.apiUrl && <Link className="rounded border border-white/20 px-3 py-2 text-white" href={selectedNode.apiUrl.replace('https://sunsetpulse.com', '')}>Query API</Link>}
            </div>
          )}
        </div>

        <div className="mt-4 max-h-[38vh] overflow-y-auto rounded border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200">Query Hits</p>
          <div className="mt-3 space-y-3">
            {results.length > 0 ? results.map((result, index) => (
              <article key={`${result.source}:${index}`} className="rounded border border-white/10 bg-black/30 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">{result.source}</p>
                <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-300">{result.text}</p>
              </article>
            )) : (
              <p className="text-sm leading-6 text-slate-500">Type a query to route through `/api/tah`.</p>
            )}
          </div>
        </div>
      </section>

      <section className="absolute inset-0 z-10 pt-44 lg:pl-96">
        {loading && (
          <div className="flex h-full items-center justify-center text-xs font-black uppercase tracking-[0.28em] text-cyan-200">
            Mapping TAH globe...
          </div>
        )}
        {!loading && globe && (
          <AtlasGlobeCanvas
            globe={globe}
            selectedSlug={selectedGlobe?.slug}
            onSelect={selectGlobeNode}
          />
        )}
      </section>
    </main>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-black/30 p-2">
      <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}

function AtlasGlobeCanvas({ globe, selectedSlug, onSelect }: { globe: AtlasGlobe; selectedSlug?: string; onSelect: (node: GlobeNode) => void }) {
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
      const globeRadius = Math.max(120, Math.min(width, height) * 0.37);
      const rotation = frame * 0.0016;
      const projected: Array<{ node: GlobeNode; x: number; y: number; visible: boolean; radius: number }> = [];

      const oceanGradient = context.createRadialGradient(cx - globeRadius * 0.32, cy - globeRadius * 0.38, globeRadius * 0.1, cx, cy, globeRadius);
      oceanGradient.addColorStop(0, 'rgba(34, 211, 238, 0.34)');
      oceanGradient.addColorStop(0.5, 'rgba(15, 23, 42, 0.88)');
      oceanGradient.addColorStop(1, 'rgba(2, 6, 23, 0.98)');

      context.save();
      context.shadowColor = 'rgba(34, 211, 238, 0.55)';
      context.shadowBlur = 32;
      context.fillStyle = oceanGradient;
      context.beginPath();
      context.arc(cx, cy, globeRadius, 0, Math.PI * 2);
      context.fill();
      context.restore();

      context.strokeStyle = 'rgba(148, 163, 184, 0.14)';
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
        const radius = node.radius * (visible ? 1 : 0.55);
        projected.push({ node, x, y, visible, radius });
      }

      projected
        .sort((a, b) => Number(a.visible) - Number(b.visible))
        .forEach(point => {
          const alpha = point.visible ? 0.92 : 0.18;
          const color = point.node.domain.color || '#94a3b8';
          context.globalAlpha = alpha;
          context.shadowColor = color;
          context.shadowBlur = point.node.status === 'mapped' ? 16 : 6;
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

      context.globalAlpha = 1;
      context.shadowBlur = 0;
      context.fillStyle = 'rgba(248, 250, 252, 0.8)';
      context.font = '10px JetBrains Mono, monospace';
      context.fillText(`${globe.progress.knownNodes} known nodes`, cx - globeRadius, cy + globeRadius + 32);
      context.fillText(`${globe.progress.worldCompletion}% world completion`, cx - globeRadius, cy + globeRadius + 48);

      projectedRef.current = projected;
      frame += 1;
      raf = window.requestAnimationFrame(render);
    };

    raf = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [globe]);

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
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
    <div className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className="h-full w-full cursor-crosshair"
        aria-label="Interactive TAH knowledge globe"
      />
      <div className="pointer-events-none absolute bottom-8 right-8 max-w-sm rounded border border-white/10 bg-black/35 p-4 backdrop-blur-xl">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Globe Feed</p>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Bright nodes are mapped cartridges. Dim nodes are discovered knowledge waiting for deeper swarm coverage.
        </p>
      </div>
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

function formatBytes(bytes: number) {
  if (!bytes) return '0 b';
  if (bytes < 1024) return `${bytes} b`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 102.4) / 10} kb`;
  return `${Math.round(bytes / 104857.6) / 10} mb`;
}

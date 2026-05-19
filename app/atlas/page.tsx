'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

type AtlasNode = {
  id: string;
  label: string;
  type: 'world' | 'continent' | 'cartridge';
  group: string;
  slug?: string;
  source?: string;
  progress: number;
  val: number;
  url?: string;
  headlessUrl?: string;
  apiUrl?: string;
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

const DOMAIN_COLORS: Record<string, string> = {
  world: '#f8fafc',
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
  const [selectedNode, setSelectedNode] = useState<AtlasNode | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const fgRef = useRef<any>(null);

  useEffect(() => {
    fetch('/api/tah/atlas/map', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        setAtlas(data);
        setSelectedNode(data.nodes?.[0] || null);
      })
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <main className="relative h-screen overflow-hidden bg-[#071013] text-slate-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(244,114,182,0.14),transparent_30%),linear-gradient(135deg,#071013_0%,#0f1f24_48%,#1f2937_100%)]" />

      <section className="absolute left-0 right-0 top-0 z-30 border-b border-white/10 bg-black/35 px-5 py-4 backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-200">Memoria Atlas</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">TAH World Map</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              A living map of the cartridge universe. The map is the progress bar: every reachable page, headless route, JSON catalog entry, and search endpoint is another plotted region of the world.
            </p>
          </div>

          <div className="w-full max-w-xl">
            <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              <span>Atlas Coverage</span>
              <span className="text-cyan-200">{atlas?.progress.percent || 0}%</span>
            </div>
            <div className="grid grid-cols-5 overflow-hidden rounded border border-white/10 bg-white/10">
              {worldStages.map(stage => (
                <div key={stage.id} className={`border-r border-black/20 px-2 py-2 text-center text-[10px] font-black uppercase tracking-tight last:border-r-0 ${stage.complete ? 'bg-cyan-300 text-slate-950' : 'bg-white/10 text-slate-400'}`}>
                  {stage.label}
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              {atlas?.progress.totalCartridges || 0} of {atlas?.progress.targetCartridges || 1000} target cartridges charted. Routes are online; the world is still being mapped.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              <Link className="rounded bg-cyan-300 px-3 py-2 text-slate-950" href="/tah">Archive</Link>
              <Link className="rounded bg-emerald-300 px-3 py-2 text-slate-950" href="/tah/index.json">JSON</Link>
              <Link className="rounded bg-pink-300 px-3 py-2 text-slate-950" href="/tah/headless">Headless</Link>
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
          <p className="text-xs font-black uppercase tracking-[0.22em] text-pink-200">Selected Region</p>
          <h2 className="mt-3 text-2xl font-black">{selectedNode?.label || 'Loading Atlas'}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {selectedNode?.type === 'world' && `${atlas?.progress.totalCartridges || 0} cartridges are discoverable out of a ${atlas?.progress.targetCartridges || 1000}-cartridge atlas target.`}
            {selectedNode?.type === 'continent' && 'A knowledge continent grouping related cartridges into a navigable region.'}
            {selectedNode?.type === 'cartridge' && `Source: ${selectedNode.source}`}
          </p>
          {selectedNode?.url && (
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
              <Link className="rounded bg-cyan-300 px-3 py-2 text-slate-950" href={selectedNode.url.replace('https://sunsetpulse.com', '')}>Open</Link>
              {selectedNode.headlessUrl && <Link className="rounded bg-pink-300 px-3 py-2 text-slate-950" href={selectedNode.headlessUrl.replace('https://sunsetpulse.com', '')}>Headless</Link>}
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
            Mapping TAH world...
          </div>
        )}
        {!loading && atlas && (
          <ForceGraph2D
            ref={fgRef}
            graphData={{ nodes: visibleNodes, links: atlas.links }}
            backgroundColor="rgba(0,0,0,0)"
            nodeRelSize={5}
            linkColor={() => 'rgba(148, 163, 184, 0.22)'}
            linkWidth={(link: any) => link.value || 1}
            onNodeClick={(node: any) => setSelectedNode(node)}
            nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
              const color = DOMAIN_COLORS[node.group] || '#94a3b8';
              const radius = node.type === 'world' ? 11 : node.type === 'continent' ? 8 : 4;
              ctx.shadowColor = color;
              ctx.shadowBlur = node.type === 'cartridge' ? 8 : 18;
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
              ctx.fill();
              ctx.shadowBlur = 0;

              if (globalScale > 0.7 || node.type !== 'cartridge') {
                ctx.font = `${node.type === 'cartridge' ? 9 : 12}px JetBrains Mono, monospace`;
                ctx.fillStyle = 'rgba(248, 250, 252, 0.78)';
                ctx.fillText(node.label, node.x + radius + 4, node.y + 3);
              }
            }}
          />
        )}
      </section>
    </main>
  );
}

'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, CheckSquare, Database, FilePlus2, FolderInput, Loader2, MapPinned, RefreshCw, Search, Upload, X } from 'lucide-react';
import { CARTRIDGE_DOMAINS } from '@/lib/ai/brain/cartridge_domains';
import type { CartridgeMetadata } from '@/lib/ai/brain/cartridge_metadata';

type TahLibraryClientProps = {
  cartridges: Array<Omit<CartridgeMetadata, 'path'>>;
  masterArchive: MasterArchiveSummary;
};

type ForgeStatus = {
  type: 'success' | 'error';
  message: string;
  files?: Array<{ name: string; path: string; byteSize: number }>;
};

type MasterArchiveSummary = {
  status: string;
  name: string;
  generatedAt: string | null;
  sourceCount: number;
  shardCount: number;
  skippedCount: number;
  stats: any;
  files: Record<string, { exists: boolean; path: string; byteSize: number }>;
};

type MasterSearchResult = {
  rank: number;
  score: number;
  source: string | null;
  slug: string | null;
  title: string | null;
  searchQuery: string | null;
  text: string;
};

const ALL_DOMAINS = 'all';

export function TahLibraryClient({ cartridges, masterArchive }: TahLibraryClientProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeDomain, setActiveDomain] = useState(ALL_DOMAINS);
  const [masterQuery, setMasterQuery] = useState('Atlas Pulse');
  const [masterResults, setMasterResults] = useState<MasterSearchResult[]>([]);
  const [masterBusy, setMasterBusy] = useState(false);
  const [masterError, setMasterError] = useState('');
  const [pasteName, setPasteName] = useState('');
  const [pasteKeywords, setPasteKeywords] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [memoriaName, setMemoriaName] = useState('');
  const [memoriaText, setMemoriaText] = useState('');
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [busyAction, setBusyAction] = useState<'tah' | 'memoria' | null>(null);
  const [forgeStatus, setForgeStatus] = useState<ForgeStatus | null>(null);

  const domainCounts = useMemo(() => {
    return cartridges.reduce<Record<string, number>>((acc, cartridge) => {
      acc[cartridge.domain.id] = (acc[cartridge.domain.id] || 0) + 1;
      return acc;
    }, {});
  }, [cartridges]);

  const filteredCartridges = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return cartridges.filter(cartridge => {
      const domainMatch = activeDomain === ALL_DOMAINS || cartridge.domain.id === activeDomain;
      if (!domainMatch) return false;
      if (!needle) return true;

      return [
        cartridge.displayTitle,
        cartridge.title,
        cartridge.source,
        cartridge.searchQuery,
        cartridge.summary,
        cartridge.domain.label,
        cartridge.format
      ].join(' ').toLowerCase().includes(needle);
    });
  }, [activeDomain, cartridges, query]);

  const selectedSlugSet = useMemo(() => new Set(selectedSlugs), [selectedSlugs]);

  const toggleSlug = (slug: string) => {
    setSelectedSlugs(current => (
      current.includes(slug)
        ? current.filter(currentSlug => currentSlug !== slug)
        : [...current, slug]
    ));
  };

  const selectVisibleCartridges = () => {
    setSelectedSlugs(current => uniqueStrings([...current, ...filteredCartridges.map(cartridge => cartridge.slug)]));
  };

  const searchMasterArchive = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuery = masterQuery.trim();
    if (!trimmedQuery) return;

    setMasterBusy(true);
    setMasterError('');

    try {
      const response = await fetch(`/api/tah/master/search?q=${encodeURIComponent(trimmedQuery)}&limit=3`);
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.message || 'Master archive search failed.');
      }

      setMasterResults(body.data?.results || []);
    } catch (error: any) {
      setMasterError(error.message || 'Master archive search failed.');
      setMasterResults([]);
    } finally {
      setMasterBusy(false);
    }
  };

  const createTahFromPaste = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await postForge('tah', {
      mode: 'tah',
      name: pasteName,
      keywords: pasteKeywords,
      text: pasteText
    });
  };

  const createMemoria = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const files = await Promise.all(uploadFiles.map(fileToPayload));

    await postForge('memoria', {
      mode: 'memoria',
      name: memoriaName,
      slugs: selectedSlugs,
      text: memoriaText,
      files
    });
  };

  const postForge = async (action: 'tah' | 'memoria', payload: Record<string, unknown>) => {
    setBusyAction(action);
    setForgeStatus(null);

    try {
      const response = await fetch('/api/tah/forge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.message || 'Forge request failed.');
      }

      setForgeStatus({
        type: 'success',
        message: body.data?.message || 'Cartridge created.',
        files: body.data?.files || []
      });

      if (action === 'tah') {
        setPasteText('');
        setPasteKeywords('');
      } else {
        setMemoriaText('');
        setUploadFiles([]);
        setSelectedSlugs([]);
      }

      router.refresh();
    } catch (error: any) {
      setForgeStatus({
        type: 'error',
        message: error.message || 'Forge request failed.'
      });
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <section className="px-6 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-4 lg:grid-cols-[minmax(220px,280px),1fr]">
          <aside className="border-b border-white/10 pb-4 lg:border-b-0 lg:border-r lg:pr-4">
            <label className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200" htmlFor="tah-search">
              Library Search
            </label>
            <input
              id="tah-search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              className="mt-3 w-full rounded border border-white/10 bg-black/35 px-3 py-3 text-sm text-white outline-none transition focus:border-cyan-200"
              placeholder="Search cartridges..."
            />

            <div className="mt-5 space-y-2">
              <button
                type="button"
                onClick={() => setActiveDomain(ALL_DOMAINS)}
                className={`flex w-full items-center justify-between rounded border px-3 py-2 text-left text-xs font-black uppercase tracking-[0.14em] transition ${activeDomain === ALL_DOMAINS ? 'border-cyan-200 bg-cyan-300 text-slate-950' : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/30'}`}
              >
                <span>All Knowledge</span>
                <span>{cartridges.length}</span>
              </button>
              {CARTRIDGE_DOMAINS.filter(domain => domainCounts[domain.id]).map(domain => (
                <button
                  key={domain.id}
                  type="button"
                  onClick={() => setActiveDomain(domain.id)}
                  className={`flex w-full items-center justify-between rounded border px-3 py-2 text-left text-xs font-black uppercase tracking-[0.14em] transition ${activeDomain === domain.id ? 'border-cyan-200 bg-white text-slate-950' : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/30'}`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: domain.color }} />
                    <span className="truncate">{domain.label}</span>
                  </span>
                  <span>{domainCounts[domain.id]}</span>
                </button>
              ))}
            </div>
          </aside>

          <div>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-pink-200">Catalog</p>
                <h2 className="mt-2 text-2xl font-black text-white">{filteredCartridges.length} cartridges visible</h2>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <Link className="rounded bg-emerald-300 px-3 py-2 text-slate-950" href="/tah/index.json">JSON</Link>
                <Link className="rounded bg-pink-300 px-3 py-2 text-slate-950" href="/tah/headless">Headless</Link>
                <Link className="rounded border border-white/20 px-3 py-2 text-white" href="/api/tah">API</Link>
              </div>
            </div>

            <div className="mb-5 rounded border border-cyan-200/20 bg-cyan-300/[0.06] p-4">
              <div className="grid gap-4 xl:grid-cols-[1fr,1.2fr]">
                <div>
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-cyan-100">
                    <Database className="h-4 w-4" />
                    Atlas Pulse Master
                  </div>
                  <h2 className="mt-2 text-2xl font-black text-white">{masterArchive.name}</h2>
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
                    <ArchiveMetric label="Status" value={masterArchive.status} />
                    <ArchiveMetric label="Sources" value={String(masterArchive.sourceCount)} />
                    <ArchiveMetric label="Shards" value={String(masterArchive.shardCount)} />
                    <ArchiveMetric label="Places" value={<Link className="text-cyan-100 underline decoration-cyan-200/40 underline-offset-4" href="/api/tah/master/places">Open</Link>} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                    <Link className="inline-flex items-center gap-2 rounded bg-cyan-300 px-3 py-2 text-slate-950" href="/api/tah/master">
                      <Database className="h-4 w-4" />
                      Master
                    </Link>
                    <Link className="inline-flex items-center gap-2 rounded border border-white/20 px-3 py-2 text-white" href="/api/tah/master/sources">
                      <Archive className="h-4 w-4" />
                      Sources
                    </Link>
                    <Link className="inline-flex items-center gap-2 rounded border border-white/20 px-3 py-2 text-white" href="/api/tah/master/places">
                      <MapPinned className="h-4 w-4" />
                      Places
                    </Link>
                  </div>
                </div>

                <div className="rounded border border-white/10 bg-black/25 p-4">
                  <form onSubmit={searchMasterArchive} className="flex flex-col gap-2 sm:flex-row">
                    <label className="sr-only" htmlFor="master-search">Master Search</label>
                    <input
                      id="master-search"
                      value={masterQuery}
                      onChange={event => setMasterQuery(event.target.value)}
                      className="min-h-11 flex-1 rounded border border-white/10 bg-black/35 px-3 text-sm text-white outline-none transition focus:border-cyan-200"
                      placeholder="Search master archive..."
                    />
                    <button
                      type="submit"
                      disabled={masterBusy || masterArchive.status !== 'ready' || !masterQuery.trim()}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded bg-white px-4 text-sm font-black text-slate-950 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {masterBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      Search
                    </button>
                  </form>

                  {masterError && (
                    <p className="mt-3 rounded border border-red-300/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">{masterError}</p>
                  )}

                  <div className="mt-4 space-y-3">
                    {masterResults.map(result => (
                      <article key={`${result.rank}:${result.source}:${result.text.slice(0, 24)}`} className="rounded border border-white/10 bg-white/[0.04] p-3">
                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-300">
                          <span className="rounded bg-white/10 px-2 py-1 text-cyan-100">#{result.rank}</span>
                          {result.source && <span className="rounded bg-white/10 px-2 py-1">{result.source}</span>}
                          <span className="rounded bg-white/10 px-2 py-1">{Math.round(result.score)} score</span>
                        </div>
                        <h3 className="mt-2 text-sm font-black text-white">{result.title || result.searchQuery || 'Master result'}</h3>
                        <p className="mt-1 line-clamp-3 text-sm leading-6 text-slate-300">{result.text}</p>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-5 rounded border border-white/10 bg-black/25 p-4">
              <div className="flex flex-col gap-3 border-b border-white/10 pb-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200">Forge</p>
                  <h2 className="mt-2 text-2xl font-black text-white">Add TAH and Memoria</h2>
                </div>
                <button
                  type="button"
                  onClick={() => router.refresh()}
                  className="inline-flex items-center gap-2 self-start rounded border border-white/20 px-3 py-2 text-xs font-bold text-white transition hover:border-cyan-200"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <form onSubmit={createTahFromPaste} className="space-y-3 rounded border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-cyan-100">
                    <FilePlus2 className="h-4 w-4" />
                    Pasted Text
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-300">
                      TAH Name
                      <input
                        value={pasteName}
                        onChange={event => setPasteName(event.target.value)}
                        className="mt-2 w-full rounded border border-white/10 bg-black/35 px-3 py-2 text-sm normal-case tracking-normal text-white outline-none transition focus:border-cyan-200"
                        placeholder="market_notes"
                      />
                    </label>
                    <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-300">
                      Keywords
                      <input
                        value={pasteKeywords}
                        onChange={event => setPasteKeywords(event.target.value)}
                        className="mt-2 w-full rounded border border-white/10 bg-black/35 px-3 py-2 text-sm normal-case tracking-normal text-white outline-none transition focus:border-cyan-200"
                        placeholder="Dallas, land, contracts"
                      />
                    </label>
                  </div>
                  <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-300">
                    Text
                    <textarea
                      value={pasteText}
                      onChange={event => setPasteText(event.target.value)}
                      className="mt-2 min-h-36 w-full resize-y rounded border border-white/10 bg-black/35 px-3 py-3 text-sm normal-case leading-6 tracking-normal text-white outline-none transition focus:border-cyan-200"
                      placeholder="Paste notes, place history, field observations, or source text..."
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={busyAction !== null || !pasteText.trim()}
                    className="inline-flex items-center gap-2 rounded bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busyAction === 'tah' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />}
                    Create TAH
                  </button>
                </form>

                <form onSubmit={createMemoria} className="space-y-3 rounded border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-pink-100">
                    <Archive className="h-4 w-4" />
                    Memoria Consolidation
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[1fr,auto]">
                    <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-300">
                      Memoria Name
                      <input
                        value={memoriaName}
                        onChange={event => setMemoriaName(event.target.value)}
                        className="mt-2 w-full rounded border border-white/10 bg-black/35 px-3 py-2 text-sm normal-case tracking-normal text-white outline-none transition focus:border-pink-200"
                        placeholder="north_texas_memoria"
                      />
                    </label>
                    <div className="flex items-end gap-2">
                      <button
                        type="button"
                        onClick={selectVisibleCartridges}
                        className="inline-flex items-center gap-2 rounded border border-white/20 px-3 py-2 text-xs font-bold text-white transition hover:border-pink-200"
                      >
                        <CheckSquare className="h-4 w-4" />
                        Visible
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedSlugs([])}
                        className="inline-flex items-center gap-2 rounded border border-white/20 px-3 py-2 text-xs font-bold text-white transition hover:border-white/40"
                      >
                        <X className="h-4 w-4" />
                        Clear
                      </button>
                    </div>
                  </div>
                  <label className="flex cursor-pointer items-center justify-between gap-3 rounded border border-dashed border-white/20 bg-black/20 px-3 py-3 text-sm text-slate-200 transition hover:border-pink-200">
                    <span className="flex min-w-0 items-center gap-2">
                      <Upload className="h-4 w-4 shrink-0 text-pink-200" />
                      <span className="truncate">{uploadFiles.length ? `${uploadFiles.length} files selected` : 'Select .tah, .hat, .txt, or .md files'}</span>
                    </span>
                    <input
                      type="file"
                      multiple
                      accept=".tah,.hat,.txt,.md"
                      className="sr-only"
                      onChange={event => setUploadFiles(Array.from(event.target.files || []))}
                    />
                  </label>
                  <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-300">
                    Additional Text
                    <textarea
                      value={memoriaText}
                      onChange={event => setMemoriaText(event.target.value)}
                      className="mt-2 min-h-24 w-full resize-y rounded border border-white/10 bg-black/35 px-3 py-3 text-sm normal-case leading-6 tracking-normal text-white outline-none transition focus:border-pink-200"
                      placeholder="Optional notes to merge into the Memoria pair..."
                    />
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="submit"
                      disabled={busyAction !== null || (selectedSlugs.length === 0 && uploadFiles.length === 0 && !memoriaText.trim())}
                      className="inline-flex items-center gap-2 rounded bg-pink-300 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-pink-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busyAction === 'memoria' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderInput className="h-4 w-4" />}
                      Create Memoria
                    </button>
                    <span className="text-xs font-semibold text-slate-300">{selectedSlugs.length} catalog cartridges selected</span>
                  </div>
                </form>
              </div>

              {forgeStatus && (
                <div className={`mt-4 rounded border px-4 py-3 text-sm ${forgeStatus.type === 'success' ? 'border-emerald-300/40 bg-emerald-300/10 text-emerald-100' : 'border-red-300/40 bg-red-500/10 text-red-100'}`}>
                  <p className="font-bold">{forgeStatus.message}</p>
                  {forgeStatus.files?.length ? (
                    <p className="mt-1 font-mono text-xs">
                      {forgeStatus.files.map(file => `${file.path} (${formatBytes(file.byteSize)})`).join(' | ')}
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            <div className="grid gap-3 xl:grid-cols-2">
              {filteredCartridges.map(cartridge => (
                <article
                  key={`${cartridge.slug}:${cartridge.source}`}
                  className="rounded border border-white/10 bg-white/[0.04] p-4 transition hover:border-cyan-200/60 hover:bg-white/[0.07]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em]">
                      <span className="rounded bg-white/10 px-2 py-1 text-cyan-200">{cartridge.format}</span>
                      <span className="rounded bg-white/10 px-2 py-1 text-slate-300">{cartridge.domain.label}</span>
                      <span className="rounded bg-white/10 px-2 py-1 text-slate-300">{formatBytes(cartridge.payloadByteSize)}</span>
                      <span className="rounded bg-white/10 px-2 py-1 text-slate-300">{cartridge.shardCount} shards</span>
                    </div>
                    <label className={`inline-flex cursor-pointer items-center gap-2 rounded border px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] transition ${selectedSlugSet.has(cartridge.slug) ? 'border-pink-200 bg-pink-300 text-slate-950' : 'border-white/10 bg-black/20 text-slate-300 hover:border-pink-200/70'}`}>
                      <input
                        type="checkbox"
                        checked={selectedSlugSet.has(cartridge.slug)}
                        onChange={() => toggleSlug(cartridge.slug)}
                        className="h-3.5 w-3.5 rounded border-white/20 bg-black/40 text-pink-300"
                      />
                      Memoria
                    </label>
                  </div>

                  <h3 className="mt-3 text-xl font-black leading-tight text-white">{cartridge.displayTitle}</h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-300">{cartridge.summary}</p>
                  <p className="mt-3 truncate font-mono text-xs text-cyan-100">{cartridge.source}</p>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                    <Link className="rounded bg-cyan-300 px-3 py-2 text-slate-950" href={`/tah/${cartridge.slug}`} scroll={false}>Page</Link>
                    <Link className="rounded bg-pink-300 px-3 py-2 text-slate-950" href={`/tah/${cartridge.slug}/headless`}>Headless</Link>
                    <Link className="rounded border border-white/20 px-3 py-2 text-white" href={`/api/tah/${cartridge.slug}/meta`}>Meta</Link>
                    <Link className="rounded border border-white/20 px-3 py-2 text-white" href={cartridge.routes.api.replace(/^https?:\/\/[^/]+/, '')}>Query</Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 b';
  if (bytes < 1024) return `${bytes} b`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 102.4) / 10} kb`;
  return `${Math.round(bytes / 104857.6) / 10} mb`;
}

function ArchiveMetric({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded border border-white/10 bg-black/20 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-black capitalize text-white">{value}</p>
    </div>
  );
}

async function fileToPayload(file: File) {
  const buffer = await file.arrayBuffer();
  return {
    name: file.name,
    contentBase64: arrayBufferToBase64(buffer)
  };
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function uniqueStrings(values: string[]) {
  return [...new Set(values)];
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, CircleAlert, Loader2, Search } from 'lucide-react';

type Fixture = { id: string; question: string; expectedHints: string[]; category: string };
type Inspection = {
  query: string;
  crawlerStatus: string;
  fallbackRequired: boolean;
  trace: {
    durationMs: number;
    candidateCount: number;
    searchLimit: number;
    searchedCartridges: string[];
    matchedCartridges: string[];
    resultCount: number;
    stopReason: string;
    remoteHydration: string;
    candidateDecisions: Array<{ source: string; score: number; selected: boolean; reasons: string[] }>;
  } | null;
  evidence: Array<{ source: string; title: string; excerpt: string; url: string | null; score: number }>;
  evaluation: { passed: boolean; matchedHints: string[]; expectedHints: string[] } | null;
};

export default function RetrievalInspector() {
  const [open, setOpen] = useState(true);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [query, setQuery] = useState('');
  const [fixtureId, setFixtureId] = useState('');
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestVersion = useRef(0);

  useEffect(() => {
    fetch('/api/atlas/retrieval', { cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.message || 'Inspector access required.');
        setFixtures(body.data.fixtures || []);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Inspector unavailable.'));
  }, []);

  const inspect = async () => {
    if (!query.trim() && !fixtureId) return;
    setLoading(true);
    setError('');
    const version = ++requestVersion.current;
    try {
      const response = await fetch('/api/atlas/retrieval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fixtureId ? { fixtureId } : { query }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Inspection failed.');
      if (version === requestVersion.current) setInspection(body.data);
    } catch (inspectError) {
      setError(inspectError instanceof Error ? inspectError.message : 'Inspection failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mt-4 rounded border border-cyan-200/20 bg-[#03080b]/90 p-3 font-mono">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-3 text-left">
        <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
          <Search className="h-4 w-4" /> Retrieval Inspector
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
      </button>

      {open && (
        <div className="mt-3 space-y-3 text-[11px] leading-5">
          <select
            aria-label="Evaluation fixture"
            value={fixtureId}
            onChange={(event) => {
              setFixtureId(event.target.value);
              const selected = fixtures.find((fixture) => fixture.id === event.target.value);
              if (selected) setQuery(selected.question);
            }}
            className="w-full border border-white/10 bg-black/50 px-2 py-2 text-slate-200 outline-none focus:border-cyan-300"
          >
            <option value="">Custom query</option>
            {fixtures.map((fixture) => <option key={fixture.id} value={fixture.id}>{fixture.category}: {fixture.question}</option>)}
          </select>
          <div className="flex gap-2">
            <input
              aria-label="Retrieval inspection query"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setFixtureId(''); }}
              onKeyDown={(event) => { if (event.key === 'Enter') inspect(); }}
              className="min-w-0 flex-1 border border-white/10 bg-black/50 px-2 text-slate-100 outline-none focus:border-cyan-300"
              placeholder="Ask what Jamie should know..."
            />
            <button type="button" onClick={inspect} disabled={loading || (!query.trim() && !fixtureId)} className="h-9 w-9 shrink-0 border border-cyan-300/30 text-cyan-200 disabled:opacity-40" title="Run retrieval inspection">
              {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : <Search className="mx-auto h-4 w-4" />}
            </button>
          </div>

          {inspection?.trace && (
            <>
              <div className="grid grid-cols-2 gap-2 border-y border-white/10 py-2 text-slate-400">
                <span>latency: <b className="text-slate-100">{inspection.trace.durationMs} ms</b></span>
                <span>results: <b className="text-slate-100">{inspection.trace.resultCount}</b></span>
                <span>candidates: <b className="text-slate-100">{inspection.trace.candidateCount}</b></span>
                <span>searched: <b className="text-slate-100">{inspection.trace.searchedCartridges.length}</b></span>
                <span>stop: <b className="text-amber-200">{inspection.trace.stopReason}</b></span>
                <span>remote: <b className="text-cyan-200">{inspection.trace.remoteHydration}</b></span>
                <span>crawler: <b className="text-emerald-200">{inspection.crawlerStatus}</b></span>
                <span>fallback: <b className={inspection.fallbackRequired ? 'text-amber-200' : 'text-emerald-200'}>{inspection.fallbackRequired ? 'required' : 'grounded'}</b></span>
              </div>
              {inspection.evaluation && (
                <p className={`flex items-center gap-2 ${inspection.evaluation.passed ? 'text-emerald-200' : 'text-red-200'}`}>
                  {inspection.evaluation.passed ? <CheckCircle2 className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}
                  Fixture {inspection.evaluation.passed ? 'matched' : 'missed'}: {inspection.evaluation.matchedHints.join(', ') || inspection.evaluation.expectedHints.join(', ')}
                </p>
              )}
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Candidate ranking</p>
                <div className="mt-1 max-h-28 space-y-1 overflow-auto">
                  {inspection.trace.candidateDecisions.slice(0, 12).map((candidate) => (
                    <p key={candidate.source} className={candidate.selected ? 'text-cyan-200' : 'text-slate-600'}>
                      {candidate.selected ? 'SELECT' : 'SKIP'} {candidate.score} · {candidate.source} · {candidate.reasons.join('; ')}
                    </p>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Searched cartridges</p>
                <p className="mt-1 max-h-14 overflow-auto break-words text-slate-400">{inspection.trace.searchedCartridges.join(', ') || 'none'}</p>
              </div>
              <div className="space-y-2">
                {inspection.evidence.map((item, index) => (
                  <article key={`${item.source}:${index}`} className="border border-white/10 bg-white/[0.03] p-2">
                    <p className="text-cyan-200">{item.title} <span className="text-slate-600">· {item.source}</span></p>
                    <p className="mt-1 line-clamp-3 text-slate-400">{item.excerpt}</p>
                  </article>
                ))}
                {!inspection.evidence.length && <p className="text-slate-500">No evidence selected. This is a measurable retrieval miss.</p>}
              </div>
            </>
          )}
          {error && <p className="flex items-start gap-2 text-amber-200"><CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />{error}</p>}
        </div>
      )}
    </section>
  );
}

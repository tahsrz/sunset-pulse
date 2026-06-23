'use client';

import { useEffect, useMemo, useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  MessageSquareText,
  Mic,
  PhoneCall,
  RadioTower,
  Save,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { analyzeCallAssist, type CallAssistAnalysis, type CallAssistCard } from '@/lib/call-assist/analyzer';
import type { CallAssistReadiness } from '@/lib/call-assist/readiness';

const sampleTranscript = [
  'Caller: I like the house, but the price feels a little high.',
  'Agent: That makes sense. Are you thinking about the monthly payment or the total price?',
  'Caller: Monthly payment. We are preapproved, but I need to talk it over with my wife.',
  'Agent: Would seeing it tomorrow help you decide whether it is worth exploring?',
  'Caller: Tomorrow could work if the payment range makes sense.'
].join('\n');

type SessionSnapshot = {
  id?: string;
  leadId?: string;
  status?: string;
  callSid?: string;
  streamSid?: string;
  streamName?: string;
  lastError?: string;
  summarySavedAt?: string;
  consent?: {
    disclosureRead?: boolean;
    callerConsented?: boolean;
    recordingAllowed?: boolean;
  };
  analysis?: CallAssistAnalysis;
};

type SaveProof = {
  leadId?: string;
  savedAt: string;
  persisted: boolean;
  summary: string;
  intentScore: number;
  tags: string[];
};

const initialAnalysis: CallAssistAnalysis = {
  consent: {
    ready: false,
    warning: 'Read the call-assist disclosure and capture caller consent before listening, recording, or storing call notes.'
  },
  stage: 'consent-needed',
  intentScore: 0,
  talkTrack: 'Consent first. Jamie stays quiet until the caller has agreed.',
  cards: [{
    id: 'consent-required',
    kind: 'consent',
    title: 'Consent Gate',
    body: 'Read the call-assist disclosure and capture caller consent before listening, recording, or storing call notes.',
    priority: 100,
    suggestedLine: 'Before we continue, I use call notes to help keep details accurate. Is that okay?'
  }],
  summary: 'Call assist is locked until consent is captured.',
  followUpDraft: '',
  memoryPatch: {
    callerName: null,
    objections: [],
    nextActions: ['Capture disclosure and caller consent.'],
    mentionedProperty: null,
    budgetFit: 'unknown'
  },
  transcriptStats: {
    wordCount: 0,
    questionCount: 0,
    signalCount: 0
  }
};

export default function CallAssistConsole() {
  const searchParams = useSearchParams();
  const [callerName, setCallerName] = useState('Jamie Lead');
  const [leadStage, setLeadStage] = useState('New inquiry');
  const [propertyAddress, setPropertyAddress] = useState('101 S. Council, Sunset, TX');
  const [propertyPrice, setPropertyPrice] = useState('525000');
  const [budget, setBudget] = useState('500000');
  const [timeframe, setTimeframe] = useState('');
  const [financingStatus, setFinancingStatus] = useState('');
  const [leadId, setLeadId] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [sessionStatus, setSessionStatus] = useState('');
  const [sessionNote, setSessionNote] = useState('');
  const [disclosureRead, setDisclosureRead] = useState(false);
  const [callerConsented, setCallerConsented] = useState(false);
  const [recordingAllowed, setRecordingAllowed] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [analysis, setAnalysis] = useState<CallAssistAnalysis>(initialAnalysis);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [readiness, setReadiness] = useState<CallAssistReadiness | null>(null);
  const [sessionDetail, setSessionDetail] = useState<SessionSnapshot | null>(null);
  const [saveProof, setSaveProof] = useState<SaveProof | null>(null);
  const lastSyncedTranscriptRef = useRef('');
  const transcriptRef = useRef('');
  const demoLoadedRef = useRef(false);

  const callContext = useMemo(() => ({
    callerName: callerName.trim() || undefined,
    leadStage: leadStage.trim() || undefined,
    propertyAddress: propertyAddress.trim() || undefined,
    propertyPrice: parseMoney(propertyPrice),
    budget: parseMoney(budget),
    timeframe: timeframe.trim() || undefined,
    financingStatus: financingStatus.trim() || undefined
  }), [budget, callerName, financingStatus, leadStage, propertyAddress, propertyPrice, timeframe]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/call-assist/readiness', { cache: 'no-store' })
      .then((response) => response.json())
      .then((body) => {
        if (!cancelled && body?.data) setReadiness(body.data);
      })
      .catch(() => {
        if (!cancelled) setReadiness(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const lead = searchParams.get('leadId');
    const caller = searchParams.get('caller');
    const phone = searchParams.get('phone');
    const property = searchParams.get('property');
    const price = searchParams.get('price');
    const leadBudget = searchParams.get('budget');
    const stage = searchParams.get('stage');
    const timeline = searchParams.get('timeline');
    const stream = searchParams.get('streamUrl');
    const demo = searchParams.get('demo') || searchParams.get('mode');

    if ((demo === '1' || demo === 'true' || demo === 'demo') && !demoLoadedRef.current) {
      demoLoadedRef.current = true;
      loadGuidedDemo();
      return;
    }

    if (lead) setLeadId(lead);
    if (caller) setCallerName(caller);
    if (phone) setCustomerPhone(phone);
    if (property) setPropertyAddress(property);
    if (price) setPropertyPrice(price);
    if (leadBudget) setBudget(leadBudget);
    if (stage) setLeadStage(stage);
    if (timeline) setTimeframe(timeline);
    if (stream) setStreamUrl(stream);
  }, [searchParams]);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    async function refreshSession() {
      try {
        const response = await fetch(`/api/call-assist/sessions/${sessionId}`, { cache: 'no-store' });
        const body = await response.json();
        if (!response.ok || body.error || cancelled) return;

        const session = body.data;
        setSessionDetail(session);
        setSessionStatus(session.status || '');
        if (session.analysis) setAnalysis(session.analysis);
        if (session.transcript && session.transcript !== transcriptRef.current) {
          setTranscript(session.transcript);
          lastSyncedTranscriptRef.current = session.transcript;
        }
      } catch {
        // Live refresh is opportunistic; explicit actions surface errors.
      }
    }

    refreshSession();
    const intervalId = window.setInterval(refreshSession, 1800);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [sessionId]);

  async function createBridgeSession(dryRun = true) {
    setIsStarting(true);
    setError('');
    setSessionNote('');
    setSaveProof(null);

    if (!dryRun && readiness && !readiness.canPlaceRealCall) {
      setIsStarting(false);
      setError('Real calling is locked until Twilio credentials and a public callback URL are configured.');
      return;
    }

    try {
      const response = await fetch('/api/call-assist/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dryRun,
          customerPhone,
          agentPhone,
          leadId: leadId.trim() || undefined,
          streamUrl: streamUrl.trim() || undefined,
          context: callContext,
          consent: {
            disclosureRead,
            callerConsented,
            recordingAllowed
          },
          transcript
        })
      });
      const body = await response.json();

      if (!response.ok || body.error) {
        throw new Error(body.message || 'Failed to create call-assist session.');
      }

      const session = body.data.session;
      setSessionId(session.id);
      setSessionStatus(session.status || '');
      setSessionDetail(session);
      setAnalysis(session.analysis || analysis);
      lastSyncedTranscriptRef.current = transcript;
      setSessionNote(dryRun
        ? `Dry-run bridge ready. TwiML: ${body.data.urls.twimlUrl}`
        : `Bridge call started. Session ${session.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create call-assist session.');
    } finally {
      setIsStarting(false);
    }
  }

  async function syncTranscriptToSession(mode: 'live' | 'post-call') {
    if (!sessionId) return null;
    const previous = lastSyncedTranscriptRef.current;
    const fragment = transcript.startsWith(previous)
      ? transcript.slice(previous.length).trim()
      : transcript;

    if (!fragment && mode === 'live') return null;

    if (fragment) {
      const response = await fetch(`/api/call-assist/transcript/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fragment, source: 'operator-console' })
      });
      const body = await response.json();
      if (!response.ok || body.error) {
        throw new Error(body.message || 'Failed to sync transcript to call session.');
      }
      lastSyncedTranscriptRef.current = transcript;
      return body.data;
    }

    return null;
  }

  async function analyze(mode: 'live' | 'post-call' = 'live') {
    setIsAnalyzing(true);
    setError('');

    try {
      const synced = await syncTranscriptToSession(mode);
      if (synced?.analysis && mode === 'live') {
        setAnalysis(synced.analysis);
        return;
      }

      if (sessionId && mode === 'post-call') {
        const response = await fetch(`/api/call-assist/sessions/${sessionId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'finalize' })
        });
        const body = await response.json();
        if (!response.ok || body.error) {
          throw new Error(body.message || 'Failed to finalize call session.');
        }
        setAnalysis(body.data.analysis);
        setSessionStatus(body.data.status || 'completed');
        setSessionDetail(body.data);
        setSessionNote(`Session finalized: ${body.data.id}`);
        return;
      }

      const response = await fetch('/api/call-assist/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          mode,
          context: callContext,
          consent: {
            disclosureRead,
            callerConsented,
            recordingAllowed
          }
        })
      });
      const body = await response.json();

      if (!response.ok || body.error) {
        throw new Error(body.message || 'Call analysis failed.');
      }

      setAnalysis(body.data);
    } catch (err: any) {
      setError(err.message || 'Call analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function saveSummary() {
    if (!sessionId) {
      setError('Create a call-assist session before saving a summary.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/call-assist/save-summary/${sessionId}`, {
        method: 'POST'
      });
      const body = await response.json();
      if (!response.ok || body.error) {
        throw new Error(body.message || 'Failed to save summary.');
      }
      const savedSession = body.data.session || body.data;
      const savedAnalysis = savedSession.analysis || analysis;
      setSessionStatus(savedSession.status || sessionStatus);
      setSessionDetail(savedSession);
      setSaveProof({
        leadId: savedSession.leadId,
        savedAt: savedSession.summarySavedAt || new Date().toISOString(),
        persisted: Boolean(readiness?.canSaveBack),
        summary: savedAnalysis.summary,
        intentScore: savedAnalysis.intentScore,
        tags: [
          'CALL-ASSIST',
          ...savedAnalysis.memoryPatch.objections.map((item: string) => item.toUpperCase().replace(/[^A-Z0-9]+/g, '-')),
        ],
      });
      setSessionNote(readiness?.canSaveBack
        ? `Summary saved to lead from session ${savedSession.id}.`
        : `Summary patch prepared from session ${savedSession.id}. Configure MONGODB_URI for live lead write-back.`);
    } catch (err: any) {
      setError(err.message || 'Failed to save summary.');
    } finally {
      setIsSaving(false);
    }
  }

  function loadSample() {
    setDisclosureRead(true);
    setCallerConsented(true);
    setTranscript(sampleTranscript);
    setAnalysis(analyzeCallAssist({
      transcript: sampleTranscript,
      context: callContext,
      consent: { disclosureRead: true, callerConsented: true, recordingAllowed }
    }));
  }

  function loadGuidedDemo() {
    const demoContext = {
      callerName: 'Morgan Demo Lead',
      leadStage: 'Hot buyer inquiry',
      propertyAddress: '101 S. Council, Sunset, TX',
      propertyPrice: 525000,
      budget: 500000,
      timeframe: 'Tour tomorrow',
      financingStatus: 'Preapproved',
    };

    setCallerName(demoContext.callerName);
    setLeadStage(demoContext.leadStage);
    setPropertyAddress(demoContext.propertyAddress);
    setPropertyPrice(String(demoContext.propertyPrice));
    setBudget(String(demoContext.budget));
    setTimeframe(demoContext.timeframe);
    setFinancingStatus(demoContext.financingStatus);
    setLeadId('demo-lead-sunset-001');
    setCustomerPhone('+15551234567');
    setAgentPhone('+15557654321');
    setDisclosureRead(true);
    setCallerConsented(true);
    setRecordingAllowed(true);
    setTranscript(sampleTranscript);
    setSessionNote('Guided demo loaded. Start with Dry Run, then Analyze Live, End Call, and Save Summary.');
    setSaveProof(null);
    setAnalysis(analyzeCallAssist({
      transcript: sampleTranscript,
      context: demoContext,
      consent: { disclosureRead: true, callerConsented: true, recordingAllowed: true }
    }));
  }

  return (
    <main className="min-h-screen bg-[#07131a] text-white">
      <section className="border-b border-cyan-200/10 px-4 py-8 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-200/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100">
              <PhoneCall className="h-4 w-4" />
              Jamie Call Assist
            </div>
            <h1 className="mt-5 text-4xl font-black uppercase italic tracking-tight text-white md:text-6xl">
              Live call listening post
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-teal-50/65">
              Consent-gated transcript analysis, objection radar, next question prompts, and follow-up memory for real estate calls.
            </p>
          </div>

          <div className="grid min-w-[280px] grid-cols-3 gap-2 rounded-lg border border-white/10 bg-white/[0.045] p-3">
            <Metric label="Intent" value={`${analysis.intentScore}%`} />
            <Metric label="Stage" value={analysis.stage.replace('-', ' ')} />
            <Metric label="Signals" value={String(analysis.transcriptStats.signalCount)} />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-6 md:px-8 xl:grid-cols-[360px_minmax(0,1fr)_390px]">
        <div className="space-y-5">
          <Panel title="Consent" icon={<ShieldCheck className="h-4 w-4" />}>
            <div className="rounded-md border border-amber-200/20 bg-amber-200/10 p-4 text-sm leading-6 text-amber-50/85">
              Before we continue, I use call notes to help keep details accurate. Is that okay?
            </div>
            <label className="mt-4 flex items-start gap-3 text-sm font-bold text-teal-50/75">
              <input
                checked={disclosureRead}
                onChange={(event) => setDisclosureRead(event.target.checked)}
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-white/20 bg-black/30"
              />
              Disclosure read aloud
            </label>
            <label className="mt-3 flex items-start gap-3 text-sm font-bold text-teal-50/75">
              <input
                checked={callerConsented}
                onChange={(event) => setCallerConsented(event.target.checked)}
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-white/20 bg-black/30"
              />
              Caller consent captured
            </label>
            <label className="mt-3 flex items-start gap-3 text-sm font-bold text-teal-50/75">
              <input
                checked={recordingAllowed}
                onChange={(event) => setRecordingAllowed(event.target.checked)}
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-white/20 bg-black/30"
              />
              Recording allowed
            </label>
          </Panel>

          <Panel title="Demo Readiness" icon={<CheckCircle2 className="h-4 w-4" />}>
            <ReadinessPanel readiness={readiness} />
          </Panel>

          <Panel title="Bridge" icon={<RadioTower className="h-4 w-4" />}>
            <button
              type="button"
              onClick={loadGuidedDemo}
              className="mb-2 inline-flex w-full items-center justify-center gap-2 rounded-md border border-emerald-200/25 bg-emerald-300/12 px-3 py-3 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100 transition hover:bg-emerald-300/18"
            >
              Load Guided Demo
            </button>
            <Field label="Customer phone" value={customerPhone} onChange={setCustomerPhone} placeholder="+15551234567" />
            <Field label="Agent phone" value={agentPhone} onChange={setAgentPhone} placeholder="+15557654321" />
            <Field label="Lead ID" value={leadId} onChange={setLeadId} />
            <Field label="Media stream WSS" value={streamUrl} onChange={setStreamUrl} placeholder="wss://voice.example.com/call-assist" />
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => createBridgeSession(true)}
                disabled={isStarting}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-cyan-200/25 bg-cyan-300/12 px-3 py-3 text-[11px] font-black uppercase tracking-[0.14em] text-cyan-100 transition hover:bg-cyan-300/18 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Dry Run
              </button>
              <button
                type="button"
                onClick={() => createBridgeSession(false)}
                disabled={isStarting || Boolean(readiness && !readiness.canPlaceRealCall)}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-amber-200/25 bg-amber-300/12 px-3 py-3 text-[11px] font-black uppercase tracking-[0.14em] text-amber-100 transition hover:bg-amber-300/18 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {readiness && !readiness.canPlaceRealCall ? 'Real Call Locked' : 'Place Call'}
              </button>
            </div>
            {sessionId && (
              <div className="mt-4 rounded-md border border-white/10 bg-black/25 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-teal-100/45">Session</p>
                  {sessionStatus && (
                    <span className="rounded border border-cyan-200/20 bg-cyan-200/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100">
                      {sessionStatus.replace('_', ' ')}
                    </span>
                  )}
                </div>
                <p className="mt-2 break-all font-mono text-xs text-white">{sessionId}</p>
              </div>
            )}
            <SessionTelemetry session={sessionDetail} />
            {sessionNote && (
              <p className="mt-3 rounded-md border border-emerald-200/20 bg-emerald-300/10 p-3 text-xs leading-5 text-emerald-50/80">
                {sessionNote}
              </p>
            )}
          </Panel>

          <Panel title="Call Context" icon={<ClipboardList className="h-4 w-4" />}>
            <Field label="Caller" value={callerName} onChange={setCallerName} />
            <Field label="Lead stage" value={leadStage} onChange={setLeadStage} />
            <Field label="Property" value={propertyAddress} onChange={setPropertyAddress} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="List price" value={propertyPrice} onChange={setPropertyPrice} inputMode="numeric" />
              <Field label="Budget" value={budget} onChange={setBudget} inputMode="numeric" />
            </div>
            <Field label="Timeline" value={timeframe} onChange={setTimeframe} />
            <Field label="Financing" value={financingStatus} onChange={setFinancingStatus} />
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Transcript" icon={<Mic className="h-4 w-4" />}>
            <textarea
              value={transcript}
              onChange={(event) => setTranscript(event.target.value)}
              className="min-h-[410px] w-full resize-y rounded-lg border border-white/10 bg-black/25 p-4 font-mono text-sm leading-7 text-teal-50 outline-none transition placeholder:text-slate-500 focus:border-cyan-200/45"
              placeholder="Caller: I like the home, but the payment feels high..."
            />
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => analyze('live')}
                disabled={isAnalyzing}
                className="inline-flex items-center gap-2 rounded-md bg-cyan-300 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Sparkles className="h-4 w-4" />
                {isAnalyzing ? 'Analyzing' : 'Analyze Live'}
              </button>
              <button
                type="button"
                onClick={() => analyze('post-call')}
                disabled={isAnalyzing}
                className="inline-flex items-center gap-2 rounded-md border border-emerald-200/25 bg-emerald-300/12 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-emerald-100 transition hover:bg-emerald-300/18 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" />
                End Call
              </button>
              <button
                type="button"
                onClick={saveSummary}
                disabled={isSaving || !sessionId}
                className="inline-flex items-center gap-2 rounded-md border border-violet-200/25 bg-violet-300/12 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-violet-100 transition hover:bg-violet-300/18 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                Save Summary
              </button>
              <button
                type="button"
                onClick={loadSample}
                className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.05] px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-200 transition hover:bg-white/[0.09]"
              >
                Load Sample
              </button>
            </div>
            {error && (
              <div className="mt-4 rounded-md border border-rose-300/25 bg-rose-500/10 p-3 text-sm font-bold text-rose-100">
                {error}
              </div>
            )}
          </Panel>

          <Panel title="Jamie Talk Track" icon={<MessageSquareText className="h-4 w-4" />}>
            <p className="text-xl font-black leading-8 text-white">{analysis.talkTrack}</p>
            <p className="mt-4 text-sm leading-7 text-teal-50/62">{analysis.summary}</p>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Assist Cards" icon={<Sparkles className="h-4 w-4" />}>
            <div className="space-y-3" aria-live="polite">
              {analysis.cards.map((card) => (
                <AssistCardView key={card.id} card={card} />
              ))}
            </div>
          </Panel>

          <Panel title="Memory Patch" icon={<ClipboardList className="h-4 w-4" />}>
            <div className="grid gap-3 text-sm">
              <MemoryRow label="Caller" value={analysis.memoryPatch.callerName || callerName || 'Unknown'} />
              <MemoryRow label="Budget fit" value={analysis.memoryPatch.budgetFit.replace('-', ' ')} />
              <MemoryRow label="Property" value={analysis.memoryPatch.mentionedProperty || 'Not set'} />
              <MemoryRow label="Objections" value={analysis.memoryPatch.objections.join(', ') || 'None yet'} />
            </div>
            {saveProof && <SaveProofView proof={saveProof} />}
            {analysis.followUpDraft && (
              <div className="mt-5 rounded-md border border-emerald-200/20 bg-emerald-300/10 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-100/70">
                  Follow-up
                </p>
                <p className="mt-3 text-sm leading-6 text-emerald-50/85">{analysis.followUpDraft}</p>
              </div>
            )}
          </Panel>
        </div>
      </section>
    </main>
  );
}

function Panel({ children, icon, title }: { children: ReactNode; icon: ReactNode; title: string }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/70">
        {icon}
        {title}
      </div>
      {children}
    </section>
  );
}

function Field({
  inputMode,
  label,
  onChange,
  placeholder,
  value
}: {
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode'];
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <label className="mt-3 block">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-teal-100/50">{label}</span>
      <input
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2.5 text-sm font-bold text-white outline-none transition focus:border-cyan-200/45"
      />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/8 bg-black/25 p-3 text-center">
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-teal-100/45">{label}</p>
      <p className="mt-2 text-sm font-black uppercase text-white">{value}</p>
    </div>
  );
}

function ReadinessPanel({ readiness }: { readiness: CallAssistReadiness | null }) {
  if (!readiness) {
    return (
      <div className="rounded-md border border-white/10 bg-black/20 p-4 text-sm leading-6 text-teal-50/65">
        Checking call-assist environment...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <ReadinessBadge label="Dry Run" ready={readiness.canDryRun} />
        <ReadinessBadge label="Real Call" ready={readiness.canPlaceRealCall} />
        <ReadinessBadge label="Live Audio" ready={readiness.canStreamAudio} />
      </div>
      <div className="space-y-2">
        {readiness.items.map((item) => (
          <div key={item.id} className="rounded-md border border-white/10 bg-black/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-white">{item.label}</p>
              <StatusPill ready={item.ready} />
            </div>
            <p className="mt-2 text-xs leading-5 text-teal-50/60">{item.detail}</p>
          </div>
        ))}
      </div>
      <div className="rounded-md border border-cyan-200/15 bg-cyan-300/10 p-3">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-100/70">Runbook</p>
        <ul className="mt-2 space-y-1 text-xs leading-5 text-cyan-50/72">
          {readiness.runbook.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ReadinessBadge({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className={`rounded-md border p-2 text-center ${ready ? 'border-emerald-200/20 bg-emerald-300/10' : 'border-amber-200/20 bg-amber-300/10'}`}>
      <p className="text-[8px] font-black uppercase tracking-[0.16em] text-teal-50/45">{label}</p>
      <p className={`mt-1 text-[10px] font-black uppercase ${ready ? 'text-emerald-100' : 'text-amber-100'}`}>
        {ready ? 'Ready' : 'Needs Setup'}
      </p>
    </div>
  );
}

function StatusPill({ ready }: { ready: boolean }) {
  return (
    <span className={`rounded px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${ready ? 'bg-emerald-300/15 text-emerald-100' : 'bg-amber-300/15 text-amber-100'}`}>
      {ready ? 'Ready' : 'Missing'}
    </span>
  );
}

function SessionTelemetry({ session }: { session: SessionSnapshot | null }) {
  if (!session) return null;

  return (
    <div className="mt-3 grid gap-2 rounded-md border border-white/10 bg-black/20 p-3 text-xs">
      <div className="grid grid-cols-2 gap-2">
        <TelemetryRow label="Call SID" value={session.callSid || 'Pending'} />
        <TelemetryRow label="Stream SID" value={session.streamSid || 'Pending'} />
        <TelemetryRow label="Stream Name" value={session.streamName || 'Pending'} />
        <TelemetryRow label="Lead ID" value={session.leadId || 'None'} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <TelemetryRow label="Disclosure" value={session.consent?.disclosureRead ? 'Read' : 'Needed'} />
        <TelemetryRow label="Consent" value={session.consent?.callerConsented ? 'Captured' : 'Needed'} />
        <TelemetryRow label="Recording" value={session.consent?.recordingAllowed === false ? 'Off' : 'Allowed'} />
      </div>
      {session.lastError && (
        <div className="rounded border border-rose-300/25 bg-rose-500/10 p-2 text-rose-100">
          {session.lastError}
        </div>
      )}
    </div>
  );
}

function TelemetryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/8 bg-black/20 p-2">
      <p className="text-[8px] font-black uppercase tracking-[0.16em] text-teal-100/45">{label}</p>
      <p className="mt-1 break-all font-mono text-[11px] text-white">{value}</p>
    </div>
  );
}

function SaveProofView({ proof }: { proof: SaveProof }) {
  return (
    <div className="mt-5 rounded-md border border-cyan-200/20 bg-cyan-300/10 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/70">
          Save-Back Proof
        </p>
        <span className="rounded bg-cyan-200/15 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100">
          {proof.persisted ? 'Lead Updated' : 'Patch Prepared'}
        </span>
      </div>
      <p className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-cyan-100">
        {proof.intentScore}% intent
      </p>
      <p className="mt-3 text-xs font-mono text-cyan-50/70">Lead: {proof.leadId || 'No lead attached'}</p>
      <p className="mt-2 text-xs font-mono text-cyan-50/70">Saved: {proof.savedAt}</p>
      <p className="mt-3 text-sm leading-6 text-cyan-50/85">{proof.summary}</p>
      <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-cyan-100/65">
        Tags: {proof.tags.join(', ') || 'None'}
      </p>
    </div>
  );
}

function AssistCardView({ card }: { card: CallAssistCard }) {
  return (
    <article className={`rounded-md border p-4 ${cardClass(card.kind)}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">
            {card.kind.replace('-', ' ')}
          </p>
          <h3 className="mt-2 text-base font-black uppercase tracking-tight">{card.title}</h3>
        </div>
        {card.kind === 'compliance' && <AlertTriangle className="h-5 w-5 shrink-0" />}
      </div>
      <p className="mt-3 text-sm leading-6 opacity-80">{card.body}</p>
      {card.suggestedLine && (
        <p className="mt-4 rounded-md bg-black/20 p-3 text-sm font-bold leading-6">
          {card.suggestedLine}
        </p>
      )}
    </article>
  );
}

function MemoryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/8 bg-black/20 p-3">
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-teal-100/45">{label}</p>
      <p className="mt-2 text-sm font-bold capitalize text-white">{value}</p>
    </div>
  );
}

function cardClass(kind: CallAssistCard['kind']) {
  switch (kind) {
    case 'compliance':
      return 'border-rose-300/30 bg-rose-500/12 text-rose-50';
    case 'objection':
      return 'border-amber-300/25 bg-amber-300/12 text-amber-50';
    case 'next-question':
      return 'border-cyan-300/25 bg-cyan-300/12 text-cyan-50';
    case 'fact':
      return 'border-violet-300/25 bg-violet-300/12 text-violet-50';
    case 'follow-up':
      return 'border-emerald-300/25 bg-emerald-300/12 text-emerald-50';
    default:
      return 'border-white/15 bg-white/[0.05] text-white';
  }
}

function parseMoney(value: string) {
  const parsed = Number(value.replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

'use client';

import Link from 'next/link';
import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { Camera, CheckCircle2, CloudUpload, LockKeyhole, ScanLine, ShieldCheck, Upload, Wifi } from 'lucide-react';
import { scanModeCopy, supportedPropertyScanModes, type PropertyScanMode } from '@/lib/scans/propertyScanContract';

type ScanSession = {
  scanId: string;
  propertyAddress: string;
  listingId: string | null;
  captureMode: PropertyScanMode;
  status: string;
  revision: number;
  manifestHash: string;
  reviewerIds: string[];
  assets: Array<{ assetId?: string; fileName: string; size: number; mimeType: string }>;
};

type UploadStatus = 'queued' | 'reserving' | 'uploading' | 'finalizing' | 'complete' | 'failed' | 'cancelled';
type UploadItem = { id: string; file: File; status: UploadStatus; progress: number; message?: string; uploadId?: string; attempt: number };

function uploadToSignedUrl(url: string, file: File, signal: AbortSignal, onProgress: (progress: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    signal.addEventListener('abort', abort, { once: true });
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () => reject(new Error('Private storage upload failed.'));
    xhr.onabort = () => reject(new DOMException('Upload cancelled.', 'AbortError'));
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Private storage rejected the upload (${xhr.status}).`));
    xhr.open('PUT', url);
    xhr.setRequestHeader('content-type', file.type);
    xhr.send(file);
  });
}

export default function ScanStudioPage() {
  const [address, setAddress] = useState('');
  const [listingId, setListingId] = useState('');
  const [mode, setMode] = useState<PropertyScanMode>('guided_video');
  const [ownerAuthorized, setOwnerAuthorized] = useState(false);
  const [interiorAcknowledged, setInteriorAcknowledged] = useState(false);
  const [session, setSession] = useState<ScanSession | null>(null);
  const [sessions, setSessions] = useState<ScanSession[]>([]);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [cameraOn, setCameraOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [reviewerDraft, setReviewerDraft] = useState('');
  const [reviewerBusy, setReviewerBusy] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraRequestRef = useRef(0);
  const cameraPendingRef = useRef(false);
  const mountedRef = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sessionRef = useRef<ScanSession | null>(null);
  const uploadControllersRef = useRef(new Map<string, AbortController>());

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    mountedRef.current = true;
    void loadSessions();
    return () => {
      mountedRef.current = false;
      cameraRequestRef.current += 1;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  const loadSessions = async () => {
    setSessionLoading(true);
    try {
      const response = await fetch('/api/property-scans', { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Unable to load saved capture sessions.');
      const saved = Array.isArray(body.data?.sessions) ? body.data.sessions as ScanSession[] : [];
      if (!mountedRef.current) return;
      setSessions(saved);
      if (saved.length > 0 && !session) setMessage('Choose a saved session to resume, or start a new private session.');
    } catch (error) {
      if (mountedRef.current) setMessage(error instanceof Error ? error.message : 'Unable to load saved capture sessions.');
    } finally {
      if (mountedRef.current) setSessionLoading(false);
    }
  };

  const createSession = async () => {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/property-scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyAddress: address,
          listingId,
          captureMode: mode,
          consent: { ownerAuthorized, interiorCaptureAcknowledged: interiorAcknowledged, publicListingApproval: false },
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Unable to create capture session.');
      setSession(body.data.session);
      setReviewerDraft((body.data.session.reviewerIds || []).join(', '));
      setSessions((current) => [body.data.session, ...current.filter((item) => item.scanId !== body.data.session.scanId)]);
      setMessage('Private capture session created. Upload captures for agent review.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create capture session.');
    } finally {
      setBusy(false);
    }
  };

  const startCamera = async () => {
    if (streamRef.current || cameraPendingRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage('Camera preview is not available in this browser. Use the file capture control instead.');
      return;
    }
    const requestId = ++cameraRequestRef.current;
    cameraPendingRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      if (!mountedRef.current || requestId !== cameraRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
    } catch {
      if (mountedRef.current && requestId === cameraRequestRef.current) setMessage('Camera access was not granted. You can still upload captures from the device.');
    } finally {
      cameraPendingRef.current = false;
    }
  };

  const stopCamera = () => {
    cameraRequestRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    if (mountedRef.current) setCameraOn(false);
  };

  const applySession = (nextSession: ScanSession) => {
    sessionRef.current = nextSession;
    setSession(nextSession);
    setSessions((current) => current.map((item) => item.scanId === nextSession.scanId ? nextSession : item));
  };

  const updateUpload = (id: string, update: Partial<UploadItem>) => {
    setUploads((current) => current.map((item) => item.id === id ? { ...item, ...update } : item));
  };

  const runDirectUpload = async (item: UploadItem) => {
    const currentSession = sessionRef.current;
    if (!currentSession) return;
    const controller = new AbortController();
    uploadControllersRef.current.set(item.id, controller);
    const idempotencyKey = `${item.id}-${Date.now()}-${item.attempt + 1}`;
    let uploadId: string | undefined;
    try {
      updateUpload(item.id, { status: 'reserving', progress: 0, message: 'Reserving a private upload…', attempt: item.attempt + 1 });
      const reservationResponse = await fetch(`/api/property-scans/${currentSession.scanId}/uploads`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ idempotencyKey, fileName: item.file.name, mimeType: item.file.type, declaredBytes: item.file.size, expectedRevision: currentSession.revision }),
      });
      const reservationBody = await reservationResponse.json();
      if (!reservationResponse.ok) throw new Error(reservationBody.message || 'Unable to reserve private storage.');
      uploadId = reservationBody.data.reservation.uploadId;
      updateUpload(item.id, { uploadId, status: 'uploading', message: 'Uploading directly to private storage…' });
      const upload = reservationBody.data.upload;
      if (upload.mode !== 'mock') await uploadToSignedUrl(upload.signedUrl, item.file, controller.signal, (progress) => updateUpload(item.id, { progress }));
      updateUpload(item.id, { status: 'finalizing', progress: 100, message: 'Verifying the uploaded capture…' });
      const completeResponse = await fetch(`/api/property-scans/${currentSession.scanId}/uploads/${uploadId}/complete`, { method: 'POST', signal: controller.signal });
      const completeBody = await completeResponse.json();
      if (!completeResponse.ok) throw new Error(completeBody.message || 'Capture verification failed.');
      applySession(completeBody.data.session);
      updateUpload(item.id, { status: 'complete', progress: 100, message: 'Verified and ready for review.' });
    } catch (error) {
      if (uploadId) void fetch(`/api/property-scans/${currentSession.scanId}/uploads/${uploadId}`, { method: 'DELETE' }).catch(() => undefined);
      const cancelled = error instanceof DOMException && error.name === 'AbortError';
      updateUpload(item.id, { status: cancelled ? 'cancelled' : 'failed', message: cancelled ? 'Upload cancelled.' : (error instanceof Error ? error.message : 'Capture upload failed.') });
    } finally {
      uploadControllersRef.current.delete(item.id);
    }
  };

  const uploadCaptures = async (files: FileList | null) => {
    if (!sessionRef.current || !files?.length || busy) return;
    const queued = Array.from(files).map((file, index) => ({ id: `capture-${Date.now()}-${index}`, file, status: 'queued' as const, progress: 0, attempt: 0 }));
    setUploads(queued);
    setBusy(true);
    setMessage('Preparing private uploads…');
    for (const item of queued) await runDirectUpload(item);
    setBusy(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setMessage('Upload run finished. Review each capture outcome below.');
  };

  const retryUpload = async (id: string) => {
    if (busy) return;
    const item = uploads.find((candidate) => candidate.id === id);
    if (!item || !['failed', 'cancelled'].includes(item.status)) return;
    setBusy(true);
    await runDirectUpload(item);
    setBusy(false);
  };

  const cancelUpload = (id: string) => {
    uploadControllersRef.current.get(id)?.abort();
  };

  const resumeSession = (saved: ScanSession) => {
    stopCamera();
    sessionRef.current = saved;
    setSession(saved);
    setAddress(saved.propertyAddress);
    setListingId(saved.listingId || '');
    setMode(saved.captureMode);
    setReviewerDraft((saved.reviewerIds || []).join(', '));
    setUploads([]);
    setMessage(`Resumed ${saved.scanId.slice(-8)}. New captures will be added to this session.`);
  };

  const saveReviewers = async () => {
    if (!session) return;
    setReviewerBusy(true);
    setMessage('');
    const reviewerIds = [...new Set(reviewerDraft.split(',').map((value) => value.trim()).filter(Boolean))];
    try {
      const response = await fetch(`/api/property-scans/${session.scanId}/reviewers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewerIds, expectedRevision: session.revision }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Unable to update reviewer access.');
      setSession(body.data.session);
      setSessions((current) => current.map((item) => item.scanId === body.data.session.scanId ? body.data.session : item));
      setReviewerDraft(body.data.session.reviewerIds.join(', '));
      setMessage('Reviewer access saved for this private capture session.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update reviewer access.');
    } finally {
      setReviewerBusy(false);
    }
  };

  const selectedMode = scanModeCopy[mode];

  return (
    <main className="min-h-screen bg-[#07131f] text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.2),transparent_38%),linear-gradient(135deg,#0a1c2d,#07131f)] px-6 py-14">
        <div className="mx-auto max-w-6xl">
          <Link href="/properties" prefetch={false} className="text-xs font-black uppercase tracking-[0.25em] text-teal-200 hover:text-white">← Back to properties</Link>
          <div className="mt-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-200/25 bg-teal-200/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-teal-100"><ScanLine className="h-4 w-4" /> Scan Studio</div>
              <h1 className="mt-5 max-w-4xl text-4xl font-black uppercase italic tracking-tighter md:text-6xl">Capture the home once. Reuse it everywhere.</h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">Create a private, consented capture session for a future 3D listing preview. Wi‑Fi carries the upload; it never grants Sunset Pulse access to the home network or other devices.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-5 text-sm text-slate-300"><div className="flex items-center gap-2 font-black uppercase tracking-widest text-teal-100"><Wifi className="h-4 w-4" /> Current connection</div><p className="mt-2 max-w-xs leading-6">Captures stay private until an agent approves the listing preview.</p></div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 py-10 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 md:p-8">
          <div className="mb-7 flex items-center gap-3"><ShieldCheck className="h-6 w-6 text-teal-200" /><div><h2 className="text-xl font-black uppercase tracking-tight">Start a private session</h2><p className="text-sm text-slate-400">The owner or authorized agent must initiate it.</p></div></div>
          <label className="block text-xs font-black uppercase tracking-[0.18em] text-slate-400">Property address<input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="1612 Fair Oaks Drive, Westlake, TX" className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-base font-normal normal-case tracking-normal text-white outline-none focus:border-teal-200/70" /></label>
          <label className="mt-5 block text-xs font-black uppercase tracking-[0.18em] text-slate-400">Listing ID <span className="font-normal normal-case tracking-normal">(optional)</span><input value={listingId} onChange={(event) => setListingId(event.target.value)} placeholder="MLS or internal property ID" className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-base font-normal normal-case tracking-normal text-white outline-none focus:border-teal-200/70" /></label>
          <div className="mt-6"><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Capture method</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{supportedPropertyScanModes.map((scanMode) => <button key={scanMode} type="button" onClick={() => setMode(scanMode)} className={`rounded-2xl border p-4 text-left transition ${mode === scanMode ? 'border-teal-200/70 bg-teal-200/15' : 'border-white/10 bg-slate-950/40 hover:border-white/25'}`}><span className="block text-sm font-black text-white">{scanModeCopy[scanMode].label}</span><span className="mt-2 block text-xs leading-5 text-slate-400">{scanModeCopy[scanMode].detail}</span></button>)}</div><p className="mt-3 text-xs leading-5 text-slate-500">LiDAR capture is not enabled yet. Existing LiDAR records remain readable, but new sessions currently use photo or video capture.</p></div>
          <div className="mt-6 space-y-3 rounded-2xl border border-amber-200/20 bg-amber-200/[0.06] p-4"><Consent checked={ownerAuthorized} onChange={setOwnerAuthorized}>I own this property or have authorization to capture its interior.</Consent><Consent checked={interiorAcknowledged} onChange={setInteriorAcknowledged}>I understand captures may include personal belongings and will review them before public use.</Consent></div>
          <button type="button" onClick={() => void createSession()} disabled={busy || !address.trim() || !ownerAuthorized || !interiorAcknowledged} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-teal-200 px-5 text-sm font-black uppercase tracking-widest text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"><LockKeyhole className="h-4 w-4" />{busy ? 'Creating session…' : 'Create secure capture session'}</button>
          {message && <p className="mt-4 text-sm leading-6 text-teal-100">{message}</p>}
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-6"><div className="flex items-center gap-3"><Camera className="h-5 w-5 text-teal-200" /><h2 className="font-black uppercase tracking-tight">Capture checklist</h2></div><ul className="mt-5 space-y-3">{selectedMode.instructions.map((instruction) => <li key={instruction} className="flex gap-3 text-sm leading-6 text-slate-300"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-teal-200" />{instruction}</li>)}</ul></div>
          {sessionLoading ? <div className="rounded-3xl border border-dashed border-white/15 p-6 text-sm text-slate-400">Loading saved sessions…</div> : sessions.length > 0 && <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6"><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Saved private sessions</p><div className="mt-3 space-y-2">{sessions.map((saved) => <button key={saved.scanId} type="button" onClick={() => resumeSession(saved)} className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left text-sm transition ${session?.scanId === saved.scanId ? 'border-teal-200/60 bg-teal-200/10' : 'border-white/10 bg-slate-950/40 hover:border-white/25'}`}><span className="min-w-0"><span className="block truncate font-bold text-slate-200">{saved.propertyAddress}</span><span className="mt-1 block text-xs text-slate-500">{saved.status.replace('_', ' ')} · {saved.assets.length} capture{saved.assets.length === 1 ? '' : 's'}</span></span><span className="shrink-0 text-xs font-black uppercase tracking-widest text-teal-200">Resume</span></button>)}</div></div>}
          {session ? <div className="rounded-3xl border border-teal-200/20 bg-teal-200/[0.06] p-6"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.25em] text-teal-200">Session {session.scanId.slice(-8)}</p><h2 className="mt-2 text-xl font-black uppercase">{session.status.replace('_', ' ')}</h2><p className="mt-1 text-xs text-slate-400">{session.propertyAddress}</p></div><CloudUpload className="h-7 w-7 text-teal-200" /></div><div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={cameraOn ? stopCamera : () => void startCamera()} disabled={busy} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-widest hover:border-teal-200/60 disabled:opacity-50"> <Camera className="h-4 w-4" />{cameraOn ? 'Stop camera' : 'Preview camera'}</button><label className={`inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-950 hover:bg-teal-100 ${busy ? 'pointer-events-none opacity-50' : ''}`}><Upload className="h-4 w-4" />Upload captures<input ref={fileInputRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" capture="environment" multiple disabled={busy} onChange={(event) => void uploadCaptures(event.target.files)} /></label></div><video ref={videoRef} autoPlay muted playsInline hidden={!cameraOn} className="mt-5 aspect-video w-full rounded-2xl border border-white/10 bg-black object-cover" />{uploads.length > 0 && <div className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4"><p className="text-xs font-black uppercase tracking-widest text-slate-300">Upload outcomes</p>{uploads.map((item) => <div key={item.id} className="rounded-xl border border-white/10 p-3"><div className="flex items-center justify-between gap-3 text-xs"><span className="min-w-0 truncate font-bold text-slate-200">{item.file.name}</span><span className={item.status === 'complete' ? 'text-teal-200' : item.status === 'failed' ? 'text-rose-200' : 'text-slate-400'}>{item.status}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-teal-200 transition-all" style={{ width: `${item.progress}%` }} /></div><div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-slate-400"><span className="truncate">{item.message || `${item.progress}%`}</span>{['reserving', 'uploading', 'finalizing'].includes(item.status) ? <button type="button" onClick={() => cancelUpload(item.id)} className="shrink-0 font-black uppercase tracking-widest text-amber-200">Cancel</button> : ['failed', 'cancelled'].includes(item.status) ? <button type="button" onClick={() => void retryUpload(item.id)} disabled={busy} className="shrink-0 font-black uppercase tracking-widest text-teal-200 disabled:opacity-50">Retry</button> : null}</div></div>)}</div>}{session.assets.length > 0 && <p className="mt-5 text-sm text-teal-100">{session.assets.length} private capture{session.assets.length === 1 ? '' : 's'} ready for agent review.</p>}<div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/40 p-4"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-300"><ShieldCheck className="h-4 w-4 text-teal-200" /> Reviewer access</div><p className="mt-2 text-xs leading-5 text-slate-400">Grant access only to people who should inspect this private capture. Use their account user IDs, separated by commas. Clearing the field revokes explicit assignments.</p><label className="mt-4 block text-xs font-bold text-slate-300" htmlFor="reviewer-ids">Reviewer user IDs</label><input id="reviewer-ids" value={reviewerDraft} onChange={(event) => setReviewerDraft(event.target.value)} placeholder="user-id-1, user-id-2" className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none focus:border-teal-200/60" /><button type="button" onClick={() => void saveReviewers()} disabled={reviewerBusy} className="mt-3 inline-flex items-center gap-2 rounded-full border border-teal-200/30 px-4 py-2 text-xs font-black uppercase tracking-widest text-teal-100 hover:bg-teal-200/10 disabled:opacity-50">{reviewerBusy ? 'Saving…' : 'Save reviewer access'}</button></div></div> : <div className="rounded-3xl border border-dashed border-white/15 p-6 text-sm leading-7 text-slate-400">Create or resume a session to unlock camera preview and private upload. No capture is sent before you approve the consent checkboxes.</div>}
        </div>
      </section>
    </main>
  );
}

function Consent({ checked, onChange, children }: { checked: boolean; onChange: (value: boolean) => void; children: ReactNode }) {
  return <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-slate-200"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-4 w-4 accent-teal-200" />{children}</label>;
}

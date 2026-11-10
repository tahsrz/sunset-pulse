'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useComposerRuntime } from '@assistant-ui/react';
import { useJamieAudio } from '@/context/JamieAudioContext';

export function JamieVoiceDraftReview() {
  const audio = useJamieAudio();
  const composer = useComposerRuntime();
  const ownerToken = useRef<string | null>(null);
  const baselineSequence = useRef(0);
  const seenSegmentIds = useRef(new Set<string>());
  const [reviewing, setReviewing] = useState(false);
  const [draft, setDraft] = useState('');
  const [capturedText, setCapturedText] = useState('');
  const releaseWorkspaceOwnership = audio.releaseWorkspaceOwnership;
  const active = ['listening', 'speech-detected', 'starting', 'permission-required', 'jamie-speaking'].includes(audio.status);

  useEffect(() => () => {
    if (ownerToken.current) releaseWorkspaceOwnership(ownerToken.current);
  }, [releaseWorkspaceOwnership]);

  useEffect(() => {
    if (!ownerToken.current || !active) return;
    const freshSegments = audio.finalizedSegments.filter((segment) => {
      const sequence = segment.sequence || 0;
      if (sequence <= baselineSequence.current || seenSegmentIds.current.has(segment.id)) return false;
      seenSegmentIds.current.add(segment.id);
      return true;
    }).map((segment) => segment.text.trim()).filter(Boolean);
    if (freshSegments.length) setCapturedText((current) => [current, ...freshSegments].filter(Boolean).join(' '));
  }, [active, audio.finalizedSegments]);

  const startCapture = async () => {
    baselineSequence.current = Math.max(0, ...audio.finalizedSegments.map((segment) => segment.sequence || 0));
    seenSegmentIds.current.clear();
    setCapturedText('');
    setDraft('');
    setReviewing(false);
    if (!ownerToken.current) ownerToken.current = audio.acquireWorkspaceOwnership();
    await audio.start();
  };

  const addTranscript = () => {
    const current = composer.getState().text.trim();
    composer.setText([current, draft.trim()].filter(Boolean).join('\n\n'));
    setDraft('');
    setReviewing(false);
  };

  return <div className="col-span-full rounded-xl border border-white/10 bg-slate-950/70 p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs text-slate-300">Voice notes stay on this screen until you review and add them to your message.</p>
      {active
        ? <button type="button" onClick={audio.stop} className="min-h-11 rounded-lg border border-white/20 px-3 text-xs font-semibold text-white">Stop microphone</button>
        : <button type="button" onClick={() => void startCapture()} className="min-h-11 rounded-lg bg-cyan-200 px-3 text-xs font-bold text-slate-950">Start voice note</button>}
    </div>
    {audio.status === 'denied' ? <p role="status" className="mt-2 text-xs text-amber-100">Microphone access was denied. You can type your note instead.</p> : null}
    {audio.status === 'unavailable' ? <p role="status" className="mt-2 text-xs text-amber-100">Speech recognition is unavailable in this browser. You can type your note instead.</p> : null}
    {active ? <p aria-live="polite" className="mt-2 text-xs text-cyan-100">{audio.interimCaption || 'Listening. Stop the microphone when you are done.'}</p> : null}
    {!reviewing && capturedText ? <button type="button" className="mt-2 min-h-11 text-sm text-cyan-200 underline" onClick={() => { setDraft(capturedText); setReviewing(true); }}>Review transcript</button> : null}
    {reviewing ? <div className="mt-3 space-y-2"><label className="block text-xs text-slate-300">Review and edit the transcript<textarea className="mt-1 min-h-24 w-full rounded-lg border border-white/15 bg-slate-900 p-3 text-sm text-white" maxLength={4000} value={draft} onChange={(event) => setDraft(event.target.value)} /></label><button type="button" disabled={!draft.trim()} onClick={addTranscript} className="min-h-11 rounded-lg bg-cyan-200 px-3 text-xs font-bold text-slate-950 disabled:opacity-50">Add to message draft</button></div> : null}
  </div>;
}

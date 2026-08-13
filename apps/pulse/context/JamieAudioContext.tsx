'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { useTheme } from '@/context/ThemeProvider';
import { TTS_END_EVENT, TTS_START_EVENT } from '@/lib/core/tts';

export type JamieAudioStatus = 'off' | 'permission-required' | 'starting' | 'listening' | 'speech-detected' | 'submitting' | 'jamie-speaking' | 'paused' | 'denied' | 'unavailable';
type TranscriptSegment = { id: string; text: string; capturedAt: number; final: boolean };
type PendingQuery = { id: string; text: string; submitAt: number };
type SubmittedQuery = { id: string; text: string };

type AudioState = {
  status: JamieAudioStatus;
  caption: string;
  pendingQuery: PendingQuery | null;
  submittedQuery: SubmittedQuery | null;
};

type AudioAction =
  | { type: 'STATUS'; status: JamieAudioStatus }
  | { type: 'CAPTION'; caption: string }
  | { type: 'QUEUE_QUERY'; query: PendingQuery }
  | { type: 'CANCEL_QUERY' }
  | { type: 'SUBMIT_QUERY' }
  | { type: 'CONSUME_QUERY'; id: string };

type SpeechRecognitionEventLike = Event & {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

type SpeechRecognitionErrorEventLike = Event & {
  error: 'aborted' | 'audio-capture' | 'bad-grammar' | 'language-not-supported' | 'network' | 'no-speech' | 'not-allowed' | 'service-not-allowed';
};

type SpeechRecognitionLike = EventTarget & {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
};

type JamieAudioContextValue = AudioState & {
  start: () => Promise<void>;
  stop: () => void;
  cancelPendingQuery: () => void;
  consumeSubmittedQuery: (id: string) => void;
};

const WINDOW_MS = 30_000;
const QUERY_REVIEW_MS = 2_000;
const WAKE_PHRASE = /\bpull that up\b/gi;
const JamieAudioContext = createContext<JamieAudioContextValue | null>(null);

export const initialJamieAudioState: AudioState = {
  status: 'off',
  caption: '',
  pendingQuery: null,
  submittedQuery: null,
};

export function jamieAudioReducer(state: AudioState, action: AudioAction): AudioState {
  switch (action.type) {
    case 'STATUS': return state.status === action.status ? state : { ...state, status: action.status };
    case 'CAPTION': return { ...state, caption: action.caption };
    case 'QUEUE_QUERY': return { ...state, status: 'submitting', pendingQuery: action.query, caption: `Ready to search: ${action.query.text}` };
    case 'CANCEL_QUERY': return { ...state, status: 'listening', pendingQuery: null, caption: 'Search cancelled.' };
    case 'SUBMIT_QUERY':
      if (!state.pendingQuery) return state;
      return {
        ...state,
        status: 'listening',
        caption: `Pulling up: ${state.pendingQuery.text}`,
        submittedQuery: { id: state.pendingQuery.id, text: state.pendingQuery.text },
        pendingQuery: null,
      };
    case 'CONSUME_QUERY':
      return state.submittedQuery?.id === action.id ? { ...state, submittedQuery: null } : state;
    default: return state;
  }
}

export function recentTranscript(segments: TranscriptSegment[], now = Date.now()) {
  return segments
    .filter((segment) => now - segment.capturedAt <= WINDOW_MS)
    .map((segment) => segment.text.replace(WAKE_PHRASE, '').trim())
    .filter(Boolean)
    .join(' ')
    .trim();
}

export function JamieAudioProvider({ children }: { children: React.ReactNode }) {
  const { isWakeListeningEnabled } = useTheme();
  const [state, dispatch] = useReducer(jamieAudioReducer, initialJamieAudioState);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const segmentsRef = useRef<TranscriptSegment[]>([]);
  const interimRef = useRef('');
  const enabledRef = useRef(isWakeListeningEnabled);
  const activeRef = useRef(false);
  const startInFlightRef = useRef(false);
  const pausedForTtsRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);
  const captionHoldUntilRef = useRef(0);

  useEffect(() => { enabledRef.current = isWakeListeningEnabled; }, [isWakeListeningEnabled]);

  const refreshCaption = useCallback((now = Date.now()) => {
    if (now < captionHoldUntilRef.current) return;
    const finalText = recentTranscript(segmentsRef.current, now);
    dispatch({ type: 'CAPTION', caption: [finalText, interimRef.current].filter(Boolean).join(' ').trim() });
  }, []);

  const beginRecognition = useCallback((delay = 0) => {
    if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current);
    restartTimerRef.current = window.setTimeout(() => {
      restartTimerRef.current = null;
      if (!enabledRef.current || pausedForTtsRef.current || activeRef.current || !recognitionRef.current) return;
      try {
        recognitionRef.current.start();
        activeRef.current = true;
        dispatch({ type: 'STATUS', status: 'listening' });
      } catch {
        activeRef.current = false;
        // Browser speech recognition can reject a restart while it is still
        // closing the previous session. Keep the active state stable and retry.
        beginRecognition(1_000);
      }
    }, delay);
  }, []);

  const stop = useCallback(() => {
    enabledRef.current = false;
    if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current);
    restartTimerRef.current = null;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    activeRef.current = false;
    dispatch({ type: 'STATUS', status: 'off' });
  }, []);

  const start = useCallback(async () => {
    if (typeof window === 'undefined' || activeRef.current || startInFlightRef.current) return;
    if (recognitionRef.current) {
      enabledRef.current = true;
      beginRecognition();
      return;
    }

    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition || !navigator.mediaDevices?.getUserMedia) {
      dispatch({ type: 'STATUS', status: 'unavailable' });
      return;
    }

    dispatch({ type: 'STATUS', status: 'permission-required' });
    startInFlightRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      stream.getTracks().forEach((track) => track.stop());
      enabledRef.current = true;
      dispatch({ type: 'STATUS', status: 'starting' });

      const recognition = new Recognition() as SpeechRecognitionLike;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.onresult = (event) => {
        const interimParts: string[] = [];
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const text = result[0]?.transcript?.trim();
          if (!text) continue;
          if (!result.isFinal) {
            interimParts.push(text);
            continue;
          }

          const now = Date.now();
          segmentsRef.current = [...segmentsRef.current, { id: crypto.randomUUID(), text, capturedAt: now, final: true }]
            .filter((segment) => now - segment.capturedAt <= WINDOW_MS);
          if (/\bpull that up\b/i.test(text)) {
            const queryText = recentTranscript(segmentsRef.current, now);
            if (queryText) {
              captionHoldUntilRef.current = now + QUERY_REVIEW_MS + 4_000;
              dispatch({ type: 'QUEUE_QUERY', query: { id: crypto.randomUUID(), text: queryText, submitAt: now + QUERY_REVIEW_MS } });
            }
            segmentsRef.current = [];
            interimRef.current = '';
          }
        }
        interimRef.current = interimParts.join(' ').trim();
        if (interimRef.current) dispatch({ type: 'STATUS', status: 'speech-detected' });
        refreshCaption();
      };
      recognition.onerror = (event) => {
        activeRef.current = false;
        if (pausedForTtsRef.current || event.error === 'aborted' || event.error === 'no-speech') {
          if (enabledRef.current && !pausedForTtsRef.current) {
            beginRecognition(750);
          }
          return;
        }
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          enabledRef.current = false;
          recognitionRef.current = null;
          dispatch({ type: 'STATUS', status: 'denied' });
        } else if (event.error === 'audio-capture' || event.error === 'language-not-supported') {
          enabledRef.current = false;
          recognitionRef.current = null;
          dispatch({ type: 'STATUS', status: 'unavailable' });
        }
      };
      recognition.onend = () => {
        activeRef.current = false;
        if (enabledRef.current && !pausedForTtsRef.current) {
          beginRecognition(750);
        }
      };
      recognitionRef.current = recognition;
      beginRecognition();
    } catch {
      enabledRef.current = false;
      dispatch({ type: 'STATUS', status: 'denied' });
    } finally {
      startInFlightRef.current = false;
    }
  }, [beginRecognition, refreshCaption]);

  useEffect(() => {
    if (!isWakeListeningEnabled && state.status !== 'off') stop();
    else if (state.status === 'off') void start();
  }, [isWakeListeningEnabled, start, state.status, stop]);

  useEffect(() => {
    if (!state.pendingQuery) return;
    const delay = Math.max(0, state.pendingQuery.submitAt - Date.now());
    const timer = window.setTimeout(() => dispatch({ type: 'SUBMIT_QUERY' }), delay);
    return () => window.clearTimeout(timer);
  }, [state.pendingQuery]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      segmentsRef.current = segmentsRef.current.filter((segment) => now - segment.capturedAt <= WINDOW_MS);
      refreshCaption(now);
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [refreshCaption]);

  useEffect(() => {
    const pauseForTts = () => {
      pausedForTtsRef.current = true;
      recognitionRef.current?.stop();
      activeRef.current = false;
      if (enabledRef.current) dispatch({ type: 'STATUS', status: 'jamie-speaking' });
    };
    const resumeAfterTts = () => {
      pausedForTtsRef.current = false;
      if (enabledRef.current && recognitionRef.current) beginRecognition(250);
    };
    window.addEventListener(TTS_START_EVENT, pauseForTts);
    window.addEventListener(TTS_END_EVENT, resumeAfterTts);
    return () => {
      window.removeEventListener(TTS_START_EVENT, pauseForTts);
      window.removeEventListener(TTS_END_EVENT, resumeAfterTts);
      if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current);
      recognitionRef.current?.stop();
    };
  }, [beginRecognition]);

  const value = useMemo<JamieAudioContextValue>(() => ({
    ...state,
    start,
    stop,
    cancelPendingQuery: () => dispatch({ type: 'CANCEL_QUERY' }),
    consumeSubmittedQuery: (id) => dispatch({ type: 'CONSUME_QUERY', id }),
  }), [start, state, stop]);

  return <JamieAudioContext.Provider value={value}>{children}</JamieAudioContext.Provider>;
}

export function useJamieAudio() {
  const context = useContext(JamieAudioContext);
  if (!context) throw new Error('useJamieAudio must be used within JamieAudioProvider');
  return context;
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { TTS_END_EVENT, TTS_START_EVENT } from '@/lib/core/tts';

type TranscriptSegment = { text: string; capturedAt: number };

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

const WINDOW_MS = 30_000;
const WAKE_PHRASE = /\bpull that up\b/i;

export function recentTranscript(segments: TranscriptSegment[], now = Date.now()) {
  return segments
    .filter((segment) => now - segment.capturedAt <= WINDOW_MS)
    .map((segment) => segment.text.replace(WAKE_PHRASE, '').trim())
    .filter(Boolean)
    .join(' ')
    .trim();
}

export function useJamieWakeListening(
  enabled: boolean,
  onQuery: (query: string) => void,
) {
  const [status, setStatus] = useState<'off' | 'requesting' | 'listening' | 'paused' | 'unsupported' | 'denied'>('off');
  const [caption, setCaption] = useState('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const segmentsRef = useRef<TranscriptSegment[]>([]);
  const callbackRef = useRef(onQuery);
  const enabledRef = useRef(enabled);
  const lastTriggerRef = useRef(0);
  const pausedForTtsRef = useRef(false);
  const interimRef = useRef('');
  const captionHoldUntilRef = useRef(0);
  const activeRef = useRef(false);
  const startInFlightRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);

  const refreshCaption = useCallback((now = Date.now()) => {
    if (now < captionHoldUntilRef.current) return;
    const finalText = recentTranscript(segmentsRef.current, now);
    setCaption([finalText, interimRef.current].filter(Boolean).join(' ').trim());
  }, []);

  useEffect(() => { callbackRef.current = onQuery; }, [onQuery]);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  const beginRecognition = useCallback((delay = 0) => {
    if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current);
    restartTimerRef.current = window.setTimeout(() => {
      restartTimerRef.current = null;
      if (!enabledRef.current || pausedForTtsRef.current || activeRef.current || !recognitionRef.current) return;
      try {
        recognitionRef.current.start();
        activeRef.current = true;
        setStatus('listening');
      } catch {
        activeRef.current = false;
        setStatus('off');
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
    setStatus('off');
  }, []);

  const start = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (activeRef.current || startInFlightRef.current) return;
    if (recognitionRef.current) {
      enabledRef.current = true;
      beginRecognition();
      return;
    }
    const SpeechRecognitionConstructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionConstructor || !navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported');
      return;
    }

    setStatus('requesting');
    startInFlightRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      enabledRef.current = true;

      const recognition = new SpeechRecognitionConstructor() as SpeechRecognitionLike;
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
          segmentsRef.current = [...segmentsRef.current, { text, capturedAt: now }]
            .filter((segment) => now - segment.capturedAt <= WINDOW_MS);

          if (WAKE_PHRASE.test(text) && now - lastTriggerRef.current > 3_000) {
            lastTriggerRef.current = now;
            const query = recentTranscript(segmentsRef.current, now);
            if (query) {
              captionHoldUntilRef.current = now + 4_000;
              setCaption(`Pulling up: ${query}`);
              callbackRef.current(query);
            }
            segmentsRef.current = [];
            interimRef.current = '';
            window.setTimeout(() => refreshCaption(), 4_000);
          }
        }
        interimRef.current = interimParts.join(' ').trim();
        if (!segmentsRef.current.some((segment) => WAKE_PHRASE.test(segment.text))) refreshCaption();
      };
      recognition.onerror = (event) => {
        activeRef.current = false;
        if (pausedForTtsRef.current || event.error === 'aborted' || event.error === 'no-speech') return;
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          enabledRef.current = false;
          recognitionRef.current = null;
          setStatus('denied');
          return;
        }
        if (event.error === 'audio-capture' || event.error === 'language-not-supported') {
          enabledRef.current = false;
          recognitionRef.current = null;
          setStatus('unsupported');
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
      setStatus('denied');
    } finally {
      startInFlightRef.current = false;
    }
  }, [beginRecognition, refreshCaption]);

  useEffect(() => {
    const pruneTimer = window.setInterval(() => {
      const now = Date.now();
      segmentsRef.current = segmentsRef.current.filter((segment) => now - segment.capturedAt <= WINDOW_MS);
      refreshCaption(now);
    }, 1_000);
    return () => window.clearInterval(pruneTimer);
  }, [refreshCaption]);

  useEffect(() => {
    const pauseForTts = () => {
      pausedForTtsRef.current = true;
      recognitionRef.current?.stop();
      activeRef.current = false;
      if (enabledRef.current) setStatus('paused');
    };
    const resumeAfterTts = () => {
      pausedForTtsRef.current = false;
      if (!enabledRef.current || !recognitionRef.current) return;
      beginRecognition(250);
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

  return { status, caption, start, stop };
}

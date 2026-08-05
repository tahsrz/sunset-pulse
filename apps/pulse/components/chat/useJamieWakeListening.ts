'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type TranscriptSegment = { text: string; capturedAt: number };

type SpeechRecognitionEventLike = Event & {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

type SpeechRecognitionLike = EventTarget & {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
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
  const [status, setStatus] = useState<'off' | 'requesting' | 'listening' | 'unsupported' | 'denied'>('off');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const segmentsRef = useRef<TranscriptSegment[]>([]);
  const callbackRef = useRef(onQuery);
  const enabledRef = useRef(enabled);
  const lastTriggerRef = useRef(0);

  useEffect(() => { callbackRef.current = onQuery; }, [onQuery]);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  const stop = useCallback(() => {
    enabledRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setStatus('off');
  }, []);

  const start = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognitionConstructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionConstructor || !navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported');
      return;
    }

    setStatus('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      enabledRef.current = true;

      const recognition = new SpeechRecognitionConstructor() as SpeechRecognitionLike;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.onresult = (event) => {
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          if (!result.isFinal) continue;
          const text = result[0]?.transcript?.trim();
          if (!text) continue;

          const now = Date.now();
          segmentsRef.current = [...segmentsRef.current, { text, capturedAt: now }]
            .filter((segment) => now - segment.capturedAt <= WINDOW_MS);

          if (WAKE_PHRASE.test(text) && now - lastTriggerRef.current > 3_000) {
            lastTriggerRef.current = now;
            const query = recentTranscript(segmentsRef.current, now);
            if (query) callbackRef.current(query);
            segmentsRef.current = [];
          }
        }
      };
      recognition.onerror = () => setStatus('denied');
      recognition.onend = () => {
        if (enabledRef.current) {
          try { recognition.start(); } catch { setStatus('off'); }
        }
      };
      recognitionRef.current = recognition;
      recognition.start();
      setStatus('listening');
    } catch {
      setStatus('denied');
    }
  }, []);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  return { status, start, stop };
}

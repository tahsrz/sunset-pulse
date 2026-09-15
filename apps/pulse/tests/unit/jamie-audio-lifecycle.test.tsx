import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let wakeListeningEnabled = false;
let pathname = '/';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

vi.mock('@/context/ThemeProvider', () => ({
  useTheme: () => ({ isWakeListeningEnabled: wakeListeningEnabled }),
}));

import { JamieAudioProvider, useJamieAudio } from '@/context/JamieAudioContext';
import { TTS_END_EVENT, TTS_START_EVENT } from '@/lib/core/tts';

class FakeSpeechRecognition extends EventTarget {
  static instance: FakeSpeechRecognition | null = null;
  continuous = false;
  interimResults = false;
  lang = '';
  start = vi.fn();
  stop = vi.fn();
  onresult: ((event: any) => void) | null = null;
  onend: (() => void) | null = null;
  onerror = null;

  constructor() {
    super();
    FakeSpeechRecognition.instance = this;
  }
}

let probeAudio: ReturnType<typeof useJamieAudio> | null = null;
function WorkspaceProbe() {
  const audio = useJamieAudio();
  useEffect(() => {
    const token = audio.acquireWorkspaceOwnership();
    return () => audio.releaseWorkspaceOwnership(token);
  }, [audio.acquireWorkspaceOwnership, audio.releaseWorkspaceOwnership]);
  probeAudio = audio;
  return null;
}

describe('Jamie audio lifecycle', () => {
  const stopTrack = vi.fn();
  const getUserMedia = vi.fn(async () => ({
    getTracks: () => [{ stop: stopTrack }],
  }));

  beforeEach(() => {
    vi.clearAllMocks();
    wakeListeningEnabled = false;
    pathname = '/';
    FakeSpeechRecognition.instance = null;
    probeAudio = null;
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      configurable: true,
      value: FakeSpeechRecognition,
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    });
  });

  it('does not acquire the microphone when wake listening is disabled', async () => {
    render(<JamieAudioProvider><div /></JamieAudioProvider>);
    await act(async () => Promise.resolve());
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it('retains one microphone lease across recognition restarts and releases it on teardown', async () => {
    wakeListeningEnabled = true;
    const view = render(<JamieAudioProvider><div /></JamieAudioProvider>);

    await waitFor(() => expect(FakeSpeechRecognition.instance?.start).toHaveBeenCalledTimes(1));
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(stopTrack).not.toHaveBeenCalled();

    act(() => FakeSpeechRecognition.instance?.onend?.());
    expect(stopTrack).not.toHaveBeenCalled();

    view.unmount();
    expect(stopTrack).toHaveBeenCalledTimes(1);
  });

  it('does not stop or reacquire recognition while Jamie speaks', async () => {
    wakeListeningEnabled = true;
    render(<JamieAudioProvider><div /></JamieAudioProvider>);
    await waitFor(() => expect(FakeSpeechRecognition.instance?.start).toHaveBeenCalledTimes(1));

    act(() => window.dispatchEvent(new CustomEvent(TTS_START_EVENT)));
    expect(FakeSpeechRecognition.instance?.stop).not.toHaveBeenCalled();
    expect(stopTrack).not.toHaveBeenCalled();

    act(() => window.dispatchEvent(new CustomEvent(TTS_END_EVENT)));
    expect(FakeSpeechRecognition.instance?.start).toHaveBeenCalledTimes(1);
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  it('invalidates stale recognition callbacks during teardown', async () => {
    wakeListeningEnabled = true;
    const view = render(<JamieAudioProvider><div /></JamieAudioProvider>);
    await waitFor(() => expect(FakeSpeechRecognition.instance?.start).toHaveBeenCalledTimes(1));
    const staleEnd = FakeSpeechRecognition.instance?.onend;

    view.unmount();
    act(() => staleEnd?.());

    expect(FakeSpeechRecognition.instance?.start).toHaveBeenCalledTimes(1);
    expect(stopTrack).toHaveBeenCalledTimes(1);
  });

  it('suppresses saved legacy listening on the workspace route before a child claims ownership', async () => {
    pathname = '/command-center';
    wakeListeningEnabled = true;
    render(<JamieAudioProvider><div /></JamieAudioProvider>);
    await act(async () => Promise.resolve());
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it('publishes one finalized segment to workspace ownership and suppresses the legacy wake query', async () => {
    const view = render(<JamieAudioProvider><WorkspaceProbe /></JamieAudioProvider>);
    await waitFor(() => expect(probeAudio?.workspaceOwned).toBe(true));
    await act(async () => { await probeAudio?.start(); });
    await waitFor(() => expect(FakeSpeechRecognition.instance?.start).toHaveBeenCalledTimes(1));
    const recognition = FakeSpeechRecognition.instance;
    const event = { resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'pull that up' } }] } as any;
    act(() => recognition?.onresult?.(event));
    act(() => recognition?.onresult?.(event));
    await waitFor(() => expect(probeAudio?.finalizedSegments).toHaveLength(1));
    expect(probeAudio?.submittedQuery).toBeNull();
    view.unmount();
    expect(stopTrack).toHaveBeenCalled();
  });

  it('accepts reset result indexes after restart and ignores old callbacks', async () => {
    render(<JamieAudioProvider><WorkspaceProbe /></JamieAudioProvider>);
    await act(async () => { await probeAudio?.start(); });
    await waitFor(() => expect(FakeSpeechRecognition.instance?.start).toHaveBeenCalledTimes(1));
    const recognition = FakeSpeechRecognition.instance!;
    const stale = recognition.onresult;
    const event = (text: string) => ({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: text } }] });
    act(() => recognition.onresult?.(event('first result')));
    act(() => recognition.onend?.());
    await waitFor(() => expect(recognition.start).toHaveBeenCalledTimes(2));
    act(() => stale?.(event('obsolete result')));
    act(() => recognition.onresult?.(event('second result')));
    expect(probeAudio?.finalizedSegments.map((segment) => segment.text)).toEqual(['first result', 'second result']);
    expect(probeAudio?.finalizedSegments.map((segment) => segment.sequence)).toEqual([1, 2]);
  });

  it('releases a late microphone permission result after stop', async () => {
    let resolveMedia!: (stream: { getTracks: () => { stop: typeof stopTrack }[] }) => void;
    getUserMedia.mockImplementationOnce(() => new Promise((resolve) => { resolveMedia = resolve; }));
    render(<JamieAudioProvider><WorkspaceProbe /></JamieAudioProvider>);
    let starting: Promise<void> | undefined;
    act(() => { starting = probeAudio?.start(); });
    act(() => probeAudio?.stop());
    await act(async () => { resolveMedia({ getTracks: () => [{ stop: stopTrack }] }); await starting; });
    expect(stopTrack).toHaveBeenCalledTimes(1);
    expect(FakeSpeechRecognition.instance).toBeNull();
    expect(probeAudio?.status).toBe('off');
  });
});

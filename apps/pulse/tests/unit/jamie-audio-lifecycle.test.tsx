import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let wakeListeningEnabled = false;

vi.mock('@/context/ThemeProvider', () => ({
  useTheme: () => ({ isWakeListeningEnabled: wakeListeningEnabled }),
}));

import { JamieAudioProvider } from '@/context/JamieAudioContext';

class FakeSpeechRecognition extends EventTarget {
  static instance: FakeSpeechRecognition | null = null;
  continuous = false;
  interimResults = false;
  lang = '';
  start = vi.fn();
  stop = vi.fn();
  onresult = null;
  onend: (() => void) | null = null;
  onerror = null;

  constructor() {
    super();
    FakeSpeechRecognition.instance = this;
  }
}

describe('Jamie audio lifecycle', () => {
  const stopTrack = vi.fn();
  const getUserMedia = vi.fn(async () => ({
    getTracks: () => [{ stop: stopTrack }],
  }));

  beforeEach(() => {
    vi.clearAllMocks();
    wakeListeningEnabled = false;
    FakeSpeechRecognition.instance = null;
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
});

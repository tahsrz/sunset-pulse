import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  audio: {
    status: 'off' as string,
    interimCaption: '',
    finalizedSegments: [] as Array<{ id: string; text: string; capturedAt: number; final: boolean; sequence: number }>,
    acquireWorkspaceOwnership: vi.fn(() => 'owner-token'),
    releaseWorkspaceOwnership: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  },
  composer: {
    getState: vi.fn(() => ({ text: 'Prepare notes' })),
    setText: vi.fn(),
    send: vi.fn(),
  },
}));

vi.mock('@/context/JamieAudioContext', () => ({ useJamieAudio: () => mocks.audio }));
vi.mock('@assistant-ui/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@assistant-ui/react')>()),
  useComposerRuntime: () => mocks.composer,
}));

import { JamieVoiceDraftReview } from '@/components/chat/JamieVoiceDraftReview';

afterEach(() => cleanup());
beforeEach(() => {
  mocks.audio.status = 'off';
  mocks.audio.interimCaption = '';
  mocks.audio.finalizedSegments = [];
  mocks.audio.acquireWorkspaceOwnership.mockClear();
  mocks.audio.releaseWorkspaceOwnership.mockClear();
  mocks.audio.start.mockClear();
  mocks.audio.stop.mockClear();
  mocks.composer.getState.mockReturnValue({ text: 'Prepare notes' });
  mocks.composer.setText.mockClear();
  mocks.composer.send.mockClear();
});

describe('Jamie seller voice draft review', () => {
  it('captures only after activation, preserves segments beyond the shared rolling window, and adds only reviewed text to the composer', () => {
    const view = render(<JamieVoiceDraftReview />);
    fireEvent.click(screen.getByRole('button', { name: 'Start voice note' }));
    expect(mocks.audio.acquireWorkspaceOwnership).toHaveBeenCalledOnce();
    expect(mocks.audio.start).toHaveBeenCalledOnce();

    mocks.audio.status = 'speech-detected';
    mocks.audio.finalizedSegments = [{ id: 'segment-1', text: 'Call about the offer', capturedAt: Date.now(), final: true, sequence: 1 }];
    view.rerender(<JamieVoiceDraftReview />);
    expect(screen.getByRole('button', { name: 'Review transcript' })).toBeInTheDocument();

    mocks.audio.finalizedSegments = [{ id: 'segment-2', text: 'and confirm the showing', capturedAt: Date.now(), final: true, sequence: 2 }];
    view.rerender(<JamieVoiceDraftReview />);
    fireEvent.click(screen.getByRole('button', { name: 'Review transcript' }));
    const transcript = screen.getByRole('textbox', { name: 'Review and edit the transcript' });
    expect(transcript).toHaveValue('Call about the offer and confirm the showing');

    fireEvent.change(transcript, { target: { value: 'Reviewed and corrected note' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add to message draft' }));
    expect(mocks.composer.setText).toHaveBeenCalledWith('Prepare notes\n\nReviewed and corrected note');
    expect(mocks.composer.send).not.toHaveBeenCalled();

    view.unmount();
    expect(mocks.audio.releaseWorkspaceOwnership).toHaveBeenCalledWith('owner-token');
  });
});

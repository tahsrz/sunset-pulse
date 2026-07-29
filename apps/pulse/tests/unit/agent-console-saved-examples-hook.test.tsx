import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  savedExamplesStorageKey,
  starterJobs,
  type CommandResponse,
  type SavedExample,
} from '../../components/agent-console/agentConsoleConfig';
import { trackAgentConsoleEvent } from '../../components/agent-console/agentConsoleEvents';
import { useAgentConsoleSavedExamples } from '../../components/agent-console/useAgentConsoleSavedExamples';

vi.mock('../../components/agent-console/agentConsoleEvents', () => ({
  trackAgentConsoleEvent: vi.fn(),
}));

const commandResponse: CommandResponse = {
  commandId: 'cmd_saved',
  worker: {
    id: 'follow-up-writer',
    name: 'Jamie Follow-Up Writer',
    role: 'Client follow-up',
  },
  result: {
    title: 'Follow-up',
    summary: 'A concise client follow-up.',
    actions: ['Send it today.'],
    confidence: 91,
    deliverable: {
      title: 'Oak Cliff follow-up',
      copyReadyText: 'Hi Morgan - want me to send easier commute options?',
      sourceSummary: 'Fixture',
    },
  },
};

const savedFollowUp: SavedExample = {
  id: 'saved-follow-up',
  jobId: 'lead-follow-up',
  title: 'Follow up',
  input: 'Lead note',
  output: 'Follow up output',
  createdAt: '2026-07-28T00:00:00.000Z',
};

const savedListing: SavedExample = {
  id: 'saved-listing',
  jobId: 'listing-copy',
  title: 'Listing copy',
  input: 'Listing facts',
  output: 'Listing output',
  createdAt: '2026-07-28T00:01:00.000Z',
};

describe('useAgentConsoleSavedExamples', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('restores saved examples and orders the current workflow first', async () => {
    localStorage.setItem(savedExamplesStorageKey, JSON.stringify([savedListing, savedFollowUp]));

    const { result } = renderHook(() => useAgentConsoleSavedExamples(starterJobs[0]));

    await waitFor(() => expect(result.current.savedExamples).toHaveLength(2));
    expect(result.current.selectedExamples).toEqual([savedFollowUp]);
    expect(result.current.exampleLibrary.map((example) => example.id)).toEqual([
      'saved-follow-up',
      'saved-listing',
    ]);
    expect(result.current.getSavedExampleCount('lead-follow-up')).toBe(1);
  });

  it('saves the current result and persists the example library', () => {
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'saved-new') });
    const onSaved = vi.fn();

    const { result } = renderHook(() => useAgentConsoleSavedExamples(starterJobs[0]));

    act(() => result.current.saveResultExample({
      currentInput: ' Buyer toured Oak Cliff. ',
      onSaved,
      result: commandResponse,
    }));

    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(result.current.savedExamples[0]).toEqual(expect.objectContaining({
      id: 'saved-new',
      input: 'Buyer toured Oak Cliff.',
      jobId: 'lead-follow-up',
      output: commandResponse.result.deliverable.copyReadyText,
      title: commandResponse.result.deliverable.title,
    }));
    expect(JSON.parse(localStorage.getItem(savedExamplesStorageKey) || '[]')).toHaveLength(1);
    expect(trackAgentConsoleEvent).toHaveBeenCalledWith(expect.objectContaining({
      commandId: commandResponse.commandId,
      event: 'result_saved',
      inputLength: 'Buyer toured Oak Cliff.'.length,
      resultLength: commandResponse.result.deliverable.copyReadyText.length,
    }));
  });

  it('loads, copies, and deletes saved examples with analytics', async () => {
    localStorage.setItem(savedExamplesStorageKey, JSON.stringify([savedFollowUp]));
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const { result } = renderHook(() => useAgentConsoleSavedExamples(starterJobs[0]));
    await waitFor(() => expect(result.current.savedExamples).toHaveLength(1));

    expect(result.current.loadSavedExample(savedFollowUp)).toEqual({
      input: savedFollowUp.input,
      jobId: savedFollowUp.jobId,
    });

    await act(async () => {
      await result.current.copySavedExample(savedFollowUp);
    });
    act(() => result.current.deleteSavedExample(savedFollowUp.id));

    expect(writeText).toHaveBeenCalledWith(savedFollowUp.output);
    expect(result.current.savedExamples).toEqual([]);
    expect(JSON.parse(localStorage.getItem(savedExamplesStorageKey) || '[]')).toEqual([]);
    expect(trackAgentConsoleEvent).toHaveBeenCalledWith(expect.objectContaining({
      event: 'saved_example_used',
      jobId: savedFollowUp.jobId,
    }));
    expect(trackAgentConsoleEvent).toHaveBeenCalledWith(expect.objectContaining({
      event: 'saved_example_copied',
      resultLength: savedFollowUp.output.length,
    }));
    expect(trackAgentConsoleEvent).toHaveBeenCalledWith(expect.objectContaining({
      event: 'saved_example_deleted',
      savedExampleCount: 0,
    }));
  });
});

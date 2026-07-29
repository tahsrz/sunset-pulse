import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  defaultPreferences,
  preferencesStorageKey,
  starterJobs,
} from '../../components/agent-console/agentConsoleConfig';
import { trackAgentConsoleEvent } from '../../components/agent-console/agentConsoleEvents';
import { useAgentConsolePreferences } from '../../components/agent-console/useAgentConsolePreferences';

vi.mock('../../components/agent-console/agentConsoleEvents', () => ({
  trackAgentConsoleEvent: vi.fn(),
}));

describe('useAgentConsolePreferences', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('restores saved preferences from local storage', async () => {
    localStorage.setItem(preferencesStorageKey, JSON.stringify({
      agentName: 'Taz',
      market: 'Denton',
      tone: 'Calm and advisory',
      cta: 'Offer a short call',
    }));

    const { result } = renderHook(() => useAgentConsolePreferences(starterJobs[0]));

    await waitFor(() => expect(result.current.preferences).toEqual({
      agentName: 'Taz',
      market: 'Denton',
      tone: 'Calm and advisory',
      cta: 'Offer a short call',
    }));
  });

  it('edits and saves normalized preferences with analytics', () => {
    const selectedJob = starterJobs[0];
    const { result } = renderHook(() => useAgentConsolePreferences(selectedJob));

    act(() => result.current.openPreferences());
    expect(result.current.preferencesOpen).toBe(true);

    act(() => {
      result.current.updatePreference('agentName', '  Taz  ');
      result.current.updatePreference('market', '  ');
      result.current.updatePreference('tone', 'Polished and concise');
      result.current.updatePreference('cta', 'Offer to send more detail');
    });
    act(() => result.current.savePreferences());

    expect(result.current.preferences).toEqual({
      ...defaultPreferences,
      agentName: 'Taz',
      tone: 'Polished and concise',
      cta: 'Offer to send more detail',
    });
    expect(result.current.preferencesOpen).toBe(false);
    expect(JSON.parse(localStorage.getItem(preferencesStorageKey) || '{}')).toEqual(result.current.preferences);
    expect(trackAgentConsoleEvent).toHaveBeenCalledWith({
      event: 'voice_saved',
      hasInput: true,
      jobId: selectedJob.id,
      workerId: selectedJob.workerId,
    });
  });
});

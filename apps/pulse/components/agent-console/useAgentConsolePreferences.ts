'use client';

import { useEffect, useState } from 'react';
import {
  defaultPreferences,
  preferencesStorageKey,
  type AgentPreferences,
  type StarterJob,
} from './agentConsoleConfig';
import { trackAgentConsoleEvent } from './agentConsoleEvents';
import {
  normalizePreferences,
  restoreAgentPreferences,
} from './agentConsoleStorage';

export function useAgentConsolePreferences(selectedJob: StarterJob) {
  const [preferences, setPreferences] = useState<AgentPreferences>(defaultPreferences);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  useEffect(() => {
    const restoredPreferences = restoreAgentPreferences(localStorage.getItem(preferencesStorageKey));
    if (restoredPreferences) {
      setPreferences(restoredPreferences);
    }
  }, []);

  const openPreferences = () => setPreferencesOpen(true);

  const updatePreference = (field: keyof AgentPreferences, value: string) => {
    setPreferences((current) => ({ ...current, [field]: value }));
  };

  const savePreferences = () => {
    const nextPreferences = normalizePreferences(preferences);
    setPreferences(nextPreferences);
    localStorage.setItem(preferencesStorageKey, JSON.stringify(nextPreferences));
    setPreferencesOpen(false);
    trackAgentConsoleEvent({
      event: 'voice_saved',
      hasInput: Boolean(nextPreferences.agentName || nextPreferences.market),
      jobId: selectedJob.id,
      workerId: selectedJob.workerId,
    });
  };

  return {
    openPreferences,
    preferences,
    preferencesOpen,
    savePreferences,
    updatePreference,
  };
}

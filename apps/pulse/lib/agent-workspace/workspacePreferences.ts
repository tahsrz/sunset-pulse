import type { AgentSession } from './types';
import { intelligenceWorkers } from '@/lib/command-center/workerRoster';

const VERSION = 1;
const PREFIX = 'sunset-praxis-agent-workspace';

export type StoredAgentPreference = Pick<AgentSession, 'id' | 'workerId' | 'label' | 'assignment'>;
type StoredPreferences = { version: 1; agents: StoredAgentPreference[] };

export function workspacePreferenceKey(accountId: string) { return `${PREFIX}:${accountId}`; }

export function parseWorkspacePreferences(value: string | null): StoredAgentPreference[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as StoredPreferences;
    if (parsed.version !== VERSION || !Array.isArray(parsed.agents)) return [];
    const seen = new Set<string>();
    return parsed.agents.filter((agent) => {
      if (!agent || typeof agent.id !== 'string' || !agent.id || agent.id.length > 100 || seen.has(agent.id) || !intelligenceWorkers.some((worker) => worker.id === agent.workerId) || typeof agent.label !== 'string' || !agent.label || agent.label.length > 120 || typeof agent.assignment !== 'string' || agent.assignment.length > 1000) return false;
      seen.add(agent.id);
      return true;
    }).slice(0, 3).map(({ id, workerId, label, assignment }) => ({ id, workerId, label, assignment }));
  } catch { return []; }
}

export function loadWorkspacePreferences(accountId: string) {
  if (typeof window === 'undefined' || accountId === 'anonymous') return [];
  try { return parseWorkspacePreferences(window.localStorage.getItem(workspacePreferenceKey(accountId))); } catch { return []; }
}

export function saveWorkspacePreferences(accountId: string, agents: AgentSession[]) {
  if (typeof window === 'undefined' || accountId === 'anonymous') return;
  const value: StoredPreferences = { version: VERSION, agents: agents.slice(0, 3).map(({ id, workerId, label, assignment }) => ({ id, workerId, label, assignment })) };
  try { window.localStorage.setItem(workspacePreferenceKey(accountId), JSON.stringify(value)); } catch { /* Storage may be disabled; retain the in-memory workspace. */ }
}

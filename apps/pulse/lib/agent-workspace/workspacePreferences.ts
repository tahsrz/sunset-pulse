import type { AgentSession } from './types';

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
    return parsed.agents.filter((agent) => agent && typeof agent.id === 'string' && typeof agent.workerId === 'string' && typeof agent.label === 'string' && typeof agent.assignment === 'string').slice(0, 3);
  } catch { return []; }
}

export function loadWorkspacePreferences(accountId: string) {
  if (typeof window === 'undefined' || accountId === 'anonymous') return [];
  return parseWorkspacePreferences(window.localStorage.getItem(workspacePreferenceKey(accountId)));
}

export function saveWorkspacePreferences(accountId: string, agents: AgentSession[]) {
  if (typeof window === 'undefined' || accountId === 'anonymous') return;
  const value: StoredPreferences = { version: VERSION, agents: agents.slice(0, 3).map(({ id, workerId, label, assignment }) => ({ id, workerId, label, assignment })) };
  window.localStorage.setItem(workspacePreferenceKey(accountId), JSON.stringify(value));
}


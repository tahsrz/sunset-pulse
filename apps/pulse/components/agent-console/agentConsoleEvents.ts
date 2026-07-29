import type { AgentConsoleEventName } from '@/lib/agent-console/telemetry';

type AgentConsoleEventPayload = {
  commandId?: string;
  durationMs?: number;
  event: AgentConsoleEventName;
  hasInput?: boolean;
  inputLength?: number;
  jobId?: string;
  resultLength?: number;
  savedExampleCount?: number;
  workerId?: string;
};

const sessionStorageKey = 'sunset_agent_console_session';

export function trackAgentConsoleEvent(payload: AgentConsoleEventPayload) {
  if (typeof window === 'undefined') return;

  const body = JSON.stringify({
    ...payload,
    sessionId: getAgentConsoleSessionId(),
  });

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon('/api/agent-console/events', blob)) return;
    }
  } catch {
    // Fall through to fetch.
  }

  void fetch('/api/agent-console/events', {
    body,
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    method: 'POST',
  }).catch(() => {
    // Telemetry must never block the agent workflow.
  });
}

function getAgentConsoleSessionId() {
  const existing = window.sessionStorage.getItem(sessionStorageKey);
  if (existing) return existing;

  const sessionId = crypto.randomUUID();
  window.sessionStorage.setItem(sessionStorageKey, sessionId);
  return sessionId;
}

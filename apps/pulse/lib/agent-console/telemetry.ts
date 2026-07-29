import 'server-only';

import { createHash } from 'node:crypto';
import { after } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const AGENT_CONSOLE_EVENT_NAMES = [
  'console_opened',
  'job_selected',
  'quick_start_loaded',
  'voice_saved',
  'example_loaded',
  'run_submitted',
  'run_completed',
  'run_failed',
  'result_copied',
  'result_saved',
  'saved_example_used',
  'saved_example_copied',
  'saved_example_deleted',
  'recent_output_used',
  'advanced_opened',
] as const;

export type AgentConsoleEventName = typeof AGENT_CONSOLE_EVENT_NAMES[number];

export type AgentConsoleTelemetryEvent = {
  commandId?: string;
  durationMs?: number;
  event: AgentConsoleEventName;
  hasInput?: boolean;
  inputLength?: number;
  jobId?: string;
  resultLength?: number;
  savedExampleCount?: number;
  sessionId?: string;
  source?: 'agent_console';
  workerId?: string;
};

export function scheduleAgentConsoleEvent(event: AgentConsoleTelemetryEvent) {
  try {
    after(() => recordAgentConsoleEvent(event));
  } catch {
    void recordAgentConsoleEvent(event);
  }
}

export async function recordAgentConsoleEvent(event: AgentConsoleTelemetryEvent) {
  const anonymousSession = event.sessionId ? hashAgentConsoleSessionId(event.sessionId) : 'anonymous';
  const normalized = normalizeAgentConsoleEvent(event);

  try {
    const { error } = await supabaseAdmin.rpc('log_intelligence_event', {
      p_type: `AGENT_CONSOLE_${normalized.event.toUpperCase()}`,
      p_description: `Agent Console conversion event: ${normalized.event}.`,
      p_actor_id: `agent-console:${anonymousSession}`,
      p_actor_name: 'Agent_Console_User',
      p_target_id: normalized.commandId || normalized.jobId || normalized.workerId || 'agent-console',
      p_metadata: {
        commandId: normalized.commandId || null,
        durationMs: normalized.durationMs,
        hasInput: Boolean(normalized.hasInput),
        inputLength: normalized.inputLength,
        jobId: normalized.jobId || null,
        resultLength: normalized.resultLength,
        savedExampleCount: normalized.savedExampleCount,
        source: normalized.source,
        workerId: normalized.workerId || null,
      },
      p_severity: normalized.event === 'run_failed' ? 'WARN' : 'INFO',
    });
    if (error) throw error;
  } catch (error) {
    console.warn('[AGENT_CONSOLE_TELEMETRY]', error);
  }
}

export function hashAgentConsoleSessionId(sessionId: string) {
  return createHash('sha256').update(sessionId).digest('hex').slice(0, 20);
}

function normalizeAgentConsoleEvent(event: AgentConsoleTelemetryEvent): Required<Pick<
  AgentConsoleTelemetryEvent,
  'durationMs' | 'event' | 'hasInput' | 'inputLength' | 'resultLength' | 'savedExampleCount' | 'source'
>> & Omit<AgentConsoleTelemetryEvent, 'durationMs' | 'hasInput' | 'inputLength' | 'resultLength' | 'savedExampleCount' | 'source'> {
  return {
    ...event,
    durationMs: clampNumber(event.durationMs, 120_000),
    hasInput: Boolean(event.hasInput),
    inputLength: clampNumber(event.inputLength, 20_000),
    resultLength: clampNumber(event.resultLength, 40_000),
    savedExampleCount: clampNumber(event.savedExampleCount, 100),
    source: 'agent_console',
  };
}

function clampNumber(value: unknown, max: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(max, Math.round(value)));
}

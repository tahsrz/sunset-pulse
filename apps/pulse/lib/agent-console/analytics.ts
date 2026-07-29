import 'server-only';

import { AGENT_CONSOLE_EVENT_NAMES } from '@/lib/agent-console/telemetry';
import { supabaseAdmin } from '@/lib/supabase';

const ANALYTICS_WINDOW_DAYS = 30;
const AGENT_CONSOLE_EVENT_TYPES = AGENT_CONSOLE_EVENT_NAMES.map((event) => `AGENT_CONSOLE_${event.toUpperCase()}`);

const FUNNEL_STAGES = [
  { id: 'opened', label: 'Console opened', eventTypes: ['AGENT_CONSOLE_CONSOLE_OPENED'] },
  { id: 'quickStart', label: 'Quick start loaded', eventTypes: ['AGENT_CONSOLE_QUICK_START_LOADED'] },
  { id: 'voice', label: 'Voice saved', eventTypes: ['AGENT_CONSOLE_VOICE_SAVED'] },
  { id: 'example', label: 'Example loaded', eventTypes: ['AGENT_CONSOLE_EXAMPLE_LOADED'] },
  { id: 'submitted', label: 'Run submitted', eventTypes: ['AGENT_CONSOLE_RUN_SUBMITTED'] },
  { id: 'completed', label: 'Run completed', eventTypes: ['AGENT_CONSOLE_RUN_COMPLETED'] },
  { id: 'reused', label: 'Copied or saved', eventTypes: ['AGENT_CONSOLE_RESULT_COPIED', 'AGENT_CONSOLE_RESULT_SAVED'] },
] as const;

const JOB_LABELS: Record<string, string> = {
  'agent-voice': 'Sound Like Me',
  'lead-follow-up': 'Follow Up',
  'listing-copy': 'Listing Copy',
  'objection-reply': 'Objection Reply',
  'property-summary': 'Property Summary',
};

export type AgentConsoleAnalyticsEvent = {
  id: string;
  event_type: string;
  actor_id: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type AgentConsoleConversionAnalytics = ReturnType<typeof buildAgentConsoleConversionAnalytics>;

export async function loadAgentConsoleConversionAnalytics(now = new Date()) {
  const since = new Date(now.getTime() - ANALYTICS_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const result = await supabaseAdmin
    .from('intelligence_events')
    .select('id, event_type, actor_id, target_id, metadata, created_at')
    .in('event_type', AGENT_CONSOLE_EVENT_TYPES)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(5000);

  if (result.error) {
    throw new Error(result.error.message || 'Agent Console analytics failed to load.');
  }

  return buildAgentConsoleConversionAnalytics((result.data || []) as AgentConsoleAnalyticsEvent[]);
}

export function buildAgentConsoleConversionAnalytics(events: AgentConsoleAnalyticsEvent[]) {
  const openedSessions = uniqueSessions(events, ['AGENT_CONSOLE_CONSOLE_OPENED']).size;
  const submittedSessions = uniqueSessions(events, ['AGENT_CONSOLE_RUN_SUBMITTED']).size;
  const completedSessions = uniqueSessions(events, ['AGENT_CONSOLE_RUN_COMPLETED']).size;
  const reusedSessions = uniqueSessions(events, ['AGENT_CONSOLE_RESULT_COPIED', 'AGENT_CONSOLE_RESULT_SAVED']).size;
  const failedSessions = uniqueSessions(events, ['AGENT_CONSOLE_RUN_FAILED']).size;

  const funnel = FUNNEL_STAGES.map((stage) => {
    const sessions = uniqueSessions(events, [...stage.eventTypes]).size;
    return {
      id: stage.id,
      label: stage.label,
      sessions,
      reachRate: openedSessions > 0 ? Math.round((sessions / openedSessions) * 100) : null,
    };
  });

  const jobs = new Map<string, {
    jobId: string;
    label: string;
    selectedSessions: Set<string>;
    submittedSessions: Set<string>;
    completedSessions: Set<string>;
    failedSessions: Set<string>;
    reusedSessions: Set<string>;
    latestAt: string;
  }>();

  for (const event of events) {
    const jobId = readJobId(event);
    if (!jobId) continue;

    const current = jobs.get(jobId) || {
      jobId,
      label: JOB_LABELS[jobId] || formatJobId(jobId),
      selectedSessions: new Set<string>(),
      submittedSessions: new Set<string>(),
      completedSessions: new Set<string>(),
      failedSessions: new Set<string>(),
      reusedSessions: new Set<string>(),
      latestAt: event.created_at,
    };

    const session = sessionKey(event);
    if (event.event_type === 'AGENT_CONSOLE_JOB_SELECTED') current.selectedSessions.add(session);
    if (event.event_type === 'AGENT_CONSOLE_RUN_SUBMITTED') current.submittedSessions.add(session);
    if (event.event_type === 'AGENT_CONSOLE_RUN_COMPLETED') current.completedSessions.add(session);
    if (event.event_type === 'AGENT_CONSOLE_RUN_FAILED') current.failedSessions.add(session);
    if (event.event_type === 'AGENT_CONSOLE_RESULT_COPIED' || event.event_type === 'AGENT_CONSOLE_RESULT_SAVED') {
      current.reusedSessions.add(session);
    }
    current.latestAt = current.latestAt > event.created_at ? current.latestAt : event.created_at;
    jobs.set(jobId, current);
  }

  return {
    windowDays: ANALYTICS_WINDOW_DAYS,
    funnel,
    openedSessions,
    submittedSessions,
    completedSessions,
    reusedSessions,
    failedSessions,
    completionRate: submittedSessions > 0 ? Math.round((completedSessions / submittedSessions) * 100) : null,
    conversionRate: openedSessions > 0 ? Math.round((completedSessions / openedSessions) * 100) : null,
    reuseRate: completedSessions > 0 ? Math.round((reusedSessions / completedSessions) * 100) : null,
    jobs: Array.from(jobs.values())
      .map((job) => ({
        jobId: job.jobId,
        label: job.label,
        selectedSessions: job.selectedSessions.size,
        submittedSessions: job.submittedSessions.size,
        completedSessions: job.completedSessions.size,
        failedSessions: job.failedSessions.size,
        reusedSessions: job.reusedSessions.size,
        latestAt: job.latestAt,
      }))
      .sort((left, right) => (
        right.submittedSessions - left.submittedSessions
        || right.selectedSessions - left.selectedSessions
        || right.latestAt.localeCompare(left.latestAt)
      ))
      .slice(0, 5),
  };
}

function uniqueSessions(events: AgentConsoleAnalyticsEvent[], eventTypes: string[]) {
  const accepted = new Set(eventTypes);
  return new Set(events.filter((event) => accepted.has(event.event_type)).map(sessionKey));
}

function sessionKey(event: AgentConsoleAnalyticsEvent) {
  return event.actor_id || `event:${event.id}`;
}

function readJobId(event: AgentConsoleAnalyticsEvent) {
  const value = event.metadata?.jobId || event.target_id;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function formatJobId(jobId: string) {
  return jobId
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

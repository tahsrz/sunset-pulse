import type { CommandProgressEvent, CommandResponse, RelayMode } from '@/lib/command-center/commandTypes';

export type TranscriptSegment = {
  sessionId: string;
  sequence: number;
  id: string;
  text: string;
  capturedAt: number;
  final: true;
};

export type AgentSource = 'manual' | 'automatic';
export type AgentRunState = 'queued' | 'running' | 'complete' | 'error' | 'cancelled';

export type AgentSession = {
  id: string;
  workerId: string;
  label: string;
  assignment: string;
  assignmentRevision: number;
  autoListenEnabled: boolean;
  spawnedAtSequence: number;
  draftText: string;
  draftDirty: boolean;
  draftRevision: number;
  transcriptCursor: number;
  removed?: boolean;
};

export type AgentRun = {
  id: string;
  agentId: string;
  triggerId?: string;
  source: AgentSource;
  submittedText: string;
  commandText: string;
  request?: Readonly<{ command: string; selectedWorkerId: string; relayMode: RelayMode; supervisor: boolean }>;
  transcriptSequence?: number;
  state: AgentRunState;
  progress: CommandProgressEvent[];
  response?: CommandResponse;
  error?: string;
  startedAt: number;
  finishedAt?: number;
};

export type AttentionDecision = {
  agentId: string;
  transcriptWindowId: string;
  assignmentRevision: number;
  action: 'ignore' | 'wait' | 'submit';
  reason: string;
  relevantSegmentIds: string[];
  mode: 'rules' | 'semantic';
};

export type WorkspaceState = {
  agentsById: Record<string, AgentSession>;
  agentOrder: string[];
  selectedAgentId: string | null;
  runsById: Record<string, AgentRun>;
  runOrder: string[];
  transcript: TranscriptSegment[];
  interimCaption: string;
  automationPaused: boolean;
  attentionByAgentId: Record<string, AttentionDecision>;
  notice: string | null;
};

export type CommandSubmission = {
  agentId: string;
  workerId?: string;
  text: string;
  source: AgentSource;
  triggerId?: string;
  transcript?: TranscriptSegment[];
  relayMode?: RelayMode;
  supervisor?: boolean;
  retryOfRunId?: string;
};

export type WorkspaceAction =
  | { type: 'SPAWN_AGENT'; agent: AgentSession }
  | { type: 'RESTORE_AGENTS'; agents: AgentSession[] }
  | { type: 'REMOVE_AGENT'; agentId: string }
  | { type: 'SELECT_AGENT'; agentId: string | null }
  | { type: 'SET_AUTO_LISTEN'; agentId: string; enabled: boolean }
  | { type: 'SET_AUTOMATION_PAUSED'; paused: boolean }
  | { type: 'SET_DRAFT'; agentId: string; text: string; dirty?: boolean }
  | { type: 'USE_RECENT_SPEECH'; agentId: string; text: string }
  | { type: 'ADVANCE_CURSOR'; agentId: string; sequence: number }
  | { type: 'SET_TRANSCRIPT'; segments: TranscriptSegment[]; interimCaption: string }
  | { type: 'RUN_STARTED'; run: AgentRun }
  | { type: 'RUN_PROGRESS'; runId: string; agentId: string; progress: CommandProgressEvent }
  | { type: 'RUN_COMPLETED'; runId: string; agentId: string; response: CommandResponse; finishedAt: number }
  | { type: 'RUN_FAILED'; runId: string; agentId: string; error: string; finishedAt: number }
  | { type: 'RUN_CANCELLED'; runId: string; agentId: string; finishedAt: number }
  | { type: 'RUN_REVIEWED'; runId: string; commandId: string; review: NonNullable<CommandResponse['trace']>['supervisorReview'] }
  | { type: 'SET_ATTENTION'; decision: AttentionDecision }
  | { type: 'SET_NOTICE'; notice: string | null };

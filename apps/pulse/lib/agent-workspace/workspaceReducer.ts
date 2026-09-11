import type { WorkspaceAction, WorkspaceState } from './types';

export const initialWorkspaceState: WorkspaceState = {
  agentsById: {},
  agentOrder: [],
  selectedAgentId: null,
  runsById: {},
  runOrder: [],
  transcript: [],
  interimCaption: '',
  automationPaused: false,
  attentionByAgentId: {},
  notice: null,
};

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'SPAWN_AGENT':
      return {
        ...state,
        agentsById: { ...state.agentsById, [action.agent.id]: action.agent },
        agentOrder: [...state.agentOrder, action.agent.id],
        selectedAgentId: state.selectedAgentId || action.agent.id,
        notice: null,
      };
    case 'RESTORE_AGENTS': {
      const agentsById = Object.fromEntries(action.agents.map((agent) => [agent.id, agent]));
      return { ...state, agentsById, agentOrder: action.agents.map((agent) => agent.id), selectedAgentId: action.agents[0]?.id || null };
    }
    case 'REMOVE_AGENT': {
      if (!state.agentsById[action.agentId]) return state;
      const { [action.agentId]: _removed, ...agentsById } = state.agentsById;
      const agentOrder = state.agentOrder.filter((id) => id !== action.agentId);
      return {
        ...state,
        agentsById,
        agentOrder,
        selectedAgentId: state.selectedAgentId === action.agentId ? (agentOrder[0] || null) : state.selectedAgentId,
        attentionByAgentId: Object.fromEntries(Object.entries(state.attentionByAgentId).filter(([id]) => id !== action.agentId)),
      };
    }
    case 'SELECT_AGENT': return { ...state, selectedAgentId: action.agentId };
    case 'SET_AUTO_LISTEN': {
      const agent = state.agentsById[action.agentId];
      if (!agent) return state;
      return { ...state, agentsById: { ...state.agentsById, [action.agentId]: { ...agent, autoListenEnabled: action.enabled } } };
    }
    case 'SET_AUTOMATION_PAUSED': return { ...state, automationPaused: action.paused };
    case 'SET_DRAFT': {
      const agent = state.agentsById[action.agentId];
      if (!agent) return state;
      return { ...state, agentsById: { ...state.agentsById, [action.agentId]: { ...agent, draftText: action.text, draftDirty: action.dirty ?? agent.draftDirty, draftRevision: agent.draftRevision + 1 } } };
    }
    case 'USE_RECENT_SPEECH': {
      const agent = state.agentsById[action.agentId];
      if (!agent) return state;
      return { ...state, agentsById: { ...state.agentsById, [action.agentId]: { ...agent, draftText: action.text, draftDirty: false, draftRevision: agent.draftRevision + 1 } } };
    }
    case 'ADVANCE_CURSOR': {
      const agent = state.agentsById[action.agentId];
      if (!agent) return state;
      return { ...state, agentsById: { ...state.agentsById, [action.agentId]: { ...agent, transcriptCursor: Math.max(agent.transcriptCursor, action.sequence) } } };
    }
    case 'SET_TRANSCRIPT': return { ...state, transcript: action.segments, interimCaption: action.interimCaption };
    case 'RUN_STARTED': {
      const agent = state.agentsById[action.run.agentId];
      return {
        ...state,
        runsById: { ...state.runsById, [action.run.id]: action.run },
        runOrder: [...state.runOrder, action.run.id],
        agentsById: agent ? { ...state.agentsById, [agent.id]: { ...agent, transcriptCursor: Math.max(agent.transcriptCursor, ...state.transcript.map((segment) => segment.sequence), agent.transcriptCursor) } } : state.agentsById,
      };
    }
    case 'RUN_PROGRESS': {
      const run = state.runsById[action.runId];
      if (!run || run.agentId !== action.agentId) return state;
      const progress = [...run.progress.filter((item) => item.id !== action.progress.id), action.progress];
      return { ...state, runsById: { ...state.runsById, [action.runId]: { ...run, state: 'running', progress } } };
    }
    case 'RUN_COMPLETED': {
      const run = state.runsById[action.runId];
      if (!run || run.agentId !== action.agentId) return state;
      return { ...state, runsById: { ...state.runsById, [action.runId]: { ...run, state: 'complete', response: action.response, finishedAt: action.finishedAt, progress: action.response.trace?.progress || run.progress } } };
    }
    case 'RUN_FAILED': {
      const run = state.runsById[action.runId];
      if (!run || run.agentId !== action.agentId) return state;
      return { ...state, runsById: { ...state.runsById, [action.runId]: { ...run, state: 'error', error: action.error, finishedAt: action.finishedAt } } };
    }
    case 'RUN_CANCELLED': {
      const run = state.runsById[action.runId];
      if (!run || run.agentId !== action.agentId) return state;
      return { ...state, runsById: { ...state.runsById, [action.runId]: { ...run, state: 'cancelled', finishedAt: action.finishedAt } } };
    }
    case 'SET_ATTENTION': return { ...state, attentionByAgentId: { ...state.attentionByAgentId, [action.decision.agentId]: action.decision } };
    case 'SET_NOTICE': return { ...state, notice: action.notice };
    default: return state;
  }
}

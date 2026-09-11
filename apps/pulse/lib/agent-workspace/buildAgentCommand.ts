import type { AgentSession, TranscriptSegment } from './types';
import { workspacePolicy } from './workspacePolicy';

export class AgentCommandLengthError extends Error {
  constructor() {
    super(`This request is too large. Keep the visible submission under ${workspacePolicy.commandMaxLength.toLocaleString()} characters.`);
    this.name = 'AgentCommandLengthError';
  }
}

export function buildAgentCommand({
  agent,
  text,
  transcript = [],
  history = [],
}: {
  agent: AgentSession;
  text: string;
  transcript?: TranscriptSegment[];
  history?: string[];
}) {
  if (!text.trim()) throw new Error('Enter text before submitting.');
  const context = [
    agent.assignment.trim() ? `Assignment:\n${agent.assignment.trim()}` : '',
    history.length ? `Recent agent context:\n${history.slice(-3).join('\n')}` : '',
    transcript.length ? `Recent finalized speech:\n${transcript.slice(-8).map((segment) => `- ${segment.text}`).join('\n')}` : '',
  ].filter(Boolean).join('\n\n').slice(0, workspacePolicy.commandContextMaxLength);
  const command = [
    `You are the ${agent.label} agent. Use the assigned worker and do not invent missing facts.`,
    context,
    `User submission (preserve the intent and exact facts):\n${text}`,
  ].filter(Boolean).join('\n\n');
  if (command.length > workspacePolicy.commandMaxLength) throw new AgentCommandLengthError();
  return command;
}


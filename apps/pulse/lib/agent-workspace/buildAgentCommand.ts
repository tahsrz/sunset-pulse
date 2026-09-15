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
  const required = [
    `You are the ${agent.label} agent. Use the assigned worker and do not invent missing facts.`,
    agent.assignment.trim() ? `Assignment:\n${agent.assignment.trim()}` : '',
  ].filter(Boolean).join('\n\n');
  const submission = `User submission (preserve the intent and exact facts):\n${text}`;
  const requiredLength = required.length + submission.length + 2;
  if (requiredLength > workspacePolicy.commandMaxLength) throw new AgentCommandLengthError();
  const optional = [
    history.length ? `Recent agent context:\n${history.slice(-3).join('\n')}` : '',
    transcript.length && transcript.map((segment) => segment.text).join(' ') !== text ? `Recent finalized speech:\n${transcript.slice(-8).map((segment) => `- ${segment.text}`).join('\n')}` : '',
  ].filter(Boolean).join('\n\n');
  const context = optional.slice(0, Math.max(0, Math.min(workspacePolicy.commandContextMaxLength, workspacePolicy.commandMaxLength - requiredLength - 2)));
  const command = [
    required,
    context,
    submission,
  ].filter(Boolean).join('\n\n');
  if (command.length > workspacePolicy.commandMaxLength) throw new AgentCommandLengthError();
  return command;
}

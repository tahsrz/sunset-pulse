import { runCommandCenterCommand, type CommandCenterResponse } from './commandRouter';
import type { TahRelayMode } from './relayTemplates';

export type JamieCommandBridgeResult = {
  context: string;
  command: CommandCenterResponse;
};

export function buildJamieCommandBridgeContext(
  command: string,
  options: {
    relayMode?: TahRelayMode;
    supervisor?: boolean;
  } = {}
): JamieCommandBridgeResult | null {
  try {
    const trimmed = command.trim();
    if (!trimmed) return null;

    const commandResult = runCommandCenterCommand({
      command: trimmed,
      relayMode: options.relayMode || 'briefing',
      supervisor: options.supervisor ?? true
    });

    return {
      command: commandResult,
      context: formatJamieCommandContext(commandResult)
    };
  } catch (error) {
    console.error('[JAMIE_COMMAND_BRIDGE] Helper context failed:', error);
    return null;
  }
}

function formatJamieCommandContext(result: CommandCenterResponse) {
  const files = result.tahFiles.slice(0, 4).join(', ');
  const actions = result.result.actions.slice(0, 3).map((action) => `- ${action}`).join('\n');
  const sources = result.trace.selectedShards
    .slice(0, 4)
    .map((shard) => {
      const reason = plainReason(shard.metrics?.matchReason || shard.source);
      const concepts = shard.concepts.slice(0, 3).join(', ');
      return `- ${shard.source}${concepts ? ` (${concepts})` : ''}: ${reason}`;
    })
    .join('\n');

  return [
    'Private helper note for Jamie. Use this silently as background, not as visible labels.',
    `Helper picked: ${result.worker.name}.`,
    `Why this helper fits: ${result.worker.role}`,
    `Files to lean on: ${files || 'none listed'}.`,
    `Plain summary: ${result.result.summary}`,
    actions ? `Useful next steps:\n${actions}` : '',
    sources ? `Files and saved notes found:\n${sources}` : '',
    result.trace.queryMemory?.saved ? 'This chat turn was saved locally for later context.' : 'This chat turn was not saved locally.'
  ].filter(Boolean).join('\n');
}

function plainReason(reason: string) {
  const normalized = reason.toLowerCase();
  if (normalized.includes('query memory')) return 'saved note';
  if (normalized.includes('virtual') || normalized.includes('loadout')) return 'helper file';
  if (normalized.includes('concept')) return 'word match';
  if (normalized.includes('policy')) return 'search match';
  return reason.replace(/[_-]+/g, ' ');
}

import { type CommandProgressEvent } from './agentConsoleConfig';

export function upsertProgressEvent(current: CommandProgressEvent[], next: CommandProgressEvent) {
  const index = current.findIndex((item) => item.id === next.id);
  if (index === -1) return [...current, next];

  const clone = current.slice();
  clone[index] = next;
  return clone;
}

export function formatProgressLabel(item: CommandProgressEvent) {
  const normalized = item.label.trim().toLowerCase();
  if (normalized === 'submitted') return 'Request received';
  if (normalized.includes('advisor') || normalized.includes('route')) return 'Choosing the right worker';
  if (normalized.includes('supervisor')) return 'Checking the answer';
  if (normalized.includes('complete')) return 'Answer ready';
  if (normalized.includes('error')) return 'Needs attention';
  return item.label;
}

export function formatProgressDetail(detail: string) {
  return detail.length > 90 ? `${detail.slice(0, 87)}...` : detail;
}

export function progressDotClass(status: CommandProgressEvent['status']) {
  if (status === 'complete') return 'bg-[#517268]';
  if (status === 'error') return 'bg-[#b94f35]';
  if (status === 'running') return 'bg-[#d8a647]';
  return 'bg-[#c9d3ca]';
}

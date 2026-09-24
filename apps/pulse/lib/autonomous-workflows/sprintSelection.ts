export type SprintBacklogCandidate = { id?: string; created_at?: string; title: string; description?: string; priority: number; estimate_minutes?: number | null };
export type SprintSelectionOptions = { maxItems?: number; capacityMinutes?: number; unknownEstimate?: 'exclude' | 'allow' };
export type SprintSelectionExclusion = { id?: string; title: string; reason: 'capacity' | 'unknown_estimate' | 'max_items' };
export type SprintSelectionReport<T> = { selected: T[]; usedMinutes: number; exclusions: SprintSelectionExclusion[] };

export function selectSprintBacklogReport<T extends SprintBacklogCandidate>(items: T[], options: number | SprintSelectionOptions = 10): SprintSelectionReport<T> {
  const { maxItems = typeof options === 'number' ? options : 10, capacityMinutes, unknownEstimate = 'exclude' } = typeof options === 'number' ? {} : options;
  let usedMinutes = 0;
  const selected: T[] = [];
  const exclusions: SprintSelectionExclusion[] = [];
  const sorted = [...items].sort((a, b) => a.priority - b.priority || (a.created_at || '').localeCompare(b.created_at || '') || (a.id || '').localeCompare(b.id || '') || a.title.localeCompare(b.title));
  for (const item of sorted) {
    if (selected.length >= Math.max(0, maxItems)) { exclusions.push({ id: item.id, title: item.title, reason: 'max_items' }); continue; }
    if (capacityMinutes === undefined) { selected.push(item); continue; }
    if (item.estimate_minutes == null) {
      if (unknownEstimate === 'allow') { selected.push(item); continue; }
      exclusions.push({ id: item.id, title: item.title, reason: 'unknown_estimate' }); continue;
    }
    if (usedMinutes + item.estimate_minutes > capacityMinutes) { exclusions.push({ id: item.id, title: item.title, reason: 'capacity' }); continue; }
    usedMinutes += item.estimate_minutes;
    selected.push(item);
  }
  return { selected, usedMinutes, exclusions };
}

export function selectSprintBacklog<T extends SprintBacklogCandidate>(items: T[], options: number | SprintSelectionOptions = 10) {
  return selectSprintBacklogReport(items, options).selected;
}

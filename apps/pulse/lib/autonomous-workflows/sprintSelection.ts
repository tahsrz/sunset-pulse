export type SprintBacklogCandidate = { title: string; description?: string; priority: number; estimate_minutes?: number | null };
export type SprintSelectionOptions = { maxItems?: number; capacityMinutes?: number };

export function selectSprintBacklog<T extends SprintBacklogCandidate>(items: T[], options: number | SprintSelectionOptions = 10) {
  const { maxItems = typeof options === 'number' ? options : 10, capacityMinutes } = typeof options === 'number' ? {} : options;
  let usedMinutes = 0;
  return [...items].sort((a, b) => a.priority - b.priority || a.title.localeCompare(b.title)).filter((item) => {
    if (capacityMinutes === undefined) return true;
    if (item.estimate_minutes == null || usedMinutes + item.estimate_minutes > capacityMinutes) return false;
    usedMinutes += item.estimate_minutes;
    return true;
  }).slice(0, Math.max(0, maxItems));
}

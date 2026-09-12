export type SprintBacklogCandidate = { title: string; description?: string; priority: number; estimate_minutes?: number | null };

export function selectSprintBacklog<T extends SprintBacklogCandidate>(items: T[], capacity = 10) {
  return [...items].sort((a, b) => a.priority - b.priority).slice(0, Math.max(0, capacity));
}

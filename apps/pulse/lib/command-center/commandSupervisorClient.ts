import { z } from 'zod';
import type { CommandResponse } from './commandTypes';

const ReviewSchema = z.object({
  status: z.enum(['queued', 'succeeded', 'failed', 'disabled', 'unavailable']),
  path: z.string(), reviewId: z.string().optional(),
  severity: z.enum(['info', 'warning', 'error']).optional(),
  findingCount: z.number().int().nonnegative().optional(), reason: z.string().optional(),
});
type Review = z.infer<typeof ReviewSchema>;

// Same explicit queue/process protocol as the classic arena; never execute
// action items while reviewing and never attach another command's review.
export async function requestCommandSupervisorReview(result: CommandResponse, command: string, onReview: (review: Review) => void, signal: AbortSignal) {
  try {
    if (!result.intent) throw new Error('No classified command intent');
    const response = await fetch('/api/commands/supervisor', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
      body: JSON.stringify({ commandId: result.commandId, command, workerId: result.worker.id, workerName: result.worker.name, intent: result.intent, summary: result.result.summary, selectedShards: (result.trace?.selectedShards || []).map(({ source, title, score }) => ({ source, title, score })) }),
    });
    if (!response.ok) throw new Error('Review unavailable');
    const queued = ReviewSchema.parse((await response.json()).trace);
    if (signal.aborted) return;
    onReview(queued);
    if (queued.status !== 'queued' || !queued.reviewId) return;
    const processed = await fetch('/api/commands/supervisor', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ limit: 5 }), signal });
    if (!processed.ok) throw new Error('Review processing unavailable');
    const body = z.object({ snapshot: z.object({ recent: z.array(z.object({ id: z.string(), status: ReviewSchema.shape.status, severity: ReviewSchema.shape.severity, findings: z.array(z.unknown()).optional() })) }) }).parse(await processed.json());
    const review = body.snapshot.recent.find((entry) => entry.id === queued.reviewId);
    if (!signal.aborted && review) onReview({ ...queued, status: review.status, severity: review.severity, findingCount: review.findings?.length });
  } catch {
    if (!signal.aborted) onReview({ status: 'unavailable', path: '/api/commands/supervisor', reason: 'Supervisor review unavailable. The command output remains available.' });
  }
}

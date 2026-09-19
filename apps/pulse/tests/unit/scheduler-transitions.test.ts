import { describe, expect, it } from 'vitest';
import { canCancelJob, canPauseSchedule, canResumeSchedule, canRetryJob } from '@/lib/autonomous-workflows/schedulerTransitions';

describe('shared scheduler transitions', () => {
  it('only cancels queued or running jobs', () => {
    expect(canCancelJob('queued')).toBe(true);
    expect(canCancelJob('running')).toBe(true);
    expect(canCancelJob('sent' as never)).toBe(false);
    expect(canCancelJob('completed')).toBe(false);
  });
  it('only retries failed jobs below the attempt limit', () => {
    expect(canRetryJob('failed', 2)).toBe(true);
    expect(canRetryJob('failed', 3)).toBe(false);
    expect(canRetryJob('queued', 0)).toBe(false);
  });
  it('defines pause and resume transitions', () => {
    expect(canPauseSchedule(true)).toBe(true);
    expect(canPauseSchedule(false)).toBe(false);
    expect(canResumeSchedule(false)).toBe(true);
    expect(canResumeSchedule(true)).toBe(false);
  });
});

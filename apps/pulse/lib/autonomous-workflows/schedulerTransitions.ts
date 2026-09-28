export type SchedulerJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export function canCancelJob(status: SchedulerJobStatus) {
  return status === 'queued' || status === 'running';
}

export function canRetryJob(status: SchedulerJobStatus, attempts: number, maxAttempts = 3) {
  return status === 'failed' && attempts < maxAttempts;
}

export function canPauseSchedule(enabled: boolean) { return enabled; }
export function canResumeSchedule(enabled: boolean) { return !enabled; }

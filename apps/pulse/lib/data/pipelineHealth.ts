import type { MlsSyncRun } from './mlsSyncLedger';

type SyncSnapshot = {
  latest: MlsSyncRun | null;
  latestCompleted: MlsSyncRun | null;
  runningCount: number;
};

export function derivePipelineHealth(snapshot: SyncSnapshot, now = new Date()) {
  const latestSuccessfulAt = snapshot.latestCompleted?.completedAt || null;
  const lagMs = latestSuccessfulAt ? Math.max(0, now.getTime() - Date.parse(latestSuccessfulAt)) : null;
  const staleAfterMs = 6 * 60 * 60 * 1_000;
  const latest = snapshot.latest;
  const received = latest?.metrics.received || 0;
  const failureRate = received > 0 ? (latest?.metrics.failed || 0) / received : 0;

  let status: 'healthy' | 'degraded' | 'stale' | 'unknown' = 'healthy';
  const reasons: string[] = [];

  if (!latestSuccessfulAt) {
    status = 'unknown';
    reasons.push('No completed MLS synchronization has been recorded.');
  } else if (lagMs !== null && lagMs > staleAfterMs) {
    status = 'stale';
    reasons.push('The latest completed MLS synchronization is older than six hours.');
  }
  if (latest?.status === 'failed' || failureRate > 0.1) {
    status = 'degraded';
    reasons.push(latest?.status === 'failed' ? 'The latest synchronization failed.' : 'More than 10% of the latest listing writes failed.');
  }
  if (snapshot.runningCount > 1) {
    status = 'degraded';
    reasons.push('Multiple synchronization runs are active concurrently.');
  }

  return {
    status,
    reasons,
    latestSuccessfulAt,
    lagMs,
    failureRate,
    runningCount: snapshot.runningCount,
    powerSyncConfigured: process.env.NEXT_PUBLIC_POWERSYNC_ENABLED === 'true'
      && Boolean(process.env.NEXT_PUBLIC_POWERSYNC_URL),
  };
}

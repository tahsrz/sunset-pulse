import 'server-only';

import {
  listPendingPropertyScanReconstructionIntents,
  readPropertyScanSession,
  resolvePropertyScanReconstructionIntent,
  type PendingPropertyScanReconstructionIntent,
} from './propertyScanStore';

export type PropertyScanReconstructionEnqueueInput = {
  userId: string;
  workflowKey: 'property_scan_reconstruction';
  eventKey: string;
  payload: Record<string, unknown>;
  payloadVersion: 1;
};

export type PropertyScanReconstructionEnqueuer = (input: PropertyScanReconstructionEnqueueInput) => Promise<{ id: string }>;

export async function reconcilePropertyScanReconstructionIntents(input: {
  enqueue: PropertyScanReconstructionEnqueuer;
  limit?: number;
}) {
  const pending = await listPendingPropertyScanReconstructionIntents(input.limit ?? 10);
  const result = { scanned: pending.length, acknowledged: 0, stale: 0, retryable: 0 };

  for (const item of pending) {
    const current = await readPropertyScanSession(item.scanId, item.intent.ownerId);
    if (!isStillApproved(item, current)) {
      if (await resolvePropertyScanReconstructionIntent(item.scanId, item.intent.operationKey, 'stale')) result.stale += 1;
      continue;
    }

    try {
      const job = await input.enqueue({
        userId: item.intent.ownerId,
        workflowKey: 'property_scan_reconstruction',
        eventKey: item.intent.eventKey,
        payload: {
          ownerId: item.intent.ownerId,
          scanId: item.intent.scanId,
          approvedManifestRevision: item.intent.approvedManifestRevision,
          approvedManifestHash: item.intent.approvedManifestHash,
          processorVersion: item.intent.processorVersion,
          operationKey: item.intent.operationKey,
        },
        payloadVersion: 1,
      });
      if (await resolvePropertyScanReconstructionIntent(item.scanId, item.intent.operationKey, 'acknowledged', job.id)) result.acknowledged += 1;
      else result.retryable += 1;
    } catch {
      // Leave the intent pending. A retry uses the same event key, so a crash
      // after enqueue but before acknowledgement replays idempotently.
      result.retryable += 1;
    }
  }

  return result;
}

function isStillApproved(item: PendingPropertyScanReconstructionIntent, current: Awaited<ReturnType<typeof readPropertyScanSession>>) {
  return Boolean(
    current
    && current.status === 'approved'
    && current.approvedManifestRevision === item.intent.approvedManifestRevision
    && current.approvedManifestHash === item.intent.approvedManifestHash
    && current.manifestHash === item.intent.approvedManifestHash
    && current.consentReceipt,
  );
}


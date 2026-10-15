import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { rpc: mocks.rpc } }));

import { enqueuePropertyScanReconstructionEvent, enqueueSprintPlannerEvent, enqueueWorkflowEvent } from '@/lib/autonomous-workflows/schedulerEvents.server';
import { buildPropertyScanReconstructionJobPayload, propertyScanReconstructionEventKey } from '@/lib/scans/scanJobs.server';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const JOB_ID = '33333333-3333-4333-8333-333333333333';
const SCHEDULED_FOR = '2026-09-16T18:00:00.000Z';
const SCAN_OWNER_ID = '22222222-2222-4222-8222-222222222222';
const scanPayload = buildPropertyScanReconstructionJobPayload({
  ownerId: SCAN_OWNER_ID,
  scanId: 'scan_123',
  approvedManifestRevision: 3,
  approvedManifestHash: 'a'.repeat(64),
  processorVersion: 'processor-unavailable-v1',
});

describe('scheduler event enqueue boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockResolvedValue({ data: [{ id: JOB_ID, trigger_kind: 'event', event_key: 'scan:one' }], error: null });
  });

  it('passes the owner, validated event identity and versioned payload to the service RPC', async () => {
    const job = await enqueueWorkflowEvent({
      userId: USER_ID,
      workflowKey: 'sprint_planner',
      eventKey: 'scan:one',
      payload: { source: 'property-scan', revision: 2 },
      payloadVersion: 1,
      scheduledFor: SCHEDULED_FOR,
    });

    expect(job).toEqual(expect.objectContaining({ id: JOB_ID, trigger_kind: 'event' }));
    expect(mocks.rpc).toHaveBeenCalledWith('enqueue_workflow_event', {
      p_user_id: USER_ID,
      p_workflow_key: 'sprint_planner',
      p_event_key: 'scan:one',
      p_payload: { source: 'property-scan', revision: 2 },
      p_payload_version: 1,
      p_scheduled_for: SCHEDULED_FOR,
    });
  });

  it('rejects an unsupported event workflow before touching the database', async () => {
    await expect(enqueueWorkflowEvent({
      userId: USER_ID,
      workflowKey: 'unsupported_workflow' as never,
      eventKey: 'scan:one',
      payload: {},
      payloadVersion: 1,
      scheduledFor: SCHEDULED_FOR,
    })).rejects.toThrow();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('surfaces a missing job receipt as a failure', async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    await expect(enqueueWorkflowEvent({
      userId: USER_ID,
      workflowKey: 'hotlist_email',
      eventKey: 'hotlist:one',
      payload: {},
      payloadVersion: 1,
      scheduledFor: SCHEDULED_FOR,
    })).rejects.toThrow('did not return a job');
  });

  it('leaves immediate event time to the database on every retry', async () => {
    const event = { userId: USER_ID, eventKey: 'retry:one' };
    await enqueueSprintPlannerEvent(event);
    await enqueueSprintPlannerEvent(event);
    expect(mocks.rpc.mock.calls[0][1].p_scheduled_for).toBeNull();
    expect(mocks.rpc.mock.calls[1][1]).toEqual(mocks.rpc.mock.calls[0][1]);
  });

  it('provides a bounded sprint-planner event producer contract', async () => {
    await enqueueSprintPlannerEvent({
      userId: USER_ID,
      eventKey: 'property:one:revision:2',
      planningMode: 'property_shortlist',
      source: 'property_scan',
      scheduledFor: SCHEDULED_FOR,
    });

    expect(mocks.rpc).toHaveBeenCalledWith('enqueue_workflow_event', expect.objectContaining({
      p_workflow_key: 'sprint_planner',
      p_event_key: 'property:one:revision:2',
      p_payload: { planningMode: 'property_shortlist', source: 'property_scan' },
      p_payload_version: 1,
    }));
  });

  it('relays only a strict, owner-bound reconstruction event with deterministic identity', async () => {
    const eventKey = propertyScanReconstructionEventKey(scanPayload);
    await enqueuePropertyScanReconstructionEvent({
      userId: SCAN_OWNER_ID,
      eventKey,
      payload: scanPayload,
      payloadVersion: 1,
    });

    expect(mocks.rpc).toHaveBeenCalledWith('enqueue_workflow_event', expect.objectContaining({
      p_user_id: SCAN_OWNER_ID,
      p_workflow_key: 'property_scan_reconstruction',
      p_event_key: eventKey,
      p_payload: scanPayload,
      p_payload_version: 1,
      p_scheduled_for: null,
    }));
  });

  it('replays the same immutable reconstruction identity after an acknowledgement-loss window', async () => {
    const eventKey = propertyScanReconstructionEventKey(scanPayload);
    await enqueuePropertyScanReconstructionEvent({ userId: SCAN_OWNER_ID, eventKey, payload: scanPayload, payloadVersion: 1 });
    await enqueuePropertyScanReconstructionEvent({ userId: SCAN_OWNER_ID, eventKey, payload: scanPayload, payloadVersion: 1 });

    expect(mocks.rpc).toHaveBeenCalledTimes(2);
    expect(mocks.rpc.mock.calls[0]).toEqual(mocks.rpc.mock.calls[1]);
  });

  it('rejects changed owner, event key, version and unknown payload fields before enqueue', async () => {
    const eventKey = propertyScanReconstructionEventKey(scanPayload);
    const base = { userId: SCAN_OWNER_ID, eventKey, payload: scanPayload, payloadVersion: 1 };
    await expect(enqueuePropertyScanReconstructionEvent({ ...base, userId: USER_ID })).rejects.toThrow();
    await expect(enqueuePropertyScanReconstructionEvent({ ...base, eventKey: 'other-operation' })).rejects.toThrow();
    await expect(enqueuePropertyScanReconstructionEvent({ ...base, payloadVersion: 2 })).rejects.toThrow();
    await expect(enqueuePropertyScanReconstructionEvent({ ...base, payload: { ...scanPayload, secret: 'must-not-pass' } })).rejects.toThrow();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('keeps a reconstruction event disabled when the database contract is not registered', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'Unsupported workflow event contract' } });
    await expect(enqueuePropertyScanReconstructionEvent({
      userId: SCAN_OWNER_ID,
      eventKey: propertyScanReconstructionEventKey(scanPayload),
      payload: scanPayload,
      payloadVersion: 1,
    })).rejects.toMatchObject({ code: 'DISABLED' });
  });
});

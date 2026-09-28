import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { rpc: mocks.rpc } }));

import { enqueueSprintPlannerEvent, enqueueWorkflowEvent } from '@/lib/autonomous-workflows/schedulerEvents.server';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const JOB_ID = '33333333-3333-4333-8333-333333333333';
const SCHEDULED_FOR = '2026-09-16T18:00:00.000Z';

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
      workflowKey: 'property_scan_reconstruction' as never,
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
});

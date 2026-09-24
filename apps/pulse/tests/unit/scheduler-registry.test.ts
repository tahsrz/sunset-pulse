import { describe, expect, it, vi } from 'vitest';

const hotlistHandler = vi.hoisted(() => vi.fn());
const sprintHandler = vi.hoisted(() => vi.fn());
const platformHandler = vi.hoisted(() => vi.fn());
const connectorHealthHandler = vi.hoisted(() => vi.fn());
const quotaReconciliationHandler = vi.hoisted(() => vi.fn());
vi.mock('@/lib/platform/workflows/runHandler.server', () => ({ runPlatformWorkflow: platformHandler }));
vi.mock('@/lib/autonomous-workflows/connectorHealthWorkflow.server', () => ({
  runConnectorHealthCheck: connectorHealthHandler,
}));
vi.mock('@/lib/platform/workflows/capabilityReservationReconciliation.server', () => ({
  runCapabilityReservationReconciliation: quotaReconciliationHandler,
}));

vi.mock('@/lib/autonomous-workflows/hotlistEmailWorkflow.server', () => ({
  runHotlistEmailForUser: hotlistHandler,
}));
vi.mock('@/lib/autonomous-workflows/sprintPlannerWorkflow.server', () => ({
  runSprintPlannerWorkflow: sprintHandler,
}));

import { getWorkflowHandler } from '@/lib/autonomous-workflows/workflowRegistry.server';

describe('workflow registry', () => {
  it('maps supported keys to the dedicated handlers', () => {
    expect(getWorkflowHandler('sprint_planner')).toBe(sprintHandler);
    expect(getWorkflowHandler('platform_run')).toBe(platformHandler);
    expect(getWorkflowHandler('connector_health_check')).toBe(connectorHealthHandler);
    expect(getWorkflowHandler('capability_reservation_reconcile')).toBe(quotaReconciliationHandler);

    const scheduledEmail = getWorkflowHandler('hotlist_email');
    expect(scheduledEmail).not.toBe(hotlistHandler);
    expect(hotlistHandler).not.toHaveBeenCalled();
  });

  it('rejects unregistered workflow keys before execution', () => {
    expect(() => getWorkflowHandler('unsupported_workflow')).toThrow('Unsupported workflow key: unsupported_workflow');
  });
});

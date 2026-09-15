import { describe, expect, it, vi } from 'vitest';

const hotlistHandler = vi.hoisted(() => vi.fn());
const sprintHandler = vi.hoisted(() => vi.fn());

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

    const scheduledEmail = getWorkflowHandler('hotlist_email');
    expect(scheduledEmail).not.toBe(hotlistHandler);
    expect(hotlistHandler).not.toHaveBeenCalled();
  });

  it('rejects unregistered workflow keys before execution', () => {
    expect(() => getWorkflowHandler('unsupported_workflow')).toThrow('Unsupported workflow key: unsupported_workflow');
  });
});

import { describe, expect, it } from 'vitest';
import { canOwnerMarkAssignmentComplete, getSprintAssignmentState, sprintAssignmentLabel } from '@/lib/sprints/sprintPresentation';

describe('sprint presentation state', () => {
  it('keeps proposed work in review instead of calling it assigned', () => {
    expect(getSprintAssignmentState('proposed', { id: 'a', worker_id: 'jamie', status: 'assigned' })).toBe('awaiting_review');
    expect(sprintAssignmentLabel('awaiting_review')).toBe('Awaiting sprint approval');
    expect(canOwnerMarkAssignmentComplete('awaiting_review')).toBe(false);
  });

  it('distinguishes approved unassigned work from active work', () => {
    expect(getSprintAssignmentState('approved', { id: 'a', worker_id: null, status: 'unassigned' })).toBe('unassigned');
    expect(getSprintAssignmentState('approved', { id: 'a', worker_id: 'jamie', status: 'in_progress' })).toBe('in_progress');
    expect(canOwnerMarkAssignmentComplete('in_progress')).toBe(true);
  });

  it('labels failed or cancelled work conservatively', () => {
    expect(getSprintAssignmentState('approved', { id: 'a', worker_id: 'jamie', status: 'failed' })).toBe('blocked');
    expect(getSprintAssignmentState('approved', { id: 'a', worker_id: 'jamie', status: 'cancelled' })).toBe('cancelled');
    expect(canOwnerMarkAssignmentComplete('blocked')).toBe(false);
  });
});

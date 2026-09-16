export type SprintAssignment = {
  id: string;
  worker_id?: string | null;
  status?: string | null;
};

export type SprintAssignmentState = 'awaiting_review' | 'unassigned' | 'assigned' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';

export function getSprintAssignmentState(sprintStatus: string, assignment?: SprintAssignment | null): SprintAssignmentState {
  if (sprintStatus === 'proposed') return 'awaiting_review';
  if (!assignment || !assignment.worker_id) return 'unassigned';
  if (assignment.status === 'completed') return 'completed';
  if (assignment.status === 'cancelled') return 'cancelled';
  if (assignment.status === 'in_progress') return 'in_progress';
  if (assignment.status === 'blocked' || assignment.status === 'failed') return 'blocked';
  return 'assigned';
}

export function sprintAssignmentLabel(state: SprintAssignmentState) {
  switch (state) {
    case 'awaiting_review': return 'Awaiting sprint approval';
    case 'unassigned': return 'Unassigned';
    case 'in_progress': return 'In progress';
    case 'completed': return 'Completed';
    case 'cancelled': return 'Cancelled';
    case 'blocked': return 'Blocked';
    default: return 'Assigned';
  }
}

export function canOwnerMarkAssignmentComplete(state: SprintAssignmentState) {
  return state === 'assigned' || state === 'in_progress';
}

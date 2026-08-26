import type { VibeStatus } from './vibeSchema';

export type VibeAction = 'submit' | 'reject' | 'publish' | 'archive' | 'trash' | 'restore';

export type VibeWorkflowErrorCode =
  | 'INVALID_TRANSITION'
  | 'MISSING_REVISION'
  | 'MISSING_REJECTION_REASON';

export type VibeWorkflowResult =
  | { ok: true; status: VibeStatus }
  | { ok: false; code: VibeWorkflowErrorCode; message: string };

const transitions: Record<VibeAction, Partial<Record<VibeStatus, VibeStatus>>> = {
  submit: { draft: 'in_review' },
  reject: { in_review: 'draft' },
  publish: { in_review: 'published' },
  archive: { published: 'archived', draft: 'archived', in_review: 'archived' },
  trash: { draft: 'trash', in_review: 'trash', archived: 'trash' },
  restore: { trash: 'draft' },
};

export function transitionVibe(input: {
  status: VibeStatus;
  action: VibeAction;
  hasPublishedRevision?: boolean;
  rejectionReason?: string;
}): VibeWorkflowResult {
  const nextStatus = transitions[input.action][input.status];
  if (!nextStatus) {
    return { ok: false, code: 'INVALID_TRANSITION', message: `Cannot ${input.action} a vibe in ${input.status} status.` };
  }

  if (input.action === 'publish' && !input.hasPublishedRevision) {
    return { ok: false, code: 'MISSING_REVISION', message: 'Publishing requires an immutable revision.' };
  }

  if (input.action === 'reject' && !input.rejectionReason?.trim()) {
    return { ok: false, code: 'MISSING_REJECTION_REASON', message: 'Rejecting a vibe requires a reason.' };
  }

  return { ok: true, status: nextStatus };
}

export function getAvailableVibeActions(status: VibeStatus): VibeAction[] {
  return (Object.keys(transitions) as VibeAction[]).filter((action) => transitions[action][status]);
}

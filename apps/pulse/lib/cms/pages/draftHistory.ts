import type { CmsPageDraft } from './pageSchema';

export type DraftHistory = {
  past: CmsPageDraft[];
  present: CmsPageDraft;
  future: CmsPageDraft[];
};
export type DraftHistoryAction =
  | { type: 'edit'; update: (draft: CmsPageDraft) => CmsPageDraft }
  | { type: 'undo' | 'redo' }
  | { type: 'reset'; draft: CmsPageDraft };

export const DRAFT_HISTORY_LIMIT = 50;
export function createDraftHistory(draft: CmsPageDraft): DraftHistory {
  return { past: [], present: draft, future: [] };
}
export function reduceDraftHistory(
  state: DraftHistory,
  action: DraftHistoryAction,
): DraftHistory {
  if (action.type === 'reset') return createDraftHistory(action.draft);
  if (action.type === 'edit') {
    const next = action.update(state.present);
    if (next === state.present) return state;
    return {
      past: [...state.past, state.present].slice(-DRAFT_HISTORY_LIMIT),
      present: next,
      future: [],
    };
  }
  if (action.type === 'undo' && state.past.length)
    return {
      past: state.past.slice(0, -1),
      present: state.past[state.past.length - 1],
      future: [state.present, ...state.future].slice(0, DRAFT_HISTORY_LIMIT),
    };
  if (action.type === 'redo' && state.future.length)
    return {
      past: [...state.past, state.present].slice(-DRAFT_HISTORY_LIMIT),
      present: state.future[0],
      future: state.future.slice(1),
    };
  return state;
}

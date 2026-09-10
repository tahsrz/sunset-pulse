import { describe, expect, it } from 'vitest';
import { createDraftHistory, DRAFT_HISTORY_LIMIT, reduceDraftHistory } from '@/lib/cms/pages/draftHistory';
import { cmsPageDraftSchema } from '@/lib/cms/pages/pageSchema';
const draft = cmsPageDraftSchema.parse({ title: 'Home', slug: 'home' });
describe('local page draft history', () => {
  it('undoes and redoes all draft fields, including temporarily invalid input', () => {
    const edited = reduceDraftHistory(createDraftHistory(draft), { type: 'edit', update: value => ({ ...value, title: '' }) });
    const undone = reduceDraftHistory(edited, { type: 'undo' });
    expect(undone.present).toEqual(draft);
    expect(reduceDraftHistory(undone, { type: 'redo' }).present.title).toBe('');
  });
  it('bounds retained snapshots and clears redo on a new edit', () => {
    let state = createDraftHistory(draft);
    for (let i = 0; i < 100; i++) state = reduceDraftHistory(state, { type: 'edit', update: value => ({ ...value, title: String(i) }) });
    expect(state.past).toHaveLength(DRAFT_HISTORY_LIMIT);
    state = reduceDraftHistory(state, { type: 'undo' });
    state = reduceDraftHistory(state, { type: 'edit', update: value => ({ ...value, excerpt: 'New direction' }) });
    expect(state.future).toEqual([]);
  });
  it('starts a fresh history when restoring a server revision', () => {
    const edited = reduceDraftHistory(createDraftHistory(draft), { type: 'edit', update: value => ({ ...value, title: 'Edit' }) });
    expect(reduceDraftHistory(edited, { type: 'reset', draft })).toEqual(createDraftHistory(draft));
  });
});

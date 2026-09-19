import { describe, expect, it } from 'vitest';
import { buildPropertyBacklog } from '@/lib/property-sprints/buildPropertyBacklog';

const property = (overrides = {}) => ({ id: '11111111-1111-4111-8111-111111111111', ownerId: '22222222-2222-4222-8222-222222222222', revision: 1, status: 'active' as const, areaKey: 'keller-westlake' as const, address: '1612 Fair Oaks Drive', city: 'Westlake', state: 'TX', postalCode: '76262', mlsId: '21316041', county: 'Tarrant', parcelNumber: '07662432', propertyKind: 'residential' as const, unresolvedQuestions: [], ...overrides });

describe('property sprint builder', () => {
  it('creates fact verification and buyer brief work with stable dependencies', () => {
    const result = buildPropertyBacklog({ properties: [property()] });
    expect(result.tasks.map((task) => task.taskKind)).toEqual(['verify_facts', 'draft_buyer_brief']);
    expect(result.tasks[1].dependencyKeys).toEqual([result.tasks[0].dedupeKey]);
  });
  it('adds land constraints and avoids active duplicate tasks', () => {
    const land = property({ id: '33333333-3333-4333-8333-333333333333', address: 'Old Town Keller lot', mlsId: null, parcelNumber: '03061485', propertyKind: 'land', unresolvedQuestions: ['Confirm zoning and parking'] });
    const first = buildPropertyBacklog({ properties: [land] });
    const second = buildPropertyBacklog({ properties: [land], existingTasks: first.tasks.map((task) => ({ dedupeKey: task.dedupeKey, status: 'proposed' })) });
    expect(first.tasks.map((task) => task.taskKind)).toEqual(['verify_facts', 'research_constraints', 'draft_buyer_brief']);
    expect(second.tasks).toHaveLength(0);
  });
});

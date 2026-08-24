import { describe, expect, it } from 'vitest';
import { chooseJamieModelRoute } from '@/lib/ai/jamieModelRouting';

describe('Jamie model routing', () => {
  it('uses the cheap tier for strongly grounded TAH questions', () => {
    expect(chooseJamieModelRoute('What is this?', { evidence: [{ score: 0.9 }, { score: 0.75 }] } as any)).toEqual({ tier: 'cheap', reason: 'grounded_tah' });
  });
  it('uses the strong tier for complex requests even with evidence', () => {
    expect(chooseJamieModelRoute('Compare and analyze these options', { evidence: [{ score: 0.95 }, { score: 0.9 }] } as any)).toEqual({ tier: 'strong', reason: 'complex_task' });
  });
  it('uses the strong tier when retrieval is weak', () => {
    expect(chooseJamieModelRoute('Tell me about this', { evidence: [{ score: 0.2 }] } as any)).toEqual({ tier: 'strong', reason: 'weak_tah' });
  });
});

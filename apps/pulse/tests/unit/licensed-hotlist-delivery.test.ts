import { describe, expect, it } from 'vitest';
import { chunk } from '@/lib/autonomous-workflows/deliveryBatching';

describe('licensed hotlist delivery batching', () => {
  it('keeps batches bounded and preserves recipient order', () => {
    expect(chunk(['a', 'b', 'c', 'd', 'e'], 2)).toEqual([['a', 'b'], ['c', 'd'], ['e']]);
  });

  it('does not create an empty trailing batch', () => {
    expect(chunk(['a', 'b', 'c', 'd'], 2)).toHaveLength(2);
  });
});

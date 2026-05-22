import { describe, expect, it } from 'vitest';
import { getAbidanTahContext } from '@/lib/ai/brain/abidan_tah';

describe('Abidan TAH context', () => {
  it('combines judge-specific cartridges with broad pulse context', async () => {
    const context = await getAbidanTahContext('MAKIEL', 'Dallas growth market velocity', {
      location: { city: 'Dallas', state: 'TX' },
      propertyType: 'Residential'
    });

    expect(context).toContain('[ABIDAN_TAH_CONTEXT]');
    expect(context).toContain('JUDGE: MAKIEL');
    expect(context).toMatch(/TARGETED_CARTRIDGES|BROAD_PULSE_MATCHES/);
  });
});

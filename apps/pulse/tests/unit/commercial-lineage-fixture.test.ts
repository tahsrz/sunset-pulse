import { describe, expect, it } from 'vitest';
import fixture from '@/config/commercial-lineage-fixture.json';
import { validateCommercialLineageFixture } from '@/lib/profit/commercialLineageFixture';

describe('LUNA-102 end-to-end commercial lineage fixture', () => {
  it('traces one journey from Jamie handoff through shadow outcome and revenue', () => {
    expect(validateCommercialLineageFixture(fixture)).toEqual(fixture);
  });

  it('rejects a downstream record that changes tenant identity', () => {
    expect(() => validateCommercialLineageFixture({
      ...fixture,
      booking: { ...fixture.booking, site: 'other-agent.sunsetpulse.app' },
    })).toThrow(/identity mismatch/);
  });

  it('rejects a signing packet attached to another booking', () => {
    expect(() => validateCommercialLineageFixture({
      ...fixture,
      signingPacket: { ...fixture.signingPacket, bookingId: '55555555-5555-4555-8555-555555555555' },
    })).toThrow(/signing booking mismatch/);
  });
});

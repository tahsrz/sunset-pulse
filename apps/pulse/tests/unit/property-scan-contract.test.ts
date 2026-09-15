import { describe, expect, it } from 'vitest';
import { propertyScanRequestSchema, scanModeCopy } from '@/lib/scans/propertyScanContract';

describe('property scan contract', () => {
  it('requires both interior capture consent acknowledgements', () => {
    const result = propertyScanRequestSchema.safeParse({
      propertyAddress: '1612 Fair Oaks Drive, Westlake, TX',
      captureMode: 'guided_video',
      consent: { ownerAuthorized: true, interiorCaptureAcknowledged: false },
    });
    expect(result.success).toBe(false);
  });

  it('normalizes optional listing ids and exposes instructions for every mode', () => {
    const result = propertyScanRequestSchema.parse({
      propertyAddress: '1612 Fair Oaks Drive, Westlake, TX',
      listingId: '',
      captureMode: 'lidar_capture',
      consent: { ownerAuthorized: true, interiorCaptureAcknowledged: true },
    });
    expect(result.listingId).toBeNull();
    expect(scanModeCopy[result.captureMode].instructions.length).toBeGreaterThan(1);
  });
});


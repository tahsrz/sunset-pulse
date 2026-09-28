import { describe, expect, it } from 'vitest';
import { hasSupportedPropertyScanSignature, propertyScanRequestSchema, scanModeCopy } from '@/lib/scans/propertyScanContract';

describe('property scan contract', () => {
  it('requires both interior capture consent acknowledgements', () => {
    const result = propertyScanRequestSchema.safeParse({
      propertyAddress: '1612 Fair Oaks Drive, Westlake, TX',
      captureMode: 'guided_video',
      consent: { ownerAuthorized: true, interiorCaptureAcknowledged: false },
    });
    expect(result.success).toBe(false);
  });

  it('normalizes optional listing ids and rejects unsupported new LiDAR sessions', () => {
    const result = propertyScanRequestSchema.parse({
      propertyAddress: '1612 Fair Oaks Drive, Westlake, TX',
      listingId: '',
      captureMode: 'photo_walkthrough',
      consent: { ownerAuthorized: true, interiorCaptureAcknowledged: true },
    });
    expect(result.listingId).toBeNull();
    expect(scanModeCopy[result.captureMode].instructions.length).toBeGreaterThan(1);
    expect(propertyScanRequestSchema.safeParse({
      propertyAddress: '1612 Fair Oaks Drive, Westlake, TX',
      captureMode: 'lidar_capture',
      consent: { ownerAuthorized: true, interiorCaptureAcknowledged: true },
    }).success).toBe(false);
  });

  it('checks file signatures instead of trusting the browser MIME label', () => {
    expect(hasSupportedPropertyScanSignature('image/jpeg', new Uint8Array([0xff, 0xd8, 0xff, 0xd9]))).toBe(true);
    expect(hasSupportedPropertyScanSignature('image/png', new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true);
    expect(hasSupportedPropertyScanSignature('image/webp', new TextEncoder().encode('RIFF1234WEBP'))).toBe(true);
    expect(hasSupportedPropertyScanSignature('video/mp4', new TextEncoder().encode('....ftypisom'))).toBe(true);
    expect(hasSupportedPropertyScanSignature('image/jpeg', new TextEncoder().encode('not a jpeg'))).toBe(false);
    expect(hasSupportedPropertyScanSignature('image/gif', new TextEncoder().encode('GIF89a'))).toBe(false);
  });
});

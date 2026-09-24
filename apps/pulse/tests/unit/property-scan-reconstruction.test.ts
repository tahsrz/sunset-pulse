import { describe, expect, it } from 'vitest';
import { isLegacyPropertyScanDemo, reconstructionUnavailable } from '@/lib/scans/reconstruction';

describe('property scan reconstruction preview', () => {
  it('does not infer rooms or mark a capture ready without a processor', () => {
    expect(reconstructionUnavailable).toEqual({
      outcome: 'unavailable',
      code: 'PROCESSOR_UNAVAILABLE',
      message: expect.any(String),
    });
  });

  it('identifies legacy synthetic metadata without treating it as a real model', () => {
    expect(isLegacyPropertyScanDemo({
      jobId: 'legacy_demo',
      status: 'ready',
      progress: 100,
      engine: 'manifest-preview-v1',
      previewKind: 'procedural-room-shell',
      roomCount: 12,
      assetCount: 40,
      startedAt: '2026-09-15T12:00:00.000Z',
      completedAt: '2026-09-15T12:01:00.000Z',
      error: null,
    })).toBe(true);
  });
});

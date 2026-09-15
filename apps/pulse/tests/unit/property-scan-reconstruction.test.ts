import { describe, expect, it } from 'vitest';
import { buildManifestPreview } from '@/lib/scans/reconstruction';

describe('property scan reconstruction preview', () => {
  it('turns approved capture coverage into bounded room-shell geometry metadata', () => {
    const preview = buildManifestPreview({
      jobId: 'recon_test',
      startedAt: '2026-09-15T12:00:00.000Z',
      assets: Array.from({ length: 40 }, (_, index) => ({
        path: `owner/scan/capture-${index}.jpg`,
        fileName: `capture-${index}.jpg`,
        mimeType: 'image/jpeg',
        size: 100,
        capturedAt: '2026-09-15T12:00:00.000Z',
      })),
    });
    expect(preview.status).toBe('ready');
    expect(preview.previewKind).toBe('procedural-room-shell');
    expect(preview.roomCount).toBe(12);
    expect(preview.assetCount).toBe(40);
  });
});


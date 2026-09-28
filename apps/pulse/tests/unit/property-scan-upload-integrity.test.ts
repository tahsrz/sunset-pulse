import { describe, expect, it } from 'vitest';
import { inspectPropertyScanUpload } from '@/lib/scans/propertyScanUploadIntegrity';

describe('property scan upload integrity', () => {
  it('accepts a reserved JPEG and records its content hash', () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x01, 0x02]);
    const result = inspectPropertyScanUpload({ bytes, expectedBytes: bytes.byteLength, expectedMimeType: 'image/jpeg' });
    expect(result).toMatchObject({ size: bytes.byteLength, mimeType: 'image/jpeg', contentHash: expect.stringMatching(/^[a-f0-9]{64}$/) });
  });

  it('rejects bytes whose length does not match the reservation', () => {
    expect(() => inspectPropertyScanUpload({ bytes: new Uint8Array([0xff, 0xd8, 0xff]), expectedBytes: 4, expectedMimeType: 'image/jpeg' })).toThrow('bytes do not match');
  });

  it('rejects a supported MIME type with the wrong file signature', () => {
    expect(() => inspectPropertyScanUpload({ bytes: new Uint8Array([0, 1, 2, 3]), expectedBytes: 4, expectedMimeType: 'image/jpeg' })).toThrow('signature does not match');
  });
});

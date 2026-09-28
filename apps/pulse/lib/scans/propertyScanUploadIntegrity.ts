import { createHash } from 'node:crypto';
import { hasSupportedPropertyScanSignature } from './propertyScanContract';

export type PropertyScanUploadIntegrity = {
  size: number;
  mimeType: string;
  contentHash: string;
};

export function inspectPropertyScanUpload(input: {
  bytes: Uint8Array;
  expectedBytes: number;
  expectedMimeType: string;
}): PropertyScanUploadIntegrity {
  const mimeType = input.expectedMimeType.trim().toLowerCase();
  if (input.bytes.byteLength !== input.expectedBytes) throw new Error('Uploaded capture bytes do not match its reservation.');
  if (!hasSupportedPropertyScanSignature(mimeType, input.bytes)) throw new Error('Uploaded capture signature does not match its declared media type.');
  return {
    size: input.bytes.byteLength,
    mimeType,
    contentHash: createHash('sha256').update(input.bytes).digest('hex'),
  };
}

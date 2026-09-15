import type { PropertyScanAsset } from '@/lib/scans/propertyScanContract';

export type PropertyScanReconstruction = {
  jobId: string;
  status: 'ready' | 'failed';
  progress: number;
  engine: 'manifest-preview-v1';
  previewKind: 'procedural-room-shell';
  roomCount: number;
  assetCount: number;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
};

export function buildManifestPreview(input: { jobId: string; assets: PropertyScanAsset[]; startedAt: string }): PropertyScanReconstruction {
  const assetCount = input.assets.length;
  return {
    jobId: input.jobId,
    status: 'ready',
    progress: 100,
    engine: 'manifest-preview-v1',
    previewKind: 'procedural-room-shell',
    roomCount: Math.max(1, Math.min(12, Math.ceil(assetCount / 3))),
    assetCount,
    startedAt: input.startedAt,
    completedAt: new Date().toISOString(),
    error: null,
  };
}

/**
 * Metadata written by the first scan-preview slice. These records are kept so
 * older sessions remain readable, but they are never a current home artifact.
 */
export type LegacyPropertyScanDemo = {
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

export type PropertyScanReconstruction = LegacyPropertyScanDemo;

export type ReconstructionUnavailable = {
  outcome: 'unavailable';
  code: 'PROCESSOR_UNAVAILABLE';
  message: string;
};

export const reconstructionUnavailable: ReconstructionUnavailable = {
  outcome: 'unavailable',
  code: 'PROCESSOR_UNAVAILABLE',
  message: 'A real reconstruction processor is not configured yet. The private capture is ready for a later processing step.',
};

export function isLegacyPropertyScanDemo(value: PropertyScanReconstruction | null | undefined): value is LegacyPropertyScanDemo {
  return value?.engine === 'manifest-preview-v1' && value.previewKind === 'procedural-room-shell';
}

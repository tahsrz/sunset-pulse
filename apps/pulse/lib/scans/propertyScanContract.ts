import { z } from 'zod';

export const propertyScanModes = ['guided_video', 'photo_walkthrough', 'lidar_capture'] as const;
export type PropertyScanMode = (typeof propertyScanModes)[number];
export const supportedPropertyScanModes = ['guided_video', 'photo_walkthrough'] as const;
export type SupportedPropertyScanMode = (typeof supportedPropertyScanModes)[number];

export const propertyScanRequestSchema = z.object({
  propertyAddress: z.string().trim().min(5).max(500),
  listingId: z.string().trim().max(120).optional().or(z.literal('')).transform((value) => value || null),
  captureMode: z.enum(supportedPropertyScanModes).default('guided_video'),
  consent: z.object({
    ownerAuthorized: z.literal(true),
    interiorCaptureAcknowledged: z.literal(true),
    publicListingApproval: z.boolean().default(false),
  }),
});

export type PropertyScanRequest = z.infer<typeof propertyScanRequestSchema>;

export const propertyScanAssetSchema = z.object({
  assetId: z.string().uuid().optional(),
  path: z.string().min(1),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(120),
  size: z.number().int().positive(),
  capturedAt: z.string().datetime().nullable().optional(),
  uploadedAt: z.string().datetime().optional(),
});

export type PropertyScanAsset = z.infer<typeof propertyScanAssetSchema>;

export const scanModeCopy: Record<PropertyScanMode, { label: string; detail: string; instructions: string[] }> = {
  guided_video: {
    label: 'Guided video',
    detail: 'Works on most phones and creates the base capture for photogrammetry.',
    instructions: ['Turn on every room light.', 'Walk slowly around each room.', 'Keep the phone level and avoid fast pans.'],
  },
  photo_walkthrough: {
    label: 'Photo walkthrough',
    detail: 'Use a sequence of overlapping still photos when video is not convenient.',
    instructions: ['Take a photo every few steps.', 'Overlap each frame by roughly one third.', 'Include doorways, windows, and room transitions.'],
  },
  lidar_capture: {
    label: 'LiDAR capture',
    detail: 'Best geometry when the device exposes a depth sensor.',
    instructions: ['Use a supported LiDAR device.', 'Move slowly around walls and fixed features.', 'Keep the scan private until the agent approves it.'],
  },
};

export const propertyScanAssetMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
]);

export const propertyScanAssetLimits = {
  maxFiles: 24,
  maxBytesPerFile: 75 * 1024 * 1024,
};

export function hasSupportedPropertyScanSignature(mimeType: string, bytes: Uint8Array) {
  if (mimeType === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === 'image/png') return bytes.length >= 8 && bytes.slice(0, 8).every((byte, index) => byte === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index]);
  if (mimeType === 'image/webp') return hasAscii(bytes, 0, 'RIFF') && hasAscii(bytes, 8, 'WEBP');
  if (mimeType === 'video/mp4' || mimeType === 'video/quicktime') return hasAscii(bytes, 4, 'ftyp');
  return false;
}

function hasAscii(bytes: Uint8Array, offset: number, value: string) {
  return bytes.length >= offset + value.length && [...value].every((character, index) => bytes[offset + index] === character.charCodeAt(0));
}

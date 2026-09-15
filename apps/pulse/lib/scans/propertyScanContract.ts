import { z } from 'zod';

export const propertyScanModes = ['guided_video', 'photo_walkthrough', 'lidar_capture'] as const;
export type PropertyScanMode = (typeof propertyScanModes)[number];

export const propertyScanRequestSchema = z.object({
  propertyAddress: z.string().trim().min(5).max(500),
  listingId: z.string().trim().max(120).optional().or(z.literal('')).transform((value) => value || null),
  captureMode: z.enum(propertyScanModes).default('guided_video'),
  consent: z.object({
    ownerAuthorized: z.literal(true),
    interiorCaptureAcknowledged: z.literal(true),
    publicListingApproval: z.boolean().default(false),
  }),
});

export type PropertyScanRequest = z.infer<typeof propertyScanRequestSchema>;

export const propertyScanAssetSchema = z.object({
  path: z.string().min(1),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(120),
  size: z.number().int().nonnegative(),
  capturedAt: z.string().datetime(),
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


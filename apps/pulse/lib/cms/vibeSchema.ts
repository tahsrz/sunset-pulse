import { z } from 'zod';

const hexColor = z.string().trim().regex(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i, 'Must be a valid hex color');
const cssUnit = z.string().trim().regex(/^\d+(?:\.\d+)?(?:px|rem|em|vh|vw|%)$/, 'Must be a safe CSS unit');

export const vibeStatusSchema = z.enum(['draft', 'in_review', 'published', 'archived', 'trash']);
export type VibeStatus = z.infer<typeof vibeStatusSchema>;

export const visualThemeSchema = z.object({
  colors: z.object({
    primary: hexColor,
    secondary: hexColor.optional(),
    background: hexColor,
    surface: hexColor,
    textPrimary: hexColor,
    textSecondary: hexColor,
    accent: hexColor.optional(),
    error: hexColor.optional(),
  }),
  typography: z.object({
    fontFamilyHeading: z.string().trim().min(1).max(100),
    fontFamilyBody: z.string().trim().min(1).max(100),
    baseFontSize: cssUnit,
    scaleRatio: z.number().min(1).max(2.5).default(1.2),
    fontWeightNormal: z.number().int().min(100).max(900).default(400),
    fontWeightBold: z.number().int().min(100).max(900).default(700),
  }),
  layout: z.object({
    borderRadius: z.enum(['none', 'sm', 'md', 'lg', 'full']).default('md'),
    spacingBasePx: z.number().int().positive().max(64).default(4),
    elevation: z.enum(['flat', 'subtle', 'medium', 'high']).default('subtle'),
  }),
});

export const visualEffectsSchema = z.object({
  meshColor: hexColor.optional(),
  bloomIntensity: z.number().min(0).max(10).optional(),
  glitchFrequency: z.number().min(0).max(10).optional(),
  particleDensity: z.number().min(0).max(10).optional(),
  motionPreset: z.string().trim().min(1).max(40).optional(),
});

export const linguisticTokensSchema = z.object({
  voice: z.object({
    primaryTone: z.enum(['warm', 'concise', 'analytical', 'energetic', 'tactical', 'luxurious', 'playful']),
    secondaryTones: z.array(z.string().trim().min(1).max(30)).max(3).default([]),
    formalityScale: z.number().int().min(1).max(5).default(3),
    enthusiasmScale: z.number().int().min(1).max(5).default(3),
    maxSentenceLength: z.number().int().positive().max(500).optional(),
    allowEmoji: z.boolean().default(false),
  }),
  vocabulary: z.object({
    preferredTerms: z.array(z.string().trim().min(1).max(80)).max(100).default([]),
    forbiddenTerms: z.array(z.string().trim().min(1).max(80)).max(100).default([]),
    replacements: z.record(z.string().trim().min(1).max(80), z.string().trim().min(1).max(80)).default({}),
  }),
  systemDirectives: z.array(z.string().trim().min(3).max(500)).min(1).max(50),
  examples: z.array(z.object({
    scenario: z.string().trim().min(1).max(120),
    userPrompt: z.string().trim().min(1).max(1_000),
    idealResponse: z.string().trim().min(1).max(2_000),
  })).max(50).default([]),
});

export const vibeTokensPayloadSchema = z.object({
  visual: z.object({
    theme: visualThemeSchema,
    effects: visualEffectsSchema.default({}),
  }),
  linguistic: linguisticTokensSchema,
});
export type VibeTokensPayload = z.infer<typeof vibeTokensPayloadSchema>;

export const vibeDraftSchema = z.object({
  title: z.string().trim().min(1).max(160),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must contain lowercase letters, numbers, and hyphens'),
  excerpt: z.string().trim().max(320).default(''),
  description: z.string().trim().max(10_000).default(''),
  tokens: vibeTokensPayloadSchema,
  taxonomyTermIds: z.array(z.string().trim().min(1).max(80)).max(50).default([]),
  source: z.object({
    kind: z.enum(['extracted', 'manual']),
    mediaId: z.string().trim().max(160).optional(),
    url: z.string().url().optional(),
    attribution: z.string().trim().max(1_000).default(''),
    ownershipNote: z.string().trim().max(1_000).default(''),
    extractedAt: z.string().datetime().optional(),
    method: z.string().trim().max(120).optional(),
  }),
});
export type VibeDraft = z.infer<typeof vibeDraftSchema>;

export const vibeRevisionSchema = z.object({
  id: z.string().min(1),
  vibeId: z.string().min(1),
  tenantId: z.string().min(1),
  revisionNumber: z.number().int().positive(),
  snapshot: vibeDraftSchema,
  contentHash: z.string().regex(/^[a-f0-9]{64}$/i),
  parentRevisionId: z.string().min(1).optional(),
  changeSummary: z.string().trim().max(1_000).default(''),
  createdBy: z.string().min(1),
  createdAt: z.string().datetime(),
});
export type VibeRevision = z.infer<typeof vibeRevisionSchema>;

import { z } from 'zod';

const extensionIdSchema = z.string().trim().regex(/^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/);
const versionSchema = z.string().trim().regex(/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/i);

export const pluginManifestSchema = z.object({
  id: extensionIdSchema,
  name: z.string().trim().min(1).max(100),
  version: versionSchema,
  description: z.string().trim().min(1).max(500),
  author: z.string().trim().min(1).max(100),
  extensions: z.object({
    blocks: z.array(extensionIdSchema).max(50).default([]),
    editorPanels: z.array(extensionIdSchema).max(25).default([]),
    settingsPages: z.array(extensionIdSchema).max(10).default([]),
  }).default({ blocks: [], editorPanels: [], settingsPages: [] }),
  settingsSchemaVersion: z.number().int().min(1).default(1),
}).strict();

export const themeManifestSchema = z.object({
  id: extensionIdSchema,
  name: z.string().trim().min(1).max(100),
  version: versionSchema,
  description: z.string().trim().min(1).max(500),
  author: z.string().trim().min(1).max(100),
  templates: z.record(z.string().trim().min(1), extensionIdSchema),
  templateParts: z.record(z.string().trim().min(1), extensionIdSchema).default({}),
  supportedBlocks: z.array(extensionIdSchema).max(100).default([]),
}).strict();

export type PluginManifest = z.infer<typeof pluginManifestSchema>;
export type ThemeManifest = z.infer<typeof themeManifestSchema>;


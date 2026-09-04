import {
  pluginManifestSchema,
  themeManifestSchema,
  type PluginManifest,
  type ThemeManifest,
} from './contracts';

export type ExtensionCatalog = ReturnType<typeof createExtensionCatalog>;

export function createExtensionCatalog(input: { plugins?: readonly unknown[]; themes?: readonly unknown[] }) {
  const plugins = (input.plugins || []).map((manifest) => pluginManifestSchema.parse(manifest));
  const themes = (input.themes || []).map((manifest) => themeManifestSchema.parse(manifest));
  assertUniqueIds(plugins, 'plugin');
  assertUniqueIds(themes, 'theme');

  const pluginsById = new Map(plugins.map((manifest) => [manifest.id, manifest]));
  const themesById = new Map(themes.map((manifest) => [manifest.id, manifest]));
  return Object.freeze({
    plugins: Object.freeze([...plugins]),
    themes: Object.freeze([...themes]),
    getPlugin: (id: string): PluginManifest | undefined => pluginsById.get(id),
    getTheme: (id: string): ThemeManifest | undefined => themesById.get(id),
  });
}

function assertUniqueIds(manifests: Array<PluginManifest | ThemeManifest>, kind: 'plugin' | 'theme') {
  const seen = new Set<string>();
  for (const manifest of manifests) {
    if (seen.has(manifest.id)) throw new Error(`DUPLICATE_${kind.toUpperCase()}_ID:${manifest.id}`);
    seen.add(manifest.id);
  }
}

export const DEFAULT_CMS_THEME_ID = 'sunset/core';

export const bundledExtensionCatalog = createExtensionCatalog({
  plugins: [],
  themes: [{
    id: DEFAULT_CMS_THEME_ID,
    name: 'Sunset Core',
    version: '1.0.0',
    description: 'The built-in structured page theme for Sunset Pulse sites.',
    author: 'Sunset Pulse',
    templates: { page: 'sunset/page' },
    supportedBlocks: ['core/heading', 'core/paragraph', 'core/image', 'core/button'],
  }],
});

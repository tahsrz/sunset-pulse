import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createExtensionCatalog } from '@/lib/cms/extensions/catalog';
import { coreCmsBlockRegistry } from '@/lib/cms/pages/blockRegistry';
import { composeCmsBlockRegistry, createCmsPluginRuntimeCatalog } from '@/lib/cms/extensions/runtimeCatalog';

const plugin = {
  id: 'sunset/contact-form',
  name: 'Contact Form',
  version: '1.0.0',
  description: 'Adds a contact form.',
  author: 'Sunset Pulse',
  extensions: { blocks: ['sunset/contact-form'], editorPanels: [], settingsPages: [] },
};
const extensions = createExtensionCatalog({ plugins: [plugin], themes: [] });
const contactBlock = {
  type: 'sunset/contact-form',
  title: 'Contact Form',
  schema: z.object({ blockId: z.string(), version: z.literal(1), type: z.literal('sunset/contact-form'), props: z.object({}) }),
  latestVersion: 1,
  migrate: (block: unknown) => block,
  render: () => 'Contact form',
};

describe('CMS plugin runtime catalog', () => {
  it('requires an executable block for every block declared by a plugin manifest', () => {
    expect(() => createCmsPluginRuntimeCatalog({ extensions, runtimes: [{ pluginId: plugin.id, version: plugin.version, blocks: [] }] }))
      .toThrow(`PLUGIN_BLOCK_RUNTIME_MISSING:${plugin.id}:sunset/contact-form`);
  });

  it('merges an exact-version active bundled plugin into the core registry', () => {
    const runtimeCatalog = createCmsPluginRuntimeCatalog({ extensions, runtimes: [{ pluginId: plugin.id, version: plugin.version, blocks: [contactBlock] }] });
    const result = composeCmsBlockRegistry({
      activePlugins: [{ manifest: extensions.getPlugin(plugin.id)!, activationVersion: plugin.version }],
      runtimeCatalog,
    });
    expect(result.registry.get('core/heading')).toBeDefined();
    expect(result.registry.get('sunset/contact-form')?.title).toBe('Contact Form');
    expect(result.diagnostics).toEqual([]);
  });

  it('contains missing, stale, and colliding plugin runtimes', () => {
    const missing = composeCmsBlockRegistry({ activePlugins: [{ manifest: extensions.getPlugin(plugin.id)!, activationVersion: plugin.version }] });
    expect(missing.diagnostics).toEqual([`ACTIVE_PLUGIN_RUNTIME_UNAVAILABLE:${plugin.id}`]);

    const runtimeCatalog = createCmsPluginRuntimeCatalog({ extensions, runtimes: [{ pluginId: plugin.id, version: plugin.version, blocks: [contactBlock] }] });
    const stale = composeCmsBlockRegistry({ activePlugins: [{ manifest: extensions.getPlugin(plugin.id)!, activationVersion: '0.9.0' }], runtimeCatalog });
    expect(stale.diagnostics).toEqual([`ACTIVE_PLUGIN_RUNTIME_VERSION_MISMATCH:${plugin.id}`]);

    const conflictExtensions = createExtensionCatalog({ plugins: [{ ...plugin, extensions: { ...plugin.extensions, blocks: ['core/heading'] } }], themes: [] });
    const conflictRuntime = createCmsPluginRuntimeCatalog({ extensions: conflictExtensions, runtimes: [{ pluginId: plugin.id, version: plugin.version, blocks: [coreCmsBlockRegistry.definitions[0]] }] });
    const conflict = composeCmsBlockRegistry({ activePlugins: [{ manifest: conflictExtensions.getPlugin(plugin.id)!, activationVersion: plugin.version }], runtimeCatalog: conflictRuntime });
    expect(conflict.diagnostics).toEqual([`ACTIVE_PLUGIN_BLOCK_CONFLICT:${plugin.id}:core/heading`]);
  });
});

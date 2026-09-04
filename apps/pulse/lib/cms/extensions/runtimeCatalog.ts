import { bundledExtensionCatalog, type ExtensionCatalog } from './catalog';
import { coreCmsBlockRegistry, createCmsBlockRegistry, type CmsBlockDefinition, type CmsBlockRegistry } from '@/lib/cms/pages/blockRegistry';

export type CmsPluginRuntime = Readonly<{
  pluginId: string;
  version: string;
  blocks: readonly CmsBlockDefinition[];
}>;

export function createCmsPluginRuntimeCatalog(input: { extensions: ExtensionCatalog; runtimes?: readonly CmsPluginRuntime[] }) {
  const byPluginId = new Map<string, CmsPluginRuntime>();
  for (const runtime of input.runtimes || []) {
    if (byPluginId.has(runtime.pluginId)) throw new Error(`DUPLICATE_PLUGIN_RUNTIME:${runtime.pluginId}`);
    const manifest = input.extensions.getPlugin(runtime.pluginId);
    if (!manifest) throw new Error(`PLUGIN_RUNTIME_MANIFEST_UNAVAILABLE:${runtime.pluginId}`);
    if (runtime.version !== manifest.version) throw new Error(`PLUGIN_RUNTIME_VERSION_MISMATCH:${runtime.pluginId}`);
    const declared = new Set(manifest.extensions.blocks);
    const implemented = new Set(runtime.blocks.map(({ type }) => type));
    for (const type of declared) if (!implemented.has(type)) throw new Error(`PLUGIN_BLOCK_RUNTIME_MISSING:${runtime.pluginId}:${type}`);
    for (const type of implemented) if (!declared.has(type)) throw new Error(`PLUGIN_BLOCK_NOT_DECLARED:${runtime.pluginId}:${type}`);
    byPluginId.set(runtime.pluginId, Object.freeze({ ...runtime, blocks: Object.freeze([...runtime.blocks]) }));
  }
  return Object.freeze({ get: (pluginId: string) => byPluginId.get(pluginId) });
}

export type CmsPluginRuntimeCatalog = ReturnType<typeof createCmsPluginRuntimeCatalog>;

export const bundledCmsPluginRuntimeCatalog = createCmsPluginRuntimeCatalog({
  extensions: bundledExtensionCatalog,
  runtimes: [],
});

export function composeCmsBlockRegistry(input: {
  activePlugins: readonly { manifest: { id: string; version: string; extensions: { blocks: string[] } }; activationVersion: string }[];
  runtimeCatalog?: CmsPluginRuntimeCatalog;
  baseRegistry?: CmsBlockRegistry;
}) {
  const runtimeCatalog = input.runtimeCatalog || bundledCmsPluginRuntimeCatalog;
  const definitions = [...(input.baseRegistry || coreCmsBlockRegistry).definitions];
  const occupied = new Set(definitions.map(({ type }) => type));
  const diagnostics: string[] = [];
  for (const plugin of input.activePlugins) {
    if (plugin.manifest.extensions.blocks.length === 0) continue;
    const runtime = runtimeCatalog.get(plugin.manifest.id);
    if (!runtime) {
      diagnostics.push(`ACTIVE_PLUGIN_RUNTIME_UNAVAILABLE:${plugin.manifest.id}`);
      continue;
    }
    if (runtime.version !== plugin.activationVersion) {
      diagnostics.push(`ACTIVE_PLUGIN_RUNTIME_VERSION_MISMATCH:${plugin.manifest.id}`);
      continue;
    }
    const conflict = runtime.blocks.find(({ type }) => occupied.has(type));
    if (conflict) {
      diagnostics.push(`ACTIVE_PLUGIN_BLOCK_CONFLICT:${plugin.manifest.id}:${conflict.type}`);
      continue;
    }
    runtime.blocks.forEach((definition) => {
      definitions.push(definition);
      occupied.add(definition.type);
    });
  }
  return { registry: createCmsBlockRegistry(definitions), diagnostics: Object.freeze(diagnostics) };
}

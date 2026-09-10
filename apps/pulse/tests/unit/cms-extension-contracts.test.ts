import { describe, expect, it } from 'vitest';
import { createExtensionCatalog } from '@/lib/cms/extensions/catalog';

const plugin = {
  id: 'sunset/contact-form',
  name: 'Contact Form',
  version: '1.0.0',
  description: 'Adds an editable contact form block.',
  author: 'Sunset Pulse',
  extensions: { blocks: ['sunset/contact-form'], editorPanels: [], settingsPages: ['sunset/contact-form'] },
};

const theme = {
  id: 'sunset/editorial',
  name: 'Editorial',
  version: '1.0.0',
  description: 'Editorial page templates for Sunset Pulse sites.',
  author: 'Sunset Pulse',
  templates: { page: 'sunset/editorial-page' },
  supportedBlocks: ['sunset/contact-form'],
};

describe('CMS extension contracts', () => {
  it('builds an addressable plugin and theme catalog', () => {
    const catalog = createExtensionCatalog({ plugins: [plugin], themes: [theme] });
    expect(catalog.getPlugin(plugin.id)?.extensions.blocks).toEqual(['sunset/contact-form']);
    expect(catalog.getTheme(theme.id)?.templates.page).toBe('sunset/editorial-page');
  });

  it('requires namespaced IDs and semantic versions', () => {
    expect(() => createExtensionCatalog({ plugins: [{ ...plugin, id: 'contact-form' }] })).toThrow();
    expect(() => createExtensionCatalog({ plugins: [{ ...plugin, version: 'latest' }] })).toThrow();
  });

  it('rejects duplicate catalog identities', () => {
    expect(() => createExtensionCatalog({ plugins: [plugin, plugin] })).toThrow(`DUPLICATE_PLUGIN_ID:${plugin.id}`);
    expect(() => createExtensionCatalog({ themes: [theme, theme] })).toThrow(`DUPLICATE_THEME_ID:${theme.id}`);
  });
});


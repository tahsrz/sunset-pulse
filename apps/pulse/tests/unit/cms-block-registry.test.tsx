import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { coreCmsBlockRegistry, createCmsBlockRegistry, renderCmsBlock, renderCmsPageBlocks } from '@/lib/cms/pages/blockRegistry';

const blockId = '276fd207-2f8c-44f1-a958-9cbc641c1e4c';

describe('CMS block registry', () => {
  it('registers every version-1 core block exactly once', () => {
    expect(coreCmsBlockRegistry.definitions.map(({ type }) => type)).toEqual([
      'core/heading', 'core/paragraph', 'core/image', 'core/button',
    ]);
    expect(() => createCmsBlockRegistry([
      coreCmsBlockRegistry.definitions[0], coreCmsBlockRegistry.definitions[0],
    ])).toThrow('DUPLICATE_BLOCK_TYPE:core/heading');
  });

  it('renders validated semantic core content', () => {
    const html = renderToStaticMarkup(<>{renderCmsPageBlocks([
      { blockId, version: 1, type: 'core/heading', props: { text: 'Welcome', level: 2 } },
      { blockId: '7cfa20a0-8b0d-41a9-816c-d42a4ea04716', version: 1, type: 'core/paragraph', props: { text: 'Find your next home.' } },
      { blockId: '4c6958c7-80d4-48bc-bb72-932e2602b5e7', version: 1, type: 'core/button', props: { label: 'Browse', href: '/properties', style: 'primary' } },
    ], { mode: 'public' })}</>);
    expect(html).toContain('<h2 class="cms-block-heading">Welcome</h2>');
    expect(html).toContain('<p class="cms-block-paragraph">Find your next home.</p>');
    expect(html).toContain('href="/properties"');
  });

  it('shows unavailable blocks to operators without crashing preview', () => {
    const html = renderToStaticMarkup(<>{renderCmsBlock({ blockId, version: 1, type: 'plugin/missing', props: {} }, { mode: 'preview' })}</>);
    expect(html).toContain('role="alert"');
    expect(html).toContain('plugin/missing');
  });

  it('omits unavailable or invalid blocks from public output', () => {
    expect(renderCmsBlock({ blockId, version: 1, type: 'plugin/missing', props: {} }, { mode: 'public' })).toBeNull();
    expect(renderCmsBlock({ blockId, version: 1, type: 'core/heading', props: { text: 'Bad', level: 9 } }, { mode: 'public' })).toBeNull();
  });

  it('contains migration failures at the individual block boundary', () => {
    const registry = createCmsBlockRegistry([{ ...coreCmsBlockRegistry.definitions[0], migrate: () => { throw new Error('broken migration'); } }]);
    const block = { blockId, version: 1, type: 'core/heading', props: { text: 'Welcome', level: 2 } };
    expect(renderCmsBlock(block, { mode: 'public', registry })).toBeNull();
    expect(renderToStaticMarkup(<>{renderCmsBlock(block, { mode: 'preview', registry })}</>)).toContain('role="alert"');
  });
});

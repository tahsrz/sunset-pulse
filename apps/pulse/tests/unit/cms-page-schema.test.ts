import { describe, expect, it } from 'vitest';
import { cmsPageDraftSchema } from '@/lib/cms/pages/pageSchema';

const blockId = '276fd207-2f8c-44f1-a958-9cbc641c1e4c';

describe('CMS page schema', () => {
  it('accepts ordered versioned core content blocks', () => {
    const draft = cmsPageDraftSchema.parse({
      title: 'About Sunset Pulse',
      slug: 'about',
      blocks: [
        { blockId, version: 1, type: 'core/heading', props: { text: 'About us', level: 1 } },
        { blockId: '376fd207-2f8c-44f1-a958-9cbc641c1e4c', version: 1, type: 'core/paragraph', props: { text: 'Local expertise.' } },
        { blockId: '476fd207-2f8c-44f1-a958-9cbc641c1e4c', version: 1, type: 'core/image', props: { src: 'https://example.com/team.jpg', alt: 'The team' } },
        { blockId: '576fd207-2f8c-44f1-a958-9cbc641c1e4c', version: 1, type: 'core/button', props: { label: 'Contact us', href: '/contact' } },
      ],
    });

    expect(draft.templateId).toBe('sunset/page');
    expect(draft.blocks.map(({ type }) => type)).toEqual(['core/heading', 'core/paragraph', 'core/image', 'core/button']);
  });

  it('rejects unknown blocks and unsafe link protocols', () => {
    expect(() => cmsPageDraftSchema.parse({ title: 'Page', slug: 'page', blocks: [{ blockId, version: 1, type: 'plugin/unknown', props: {} }] })).toThrow();
    expect(() => cmsPageDraftSchema.parse({ title: 'Page', slug: 'page', blocks: [{ blockId, version: 1, type: 'core/button', props: { label: 'Open', href: 'javascript:alert(1)' } }] })).toThrow();
  });

  it('rejects duplicate or malformed document fields', () => {
    const duplicateBlock = { blockId, version: 1, type: 'core/paragraph', props: { text: 'Repeated identity' } };
    expect(() => cmsPageDraftSchema.parse({ title: 'Page', slug: 'page', blocks: [duplicateBlock, duplicateBlock] })).toThrow('Block IDs must be unique within a page');
    expect(() => cmsPageDraftSchema.parse({ title: '', slug: 'Invalid Slug', blocks: [] })).toThrow();
    expect(() => cmsPageDraftSchema.parse({ title: 'Page', slug: 'page', extra: true, blocks: [] })).toThrow();
  });
});

import { coreCmsBlockRegistry, type CmsBlockRegistry } from './blockRegistry';
import type { CmsBlock } from './pageSchema';

export function createCmsEditorBlock(type: string, blockId = crypto.randomUUID(), registry: CmsBlockRegistry = coreCmsBlockRegistry): CmsBlock {
  const definition = registry.get(type);
  if (!definition) throw new Error(`CMS_BLOCK_TYPE_NOT_REGISTERED:${type}`);
  const candidate = defaultBlock(type, blockId);
  const parsed = definition.schema.safeParse(candidate);
  if (!parsed.success) throw new Error(`CMS_BLOCK_DEFAULT_INVALID:${type}`);
  return parsed.data as CmsBlock;
}

export function moveCmsEditorBlock(blocks: readonly CmsBlock[], blockId: string, direction: -1 | 1): CmsBlock[] {
  const from = blocks.findIndex((block) => block.blockId === blockId);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= blocks.length) return [...blocks];
  const next = [...blocks];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

export function duplicateCmsEditorBlock(blocks: readonly CmsBlock[], blockId: string, nextId = crypto.randomUUID()): CmsBlock[] {
  const index = blocks.findIndex((block) => block.blockId === blockId);
  if (index < 0) return [...blocks];
  const clone = structuredClone(blocks[index]) as CmsBlock;
  clone.blockId = nextId;
  return [...blocks.slice(0, index + 1), clone, ...blocks.slice(index + 1)];
}

export function deleteCmsEditorBlock(blocks: readonly CmsBlock[], blockId: string): CmsBlock[] {
  return blocks.filter((block) => block.blockId !== blockId);
}

function defaultBlock(type: string, blockId: string): unknown {
  const base = { blockId, version: 1 as const };
  switch (type) {
    case 'core/heading': return { ...base, type, props: { text: 'New heading', level: 2 } };
    case 'core/paragraph': return { ...base, type, props: { text: 'Start writing…' } };
    case 'core/image': return { ...base, type, props: { src: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa', alt: '', width: 1200, height: 800 } };
    case 'core/button': return { ...base, type, props: { label: 'Learn more', href: '/', style: 'primary' } };
    default: return null;
  }
}

import React, { createElement, type ReactNode } from 'react';
import Image from 'next/image';
import { z } from 'zod';
import {
  buttonBlockSchema,
  headingBlockSchema,
  imageBlockSchema,
  paragraphBlockSchema,
} from './pageSchema';

export type CmsBlockRenderMode = 'preview' | 'public';

export type CmsBlockDefinition = Readonly<{
  type: string;
  title: string;
  schema: z.ZodTypeAny;
  latestVersion: number;
  migrate: (block: unknown) => unknown;
  render: (block: any) => ReactNode;
}>;

export function createCmsBlockRegistry(definitions: readonly CmsBlockDefinition[]) {
  const byType = new Map<string, CmsBlockDefinition>();
  for (const definition of definitions) {
    if (byType.has(definition.type)) throw new Error(`DUPLICATE_BLOCK_TYPE:${definition.type}`);
    byType.set(definition.type, Object.freeze(definition));
  }
  return Object.freeze({
    definitions: Object.freeze([...definitions]),
    get: (type: string) => byType.get(type),
  });
}

export type CmsBlockRegistry = ReturnType<typeof createCmsBlockRegistry>;

const identityMigration = (block: unknown) => block;

export const coreCmsBlockRegistry = createCmsBlockRegistry([
  {
    type: 'core/heading',
    title: 'Heading',
    schema: headingBlockSchema,
    latestVersion: 1,
    migrate: identityMigration,
    render: (block: z.infer<typeof headingBlockSchema>) => createElement(
      `h${block.props.level}`,
      { id: block.props.anchor, className: 'cms-block-heading' },
      block.props.text,
    ),
  },
  {
    type: 'core/paragraph',
    title: 'Paragraph',
    schema: paragraphBlockSchema,
    latestVersion: 1,
    migrate: identityMigration,
    render: (block: z.infer<typeof paragraphBlockSchema>) => <p className="cms-block-paragraph">{block.props.text}</p>,
  },
  {
    type: 'core/image',
    title: 'Image',
    schema: imageBlockSchema,
    latestVersion: 1,
    migrate: identityMigration,
    render: (block: z.infer<typeof imageBlockSchema>) => (
      <figure className="cms-block-image">
        <Image src={block.props.src} alt={block.props.alt} width={block.props.width} height={block.props.height} sizes="(max-width: 768px) 100vw, 1200px" />
        {block.props.caption ? <figcaption>{block.props.caption}</figcaption> : null}
      </figure>
    ),
  },
  {
    type: 'core/button',
    title: 'Button',
    schema: buttonBlockSchema,
    latestVersion: 1,
    migrate: identityMigration,
    render: (block: z.infer<typeof buttonBlockSchema>) => (
      <a className={`cms-block-button cms-block-button--${block.props.style}`} href={block.props.href}>
        {block.props.label}
      </a>
    ),
  },
]);

export function renderCmsBlock(block: unknown, options: { mode: CmsBlockRenderMode; registry?: CmsBlockRegistry }): ReactNode {
  const registry = options.registry || coreCmsBlockRegistry;
  const type = readBlockType(block);
  const definition = type ? registry.get(type) : undefined;
  if (!definition) return renderUnavailableBlock(type, options.mode);
  try {
    const migrated = definition.migrate(block);
    const parsed = definition.schema.safeParse(migrated);
    if (!parsed.success) return renderUnavailableBlock(type, options.mode);
    return <div key={parsed.data.blockId} className="cms-block" data-block-id={parsed.data.blockId} data-block-type={type}>{definition.render(parsed.data)}</div>;
  } catch {
    return renderUnavailableBlock(type, options.mode);
  }
}

export function renderCmsPageBlocks(blocks: unknown[], options: { mode: CmsBlockRenderMode; registry?: CmsBlockRegistry }) {
  return blocks.map((block, index) => {
    const rendered = renderCmsBlock(block, options);
    return rendered == null ? null : <div key={readBlockId(block) || `block-${index}`}>{rendered}</div>;
  });
}

function renderUnavailableBlock(type: string | null, mode: CmsBlockRenderMode) {
  if (mode === 'public') return null;
  return <div className="cms-block-warning" role="alert" data-unsupported-block={type || 'unknown'}>This block is unavailable or invalid: {type || 'unknown'}.</div>;
}

function readBlockType(block: unknown) {
  if (!block || typeof block !== 'object') return null;
  return typeof (block as Record<string, unknown>).type === 'string' ? String((block as Record<string, unknown>).type) : null;
}

function readBlockId(block: unknown) {
  if (!block || typeof block !== 'object') return null;
  return typeof (block as Record<string, unknown>).blockId === 'string' ? String((block as Record<string, unknown>).blockId) : null;
}

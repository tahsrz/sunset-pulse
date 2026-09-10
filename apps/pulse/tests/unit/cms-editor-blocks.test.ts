import { describe, expect, it } from 'vitest';
import { createCmsEditorBlock, deleteCmsEditorBlock, duplicateCmsEditorBlock, moveCmsEditorBlock } from '@/lib/cms/pages/editorBlocks';

const firstId = '276fd207-2f8c-44f1-a958-9cbc641c1e4c';
const secondId = '7cfa20a0-8b0d-41a9-816c-d42a4ea04716';
const duplicateId = '4c6958c7-80d4-48bc-bb72-932e2602b5e7';

describe('CMS editor block operations', () => {
  const heading = createCmsEditorBlock('core/heading', firstId);
  const paragraph = createCmsEditorBlock('core/paragraph', secondId);

  it('creates schema-valid defaults only for registered block types', () => {
    expect(heading).toMatchObject({ blockId: firstId, type: 'core/heading', version: 1 });
    expect(() => createCmsEditorBlock('plugin/missing', firstId)).toThrow('CMS_BLOCK_TYPE_NOT_REGISTERED:plugin/missing');
  });

  it('moves blocks without changing their stable IDs or mutating input', () => {
    const original = [heading, paragraph];
    const moved = moveCmsEditorBlock(original, secondId, -1);
    expect(moved.map((block) => block.blockId)).toEqual([secondId, firstId]);
    expect(original.map((block) => block.blockId)).toEqual([firstId, secondId]);
  });

  it('duplicates with a fresh ID and deletes by stable ID', () => {
    const duplicated = duplicateCmsEditorBlock([heading], firstId, duplicateId);
    expect(duplicated).toHaveLength(2);
    expect(duplicated[1]).toEqual({ ...heading, blockId: duplicateId });
    expect(deleteCmsEditorBlock(duplicated, firstId).map((block) => block.blockId)).toEqual([duplicateId]);
  });
});

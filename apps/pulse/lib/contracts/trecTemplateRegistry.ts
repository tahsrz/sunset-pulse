import {
  TREC_CONTRACT_ADDENDA,
  TREC_OTHER_FORMS,
  TREC_PROMULGATED_CONTRACTS,
  type TrecPromulgatedContract
} from '@/lib/contracts/trecPromulgatedContracts';
import { getTrecTemplateMapping } from '@/lib/contracts/trecTemplateMappings';

export type TrecTemplateStatus = 'missing_template' | 'template_uploaded' | 'mapped';

export type TrecTemplateRegistryRow = TrecPromulgatedContract & {
  category: 'contract' | 'addendum' | 'other';
  templatePath: string | null;
  mappingPath: string | null;
  status: TrecTemplateStatus;
};

export const TREC_TEMPLATE_STORAGE_ROOT = 'private/contracts/trec';

export const TREC_TEMPLATE_REGISTRY: TrecTemplateRegistryRow[] = [
  ...toTemplateRows(TREC_PROMULGATED_CONTRACTS, 'contract'),
  ...toTemplateRows(TREC_CONTRACT_ADDENDA, 'addendum'),
  ...toTemplateRows(TREC_OTHER_FORMS, 'other')
];

export function getTrecTemplateRegistry(currentOnly = true) {
  const rows = currentOnly ? latestByName(TREC_TEMPLATE_REGISTRY) : TREC_TEMPLATE_REGISTRY;
  return rows.sort((a, b) => `${a.category}-${a.formName}`.localeCompare(`${b.category}-${b.formName}`));
}

export function getTemplateRow(formId: string) {
  return TREC_TEMPLATE_REGISTRY.find((row) => row.formId === formId) || null;
}

function toTemplateRows(items: TrecPromulgatedContract[], category: TrecTemplateRegistryRow['category']) {
  return items.map((item) => ({
    ...item,
    category,
    ...getTemplateMetadata(item.formId)
  }));
}

function getTemplateMetadata(formId: string) {
  const mapping = getTrecTemplateMapping(formId);
  return {
    templatePath: mapping?.templatePath || null,
    mappingPath: mapping ? `apps/pulse/lib/contracts/trecTemplateMappings.ts#${formId}` : null,
    status: mapping ? 'mapped' as const : 'missing_template' as const
  };
}

function latestByName(items: TrecTemplateRegistryRow[]) {
  const seen = new Map<string, TrecTemplateRegistryRow>();
  for (const item of items) {
    const key = `${item.category}:${item.formName}`;
    const current = seen.get(key);
    if (!current || item.effectiveDate > current.effectiveDate) {
      seen.set(key, item);
    }
  }
  return Array.from(seen.values());
}

export type TrecPdfFieldMapping = Record<string, string>;

export type TrecPdfOverlayMapping = {
  key: string;
  pageIndex: number;
  x: number;
  y: number;
  size?: number;
  maxWidth?: number;
  align?: 'left' | 'right' | 'center';
  format?: 'text' | 'money' | 'date';
};

export type TrecTemplateMapping = {
  formId: string;
  formName: string;
  templatePath: string;
  fieldMapping?: TrecPdfFieldMapping;
  overlayMapping?: TrecPdfOverlayMapping[];
};

export const TREC_TEMPLATE_MAPPINGS: Record<string, TrecTemplateMapping> = {
  '20-19': {
    formId: '20-19',
    formName: 'One to Four Family Residential Contract (Resale)',
    templatePath: 'private/contracts/trec/20-19.pdf',
    overlayMapping: [
      { key: 'trec.common.property_address', pageIndex: 0, x: 420, y: 757, size: 8, maxWidth: 138 },
      { key: 'trec.common.seller_names', pageIndex: 0, x: 252, y: 712, size: 9, maxWidth: 250 },
      { key: 'trec.common.buyer_names', pageIndex: 0, x: 350, y: 694, size: 9, maxWidth: 190 },
      { key: 'trec.common.city', pageIndex: 0, x: 286, y: 632, size: 9, maxWidth: 120 },
      { key: 'trec.common.county', pageIndex: 0, x: 458, y: 632, size: 9, maxWidth: 90 },
      { key: 'trec.common.property_address', pageIndex: 0, x: 190, y: 616, size: 9, maxWidth: 330 },
      { key: 'trec.terms.sales_price', pageIndex: 0, x: 474, y: 403, size: 9, maxWidth: 72, align: 'right', format: 'money' },
      { key: 'trec.terms.sales_price', pageIndex: 0, x: 474, y: 371, size: 9, maxWidth: 72, align: 'right', format: 'money' },
      { key: 'trec.common.property_address', pageIndex: 1, x: 418, y: 758, size: 8, maxWidth: 138 },
      { key: 'trec.terms.title_company', pageIndex: 1, x: 214, y: 714, size: 9, maxWidth: 196 },
      { key: 'trec.terms.earnest_money', pageIndex: 1, x: 320, y: 698, size: 9, maxWidth: 72, align: 'right', format: 'money' },
      { key: 'trec.terms.option_fee', pageIndex: 1, x: 462, y: 698, size: 9, maxWidth: 72, align: 'right', format: 'money' },
      { key: 'trec.terms.option_period_days', pageIndex: 1, x: 92, y: 581, size: 9, maxWidth: 28, align: 'center' },
      { key: 'trec.common.property_address', pageIndex: 2, x: 418, y: 758, size: 8, maxWidth: 138 },
      { key: 'trec.terms.special_terms', pageIndex: 10, x: 62, y: 604, size: 8, maxWidth: 490 },
      { key: 'trec.terms.closing_date', pageIndex: 10, x: 264, y: 694, size: 9, maxWidth: 100, format: 'date' },
      { key: 'trec.common.effective_date', pageIndex: 10, x: 390, y: 89, size: 9, maxWidth: 105, format: 'date' }
    ]
  }
};

export function getTrecTemplateMapping(formId?: string | null) {
  if (!formId) return null;
  return TREC_TEMPLATE_MAPPINGS[formId] || null;
}

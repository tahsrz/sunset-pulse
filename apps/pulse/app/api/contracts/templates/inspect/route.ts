export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { PDFCheckBox, PDFDropdown, PDFDocument, PDFOptionList, PDFRadioGroup, PDFTextField } from 'pdf-lib';
import { getTemplateRow } from '@/lib/contracts/trecTemplateRegistry';
import { getOperatorAccess } from '@/lib/core/operator_access';

type InspectedField = {
  name: string;
  type: string;
  mappedKey: string;
  options?: string[];
};

export const POST = async (request: NextRequest) => {
  try {
    const access = await getOperatorAccess(request.headers.get('host'));
    if (!access.allowed) {
      return NextResponse.json({ error: 'Realtor, operator, or admin access required.' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const formId = String(formData.get('formId') || '');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'PDF file is required.' }, { status: 400 });
    }

    if (file.type && file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Upload a PDF template.' }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const form = pdf.getForm();
    const fields = form.getFields().map(inspectField).sort((a, b) => a.name.localeCompare(b.name));
    const selectedTemplate = formId ? getTemplateRow(formId) : null;

    return NextResponse.json({
      data: {
        fileName: file.name,
        fileSize: file.size,
        pageCount: pdf.getPageCount(),
        formId: formId || selectedTemplate?.formId || null,
        formName: selectedTemplate?.formName || null,
        fieldCount: fields.length,
        fields,
        starterMapping: buildStarterMapping(fields),
      },
    });
  } catch (error: any) {
    console.error('[TREC_TEMPLATE_INSPECT_ERROR]', error);
    return NextResponse.json({ error: 'Failed to inspect PDF template.', detail: error.message }, { status: 500 });
  }
};

function inspectField(field: any): InspectedField {
  const name = field.getName();
  const type = getFieldType(field);
  return {
    name,
    type,
    mappedKey: suggestMappedKey(name),
    options: getFieldOptions(field),
  };
}

function getFieldType(field: any) {
  if (field instanceof PDFTextField) return 'text';
  if (field instanceof PDFCheckBox) return 'checkbox';
  if (field instanceof PDFRadioGroup) return 'radio';
  if (field instanceof PDFDropdown) return 'dropdown';
  if (field instanceof PDFOptionList) return 'option_list';
  return field.constructor?.name || 'unknown';
}

function getFieldOptions(field: any) {
  if (field instanceof PDFDropdown || field instanceof PDFOptionList || field instanceof PDFRadioGroup) {
    try {
      return field.getOptions();
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function buildStarterMapping(fields: InspectedField[]) {
  return fields.reduce<Record<string, string>>((acc, field) => {
    acc[field.name] = field.mappedKey;
    return acc;
  }, {});
}

function suggestMappedKey(fieldName: string) {
  const normalized = fieldName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const hints: Array<[RegExp, string]> = [
    [/buyer.*name|purchaser/, 'trec.common.buyer_names'],
    [/seller.*name|owner/, 'trec.common.seller_names'],
    [/property.*address|address/, 'trec.common.property_address'],
    [/city/, 'trec.common.city'],
    [/county/, 'trec.common.county'],
    [/sales.*price|sale.*price|cash.*price|price/, 'trec.terms.sales_price'],
    [/earnest/, 'trec.terms.earnest_money'],
    [/option.*fee/, 'trec.terms.option_fee'],
    [/option.*period|option.*days/, 'trec.terms.option_period_days'],
    [/closing|close.*date/, 'trec.terms.closing_date'],
    [/title.*company|escrow/, 'trec.terms.title_company'],
    [/survey/, 'trec.terms.survey_preference'],
    [/special.*provision|special.*term/, 'trec.terms.special_terms'],
    [/buyer.*signature/, 'signnow.role.buyer_1.signature'],
    [/seller.*signature/, 'signnow.role.seller_1.signature'],
    [/date.*signed|signature.*date/, 'signnow.common.signed_date'],
  ];

  const match = hints.find(([pattern]) => pattern.test(normalized));
  return match?.[1] || `unmapped.${normalized || 'field'}`;
}

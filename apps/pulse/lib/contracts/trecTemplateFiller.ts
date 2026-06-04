import fs from 'fs';
import path from 'path';
import { PDFCheckBox, PDFDocument, PDFDropdown, PDFOptionList, PDFRadioGroup, PDFTextField, StandardFonts, rgb } from 'pdf-lib';
import { getTrecTemplateMapping } from '@/lib/contracts/trecTemplateMappings';

type FillResult = {
  appendedForms: string[];
  missingTemplates: string[];
  unmappedFields: Array<{ formId: string; fieldName: string; mappedKey: string }>;
};

export async function appendFilledTrecTemplates(targetPdf: PDFDocument, draftPayload: any): Promise<FillResult> {
  const result: FillResult = {
    appendedForms: [],
    missingTemplates: [],
    unmappedFields: []
  };

  const forms = getSelectedForms(draftPayload);
  for (const formRow of forms) {
    const mapping = getTrecTemplateMapping(formRow.formId);
    if (!mapping) continue;

    const templatePath = path.join(process.cwd(), mapping.templatePath);
    if (!fs.existsSync(templatePath)) {
      result.missingTemplates.push(mapping.formId);
      continue;
    }

    const sourcePdf = await PDFDocument.load(fs.readFileSync(templatePath), { ignoreEncryption: true });
    const form = sourcePdf.getForm();
    const font = await sourcePdf.embedFont(StandardFonts.Helvetica);

    if (mapping.fieldMapping) {
      for (const [pdfFieldName, mappedKey] of Object.entries(mapping.fieldMapping)) {
        const field = form.getFields().find((candidate) => candidate.getName() === pdfFieldName);
        if (!field) {
          result.unmappedFields.push({ formId: mapping.formId, fieldName: pdfFieldName, mappedKey });
          continue;
        }

        fillField(field, getMappedValue(draftPayload, mappedKey));
      }
      form.flatten();
    }

    if (mapping.overlayMapping) {
      for (const overlay of mapping.overlayMapping) {
        const page = sourcePdf.getPage(overlay.pageIndex);
        const rawValue = getMappedValue(draftPayload, overlay.key);
        if (!page || !rawValue) continue;
        drawOverlayText(page, formatOverlayValue(rawValue, overlay.format), {
          x: overlay.x,
          y: overlay.y,
          size: overlay.size || 9,
          maxWidth: overlay.maxWidth || 180,
          align: overlay.align || 'left',
          font
        });
      }
    }

    const copiedPages = await targetPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
    copiedPages.forEach((page) => targetPdf.addPage(page));
    result.appendedForms.push(mapping.formId);
  }

  return result;
}

function getSelectedForms(draftPayload: any) {
  return [
    draftPayload?.forms?.baseContract,
    ...(draftPayload?.forms?.addenda || []),
    ...(draftPayload?.forms?.otherForms || [])
  ].filter(Boolean);
}

function getMappedValue(draftPayload: any, mappedKey: string) {
  const value = draftPayload?.fieldMap?.[mappedKey];
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return String(value);
  return String(value);
}

function fillField(field: any, value: string) {
  if (!value) return;

  if (field instanceof PDFTextField) {
    field.setText(value);
    return;
  }

  if (field instanceof PDFCheckBox) {
    if (isAffirmative(value)) field.check();
    else field.uncheck();
    return;
  }

  if (field instanceof PDFRadioGroup || field instanceof PDFDropdown || field instanceof PDFOptionList) {
    const options = safeOptions(field);
    const match = options.find((option) => option.toLowerCase() === value.toLowerCase()) || options[0];
    if (match) field.select(match);
  }
}

function drawOverlayText(
  page: any,
  value: string,
  options: { x: number; y: number; size: number; maxWidth: number; align: 'left' | 'right' | 'center'; font: any }
) {
  const lines = wrapText(value, options.font, options.size, options.maxWidth).slice(0, 3);
  lines.forEach((line, index) => {
    const width = options.font.widthOfTextAtSize(line, options.size);
    const x = options.align === 'right'
      ? options.x + options.maxWidth - width
      : options.align === 'center'
        ? options.x + (options.maxWidth - width) / 2
        : options.x;

    page.drawText(line, {
      x,
      y: options.y - index * (options.size + 2),
      size: options.size,
      font: options.font,
      color: rgb(0, 0, 0)
    });
  });
}

function wrapText(value: string, font: any, size: number, maxWidth: number) {
  const words = String(value).split(/\s+/);
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }

  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function formatOverlayValue(value: string, format?: 'text' | 'money' | 'date') {
  if (format === 'money') {
    const numeric = Number(String(value).replace(/[^0-9.]/g, ''));
    if (Number.isFinite(numeric) && numeric > 0) {
      return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(numeric);
    }
  }

  if (format === 'date') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', { timeZone: 'UTC' });
    }
  }

  return value;
}

function safeOptions(field: any) {
  try {
    return field.getOptions() || [];
  } catch {
    return [];
  }
}

function isAffirmative(value: string) {
  return ['yes', 'true', 'checked', '1', 'x'].includes(value.trim().toLowerCase());
}

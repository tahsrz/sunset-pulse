import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { appendFilledTrecTemplates } from '@/lib/contracts/trecTemplateFiller';
import { hashPayload } from '@/lib/signing/signingHash';

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 48;
const LINE_HEIGHT = 15;

type SigningPacketLike = {
  title: string;
  status: string;
  draftPayload: any;
  payloadHash: string;
  finalHash?: string;
  signerLinks: any[];
  auditTrail: any[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export async function generateSigningCertificatePdf(packet: SigningPacketLike) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdf.embedFont(StandardFonts.Courier);
  const colors = {
    ink: rgb(0.08, 0.1, 0.14),
    muted: rgb(0.36, 0.4, 0.46),
    rule: rgb(0.78, 0.82, 0.88),
    accent: rgb(0.02, 0.45, 0.55),
    success: rgb(0.05, 0.52, 0.3),
  };

  const context = { pdf, regular, bold, mono, colors, page: pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]), y: PAGE_HEIGHT - MARGIN };
  const draft = packet.draftPayload || {};
  const templateResult = await appendFilledTrecTemplates(pdf, draft);

  if (templateResult.appendedForms.length > 0) {
    pdf.removePage(0);
    context.page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    context.y = PAGE_HEIGHT - MARGIN;
    drawTemplateSummary(context, templateResult);
  } else {
    drawOfferPacketDraft(context, packet, draft);
  }

  context.page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  context.y = PAGE_HEIGHT - MARGIN;

  drawHeader(context, 'Sunset Pulse Signing Certificate', 'Electronic Signature Audit Package');
  drawKeyValue(context, 'Packet', packet.title);
  drawKeyValue(context, 'Status', packet.status);
  drawKeyValue(context, 'Generated', new Date().toISOString());
  drawKeyValue(context, 'Original Payload Hash', packet.payloadHash);
  drawKeyValue(context, 'Final Package Hash', packet.finalHash || computeFinalHash(packet));
  drawRule(context);
  drawText(context, 'This certificate summarizes the electronic signing activity for the attached offer packet draft. It is generated from the stored signing packet, signer events, and cryptographic hashes.', 10, regular, colors.muted);

  drawSection(context, 'Transaction');
  drawKeyValue(context, 'Property', draft.transaction?.propertyAddress || 'N/A');
  drawKeyValue(context, 'Buyer(s)', (draft.parties?.buyers || []).join(', ') || 'N/A');
  drawKeyValue(context, 'Seller(s)', (draft.parties?.sellers || []).join(', ') || 'N/A');
  drawKeyValue(context, 'Offer Price', formatMoney(draft.offer?.offerPrice));
  drawKeyValue(context, 'Closing Date', draft.offer?.closingDate || 'N/A');
  drawKeyValue(context, 'Base Contract', draft.forms?.baseContract ? `${draft.forms.baseContract.formName} (${draft.forms.baseContract.formId})` : 'N/A');

  drawSection(context, 'Signer Evidence');
  for (const signer of packet.signerLinks || []) {
    ensureSpace(context, 105);
    drawText(context, `${signer.name || 'Unknown signer'} (${signer.role || 'signer'})`, 11, bold, colors.ink);
    drawKeyValue(context, 'Status', signer.status || 'pending');
    drawKeyValue(context, 'Email', signer.email || 'N/A');
    drawKeyValue(context, 'Viewed At', formatDate(signer.viewedAt));
    drawKeyValue(context, 'Signed At', formatDate(signer.signedAt));
    drawKeyValue(context, 'Consent', signer.consentText || 'N/A');
    if (signer.signature?.typedName) drawKeyValue(context, 'Typed Name', signer.signature.typedName);
    await drawSignatureImage(context, signer.signature?.signatureDataUrl);
    context.y -= 8;
  }

  drawSection(context, 'Audit Trail');
  for (const event of packet.auditTrail || []) {
    ensureSpace(context, 72);
    drawText(context, `${formatDate(event.createdAt)} - ${event.type}`, 10, bold, colors.ink);
    drawText(context, `Actor: ${event.actorName || 'N/A'} (${event.actorRole || 'N/A'})`, 9, regular, colors.muted);
    drawText(context, `IP: ${event.ipAddress || 'N/A'} | User Agent: ${event.userAgent || 'N/A'}`, 8, regular, colors.muted);
    drawText(context, `Payload Hash: ${event.payloadHash || packet.payloadHash}`, 8, mono, colors.muted);
    context.y -= 6;
  }

  drawFooterOnAllPages(context);
  return pdf.save();
}

function drawOfferPacketDraft(context: any, packet: SigningPacketLike, draft: any) {
  drawHeader(context, 'Filled Offer Packet Draft', 'Generated Contract Package');
  drawText(
    context,
    'This generated packet reflects the structured offer fields captured in Sunset Pulse. It is a filled draft package for realtor review and can later be replaced with official TREC PDF template filling when template files are added.',
    10,
    context.regular,
    context.colors.muted
  );

  drawSection(context, 'Parties And Property');
  drawKeyValue(context, 'Buyer(s)', (draft.parties?.buyers || []).join(', ') || 'N/A');
  drawKeyValue(context, 'Seller(s)', (draft.parties?.sellers || []).join(', ') || 'N/A');
  drawKeyValue(context, 'Realtor', draft.parties?.realtorName || 'N/A');
  drawKeyValue(context, 'Brokerage', draft.parties?.brokerage || 'N/A');
  drawKeyValue(context, 'Property Address', draft.transaction?.propertyAddress || 'N/A');
  drawKeyValue(context, 'City / County / State', `${draft.transaction?.city || 'N/A'}, ${draft.transaction?.county || 'N/A'} County, ${draft.transaction?.state || 'TX'}`);
  drawKeyValue(context, 'MLS / Reference', draft.transaction?.mlsNumber || 'N/A');
  drawKeyValue(context, 'List Price', formatMoney(draft.transaction?.listPrice));
  drawKeyValue(context, 'Year Built', draft.transaction?.yearBuilt ? String(draft.transaction.yearBuilt) : 'N/A');

  drawSection(context, 'Offer Terms');
  drawKeyValue(context, 'Sales Price', formatMoney(draft.offer?.offerPrice));
  drawKeyValue(context, 'Earnest Money', formatMoney(draft.offer?.earnestMoney));
  drawKeyValue(context, 'Option Fee', formatMoney(draft.offer?.optionFee));
  drawKeyValue(context, 'Option Period', draft.offer?.optionDays ? `${draft.offer.optionDays} days` : 'N/A');
  drawKeyValue(context, 'Closing Date', draft.offer?.closingDate || 'N/A');
  drawKeyValue(context, 'Financing Type', draft.offer?.financingType || 'N/A');
  drawKeyValue(context, 'Down Payment', draft.offer?.downPayment || 'N/A');
  drawKeyValue(context, 'Title Company', draft.offer?.titleCompany || 'N/A');
  drawKeyValue(context, 'Survey Preference', draft.offer?.surveyPreference || 'N/A');
  drawKeyValue(context, 'Residential Service Contract', formatMoney(draft.offer?.residentialServiceContract));
  drawKeyValue(context, 'Special Terms', draft.offer?.specialTerms || 'N/A');

  drawSection(context, 'Forms Included');
  if (draft.forms?.baseContract) {
    drawKeyValue(context, 'Base Contract', `${draft.forms.baseContract.formName} (${draft.forms.baseContract.formId})`);
  }
  for (const form of draft.forms?.addenda || []) {
    drawKeyValue(context, 'Addendum', `${form.formName} (${form.formId})`);
  }
  for (const form of draft.forms?.otherForms || []) {
    drawKeyValue(context, 'Other Form', `${form.formName} (${form.formId})`);
  }

  drawSection(context, 'Signature Status');
  for (const signer of packet.signerLinks || []) {
    drawKeyValue(context, `${signer.role || 'Signer'} - ${signer.name || 'N/A'}`, signer.status || 'pending');
  }

  context.page = context.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  context.y = PAGE_HEIGHT - MARGIN;
  drawHeader(context, 'Contract Field Map', 'Template And Signing Integration Data');
  drawText(
    context,
    'These keys are the bridge between the offer builder and future official PDF field filling or signing-template APIs.',
    10,
    context.regular,
    context.colors.muted
  );
  drawSection(context, 'Mapped Fields');
  for (const [key, value] of Object.entries(draft.fieldMap || {})) {
    drawKeyValue(context, key, value === null || value === undefined || value === '' ? 'N/A' : String(value));
  }
}

function drawTemplateSummary(context: any, templateResult: Awaited<ReturnType<typeof appendFilledTrecTemplates>>) {
  drawHeader(context, 'Official Template Fill Summary', 'Generated Contract Package');
  drawText(
    context,
    'Official PDF template pages were filled and prepended to this package. This summary captures any template gaps detected while generating the package.',
    10,
    context.regular,
    context.colors.muted
  );
  drawSection(context, 'Templates Filled');
  drawKeyValue(context, 'Form IDs', templateResult.appendedForms.join(', ') || 'N/A');

  if (templateResult.missingTemplates.length > 0) {
    drawSection(context, 'Missing Template Files');
    for (const formId of templateResult.missingTemplates) {
      drawKeyValue(context, formId, 'Template mapping exists, but the PDF file was not found.');
    }
  }

  if (templateResult.unmappedFields.length > 0) {
    drawSection(context, 'Fields Not Found In PDF');
    for (const field of templateResult.unmappedFields) {
      drawKeyValue(context, `${field.formId}: ${field.fieldName}`, field.mappedKey);
    }
  }
}

function drawHeader(context: any, title: string, subtitle = 'Electronic Signature Audit Package') {
  context.page.drawText(title, { x: MARGIN, y: context.y, size: 21, font: context.bold, color: context.colors.ink });
  context.y -= 24;
  context.page.drawText(subtitle, { x: MARGIN, y: context.y, size: 10, font: context.regular, color: context.colors.accent });
  context.y -= 20;
  drawRule(context);
}

function drawSection(context: any, title: string) {
  ensureSpace(context, 48);
  context.y -= 8;
  context.page.drawText(title, { x: MARGIN, y: context.y, size: 13, font: context.bold, color: context.colors.accent });
  context.y -= 18;
}

function drawKeyValue(context: any, label: string, value: string) {
  ensureSpace(context, LINE_HEIGHT + 4);
  context.page.drawText(`${label}:`, { x: MARGIN, y: context.y, size: 9, font: context.bold, color: context.colors.ink });
  drawText(context, value || 'N/A', 9, context.regular, context.colors.ink, MARGIN + 142, context.y, PAGE_WIDTH - MARGIN - (MARGIN + 142));
  context.y -= LINE_HEIGHT;
}

function drawText(context: any, text: string, size: number, font: any, color: any, x = MARGIN, y = context.y, maxWidth = PAGE_WIDTH - MARGIN * 2) {
  const words = String(text || '').split(/\s+/);
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      ensureSpace(context, LINE_HEIGHT);
      context.page.drawText(line, { x, y: context.y, size, font, color });
      context.y -= LINE_HEIGHT;
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) {
    ensureSpace(context, LINE_HEIGHT);
    context.page.drawText(line, { x, y: context.y, size, font, color });
    if (x === MARGIN && y === context.y) context.y -= LINE_HEIGHT;
  }
}

function drawRule(context: any) {
  context.page.drawLine({
    start: { x: MARGIN, y: context.y },
    end: { x: PAGE_WIDTH - MARGIN, y: context.y },
    thickness: 1,
    color: context.colors.rule,
  });
  context.y -= 18;
}

async function drawSignatureImage(context: any, signatureDataUrl?: string) {
  if (!signatureDataUrl?.startsWith('data:image/png;base64,')) return;
  try {
    ensureSpace(context, 80);
    const bytes = Buffer.from(signatureDataUrl.split(',')[1], 'base64');
    const image = await context.pdf.embedPng(bytes);
    const scaled = image.scaleToFit(180, 52);
    context.page.drawRectangle({
      x: MARGIN + 142,
      y: context.y - 56,
      width: 190,
      height: 58,
      borderColor: context.colors.rule,
      borderWidth: 0.5,
    });
    context.page.drawImage(image, {
      x: MARGIN + 148,
      y: context.y - 51,
      width: scaled.width,
      height: scaled.height,
    });
    context.y -= 68;
  } catch {
    drawKeyValue(context, 'Signature Image', 'Unable to embed signature image');
  }
}

function ensureSpace(context: any, needed: number) {
  if (context.y - needed > MARGIN) return;
  context.page = context.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  context.y = PAGE_HEIGHT - MARGIN;
}

function drawFooterOnAllPages(context: any) {
  const pages = context.pdf.getPages();
  pages.forEach((page: any, index: number) => {
    page.drawText(`Sunset Pulse Signing Certificate | Page ${index + 1} of ${pages.length}`, {
      x: MARGIN,
      y: 26,
      size: 8,
      font: context.regular,
      color: context.colors.muted,
    });
  });
}

function computeFinalHash(packet: SigningPacketLike) {
  return hashPayload({ draftPayload: packet.draftPayload, signerLinks: packet.signerLinks });
}

function formatMoney(value?: number | null) {
  if (!value) return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function formatDate(value?: string | Date) {
  if (!value) return 'N/A';
  return new Date(value).toISOString();
}

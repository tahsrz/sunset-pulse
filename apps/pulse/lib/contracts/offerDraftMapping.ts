export type OfferDraftFormRow = {
  formName: string;
  formId: string;
};

export type OfferDraftInput = {
  realtorName: string;
  brokerage: string;
  buyerNames: string;
  sellerNames: string;
  propertyAddress: string;
  city: string;
  county: string;
  state: string;
  mlsNumber: string;
  listPrice: string;
  offerPrice: string;
  earnestMoney: string;
  optionFee: string;
  optionDays: string;
  closingDate: string;
  financingType: string;
  downPayment: string;
  titleCompany: string;
  surveyPreference: string;
  residentialServiceContract: string;
  specialTerms: string;
  recipientEmail: string;
  effectiveDate: string;
  yearBuilt: string;
  propertyType: string;
};

export type OfferDraftPayload = {
  version: 1;
  generatedAt: string;
  status: 'draft_for_realtor_review';
  disclaimer: string;
  transaction: {
    mlsNumber: string;
    propertyType: string;
    propertyAddress: string;
    city: string;
    county: string;
    state: string;
    listPrice: number | null;
    yearBuilt: number | null;
  };
  parties: {
    buyers: string[];
    sellers: string[];
    realtorName: string;
    brokerage: string;
    recipientEmail: string;
  };
  offer: {
    offerPrice: number | null;
    earnestMoney: number | null;
    optionFee: number | null;
    optionDays: number | null;
    closingDate: string;
    financingType: string;
    downPayment: string;
    titleCompany: string;
    surveyPreference: string;
    residentialServiceContract: number | null;
    specialTerms: string;
    effectiveDate: string;
  };
  forms: {
    baseContract: OfferDraftFormRow | null;
    addenda: OfferDraftFormRow[];
    otherForms: OfferDraftFormRow[];
  };
  signerRoles: {
    role: 'buyer' | 'seller' | 'realtor' | 'listing_agent';
    name: string;
    email?: string;
    routingOrder: number;
  }[];
  fieldMap: Record<string, string | number | null>;
};

export function buildOfferDraftPayload({
  intake,
  selectedBase,
  selectedAddendaRows,
  selectedOtherRows
}: {
  intake: OfferDraftInput;
  selectedBase?: OfferDraftFormRow;
  selectedAddendaRows: OfferDraftFormRow[];
  selectedOtherRows: OfferDraftFormRow[];
}): OfferDraftPayload {
  const buyers = splitPartyNames(intake.buyerNames);
  const sellers = splitPartyNames(intake.sellerNames);
  const baseContract = selectedBase ? normalizeForm(selectedBase) : null;
  const addenda = selectedAddendaRows.map(normalizeForm);
  const otherForms = selectedOtherRows.map(normalizeForm);

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    status: 'draft_for_realtor_review',
    disclaimer: 'Draft prepared for realtor review. This is not legal advice and should be checked against current TREC requirements.',
    transaction: {
      mlsNumber: intake.mlsNumber,
      propertyType: intake.propertyType,
      propertyAddress: intake.propertyAddress,
      city: intake.city,
      county: intake.county,
      state: intake.state || 'TX',
      listPrice: parseMoney(intake.listPrice),
      yearBuilt: parseNumber(intake.yearBuilt)
    },
    parties: {
      buyers,
      sellers,
      realtorName: intake.realtorName,
      brokerage: intake.brokerage,
      recipientEmail: intake.recipientEmail
    },
    offer: {
      offerPrice: parseMoney(intake.offerPrice),
      earnestMoney: parseMoney(intake.earnestMoney),
      optionFee: parseMoney(intake.optionFee),
      optionDays: parseNumber(intake.optionDays),
      closingDate: intake.closingDate,
      financingType: intake.financingType,
      downPayment: intake.downPayment,
      titleCompany: intake.titleCompany,
      surveyPreference: intake.surveyPreference,
      residentialServiceContract: parseMoney(intake.residentialServiceContract),
      specialTerms: intake.specialTerms,
      effectiveDate: intake.effectiveDate
    },
    forms: {
      baseContract,
      addenda,
      otherForms
    },
    signerRoles: buildSignerRoles({ buyers, sellers, intake }),
    fieldMap: buildFieldMap({ intake, buyers, sellers, baseContract, addenda, otherForms })
  };
}

export function stringifyOfferDraftPayload(payload: OfferDraftPayload) {
  return JSON.stringify(payload, null, 2);
}

function buildFieldMap({
  intake,
  buyers,
  sellers,
  baseContract,
  addenda,
  otherForms
}: {
  intake: OfferDraftInput;
  buyers: string[];
  sellers: string[];
  baseContract: OfferDraftFormRow | null;
  addenda: OfferDraftFormRow[];
  otherForms: OfferDraftFormRow[];
}) {
  return {
    'trec.common.buyer_names': buyers.join('; '),
    'trec.common.seller_names': sellers.join('; '),
    'trec.common.property_address': intake.propertyAddress,
    'trec.common.city': intake.city,
    'trec.common.county': intake.county,
    'trec.common.state': intake.state || 'TX',
    'trec.common.mls_reference': intake.mlsNumber,
    'trec.common.effective_date': intake.effectiveDate,
    'trec.common.base_contract_form_id': baseContract?.formId || null,
    'trec.common.addenda_form_ids': addenda.map((form) => form.formId).join(', '),
    'trec.common.other_form_ids': otherForms.map((form) => form.formId).join(', '),
    'trec.terms.sales_price': parseMoney(intake.offerPrice),
    'trec.terms.earnest_money': parseMoney(intake.earnestMoney),
    'trec.terms.option_fee': parseMoney(intake.optionFee),
    'trec.terms.option_period_days': parseNumber(intake.optionDays),
    'trec.terms.closing_date': intake.closingDate,
    'trec.terms.financing_type': intake.financingType,
    'trec.terms.down_payment': intake.downPayment,
    'trec.terms.title_company': intake.titleCompany,
    'trec.terms.survey_preference': intake.surveyPreference,
    'trec.terms.residential_service_contract_amount': parseMoney(intake.residentialServiceContract),
    'trec.terms.special_terms': intake.specialTerms,
    'signnow.role.buyer_1.name': buyers[0] || '',
    'signnow.role.buyer_2.name': buyers[1] || '',
    'signnow.role.seller_1.name': sellers[0] || '',
    'signnow.role.seller_2.name': sellers[1] || '',
    'signnow.role.realtor.name': intake.realtorName,
    'signnow.delivery.listing_agent_email': intake.recipientEmail
  };
}

function buildSignerRoles({
  buyers,
  sellers,
  intake
}: {
  buyers: string[];
  sellers: string[];
  intake: OfferDraftInput;
}) {
  return [
    ...buyers.map((name, index) => ({
      role: 'buyer' as const,
      name,
      routingOrder: 1 + index
    })),
    {
      role: 'realtor' as const,
      name: intake.realtorName || 'Realtor',
      routingOrder: buyers.length + 1
    },
    ...sellers.map((name, index) => ({
      role: 'seller' as const,
      name,
      routingOrder: buyers.length + 2 + index
    })),
    {
      role: 'listing_agent' as const,
      name: 'Listing Agent',
      email: intake.recipientEmail || undefined,
      routingOrder: buyers.length + sellers.length + 3
    }
  ].filter((role) => role.name);
}

function normalizeForm(form: OfferDraftFormRow) {
  return {
    formName: form.formName,
    formId: form.formId
  };
}

function splitPartyNames(value: string) {
  return value
    .split(/\s+(?:and|&)\s+|,/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseMoney(value: string) {
  const parsed = Number(String(value || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseNumber(value: string) {
  const parsed = Number(String(value || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

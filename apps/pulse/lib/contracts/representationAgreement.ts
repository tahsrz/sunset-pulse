import { z } from 'zod';

export const representationCommercialContextSchema = z.object({
  leadId: z.string().uuid(),
  funnelId: z.string().uuid(),
  bookingId: z.string().uuid().nullable().default(null),
  agentId: z.string().trim().min(1).max(120),
  site: z.string().trim().min(1).max(180),
}).strict();

export const representationAgreementSchema = z.object({
  clientName: z.string().trim().min(2).max(160),
  clientEmail: z.string().trim().email().max(320),
  brokerLegalName: z.string().trim().min(2).max(200),
  brokerLicenseNumber: z.string().trim().min(2).max(80),
  agentName: z.string().trim().min(2).max(160),
  agentLicenseNumber: z.string().trim().min(2).max(80),
  marketArea: z.string().trim().min(2).max(240),
  representationType: z.enum(['buyer', 'tenant']),
  exclusivity: z.enum(['exclusive', 'non_exclusive']),
  startsOn: z.string().date(),
  endsOn: z.string().date(),
  compensation: z.string().trim().min(2).max(500),
  intermediaryConsent: z.boolean(),
  commercialContext: representationCommercialContextSchema.optional(),
}).strict().refine((value) => value.endsOn >= value.startsOn, {
  message: 'The end date must be on or after the start date.',
  path: ['endsOn'],
});

export type RepresentationAgreementInput = z.infer<typeof representationAgreementSchema>;
export type RepresentationCommercialContext = z.infer<typeof representationCommercialContextSchema>;

export function buildRepresentationAgreement(input: RepresentationAgreementInput) {
  const clientRole = input.representationType === 'buyer' ? 'Buyer' : 'Tenant';
  const agreementTitle = `${input.exclusivity === 'exclusive' ? 'Exclusive' : 'Non-Exclusive'} ${clientRole} Representation Agreement`;
  const duties = [
    'Place the client’s interests above the broker’s interests while treating all parties honestly and fairly.',
    'Use reasonable care and diligence, follow the client’s lawful instructions, and present material information that may affect the client’s decisions.',
    'Protect confidential information as required by law, except when disclosure is authorized or legally required.',
    'Present offers and counteroffers promptly and account for money or property received for the client.',
    `Assist with property identification, showings, negotiation, and transaction coordination within ${input.marketArea}.`,
  ];

  return {
    schemaVersion: 1,
    kind: 'buyer_tenant_representation',
    reviewStatus: 'attorney_broker_review_required',
    agreementTitle,
    effectivePeriod: { startsOn: input.startsOn, endsOn: input.endsOn },
    parties: {
      clientName: input.clientName,
      clientEmail: input.clientEmail,
      clientRole,
      brokerLegalName: input.brokerLegalName,
      brokerLicenseNumber: input.brokerLicenseNumber,
      agentName: input.agentName,
      agentLicenseNumber: input.agentLicenseNumber,
    },
    scope: {
      marketArea: input.marketArea,
      representationType: input.representationType,
      exclusivity: input.exclusivity,
    },
    fiduciaryDuties: duties,
    clientResponsibilities: [
      'Provide accurate financial, property, and timing information needed for the representation.',
      'Communicate material changes and promptly review documents, disclosures, and recommended professional inspections.',
      input.exclusivity === 'exclusive'
        ? 'Refer property inquiries within the stated scope to the broker during the agreement term.'
        : 'Notify the broker when another broker is representing the client for a property within the stated scope.',
    ],
    compensation: {
      terms: input.compensation,
      notice: 'Broker compensation is not set by law and is fully negotiable. Any seller, landlord, or listing-broker payment may reduce, but does not automatically eliminate, the client’s payment obligation unless this agreement says so.',
    },
    intermediary: {
      consented: input.intermediaryConsent,
      notice: input.intermediaryConsent
        ? 'The client authorizes the broker to act as an intermediary only as permitted by Texas law and with required written consent. The broker may not favor either party or disclose confidential information except as authorized or required by law.'
        : 'The client does not provide advance consent for the broker to act as an intermediary. Separate written consent is required before any intermediary relationship.',
    },
    notices: [
      'This draft supplements, and does not replace, the Texas Real Estate Commission Information About Brokerage Services notice.',
      'This agreement should be reviewed and approved by the responsible broker and legal counsel before production use.',
      'Electronic signatures are intended to have the same effect as handwritten signatures to the extent permitted by applicable law.',
    ],
    references: [{ label: 'Texas Real Estate Commission Information About Brokerage Services', href: 'https://www.trec.texas.gov/forms/information-about-brokerage-services' }],
    signerRoles: [{ role: clientRole.toLowerCase(), name: input.clientName, email: input.clientEmail, routingOrder: 1 }],
    forms: {
      baseContract: { formName: agreementTitle, formId: 'SP-REP-DRAFT-1' },
      addenda: [],
      otherForms: [{ formName: 'TREC Information About Brokerage Services', formId: 'IABS 1-2' }],
    },
  };
}

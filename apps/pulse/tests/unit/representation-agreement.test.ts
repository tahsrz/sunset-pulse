import { describe, expect, it } from 'vitest';
import { buildRepresentationAgreement, representationAgreementSchema } from '@/lib/contracts/representationAgreement';

const validInput = {
  clientName: 'Jamie Client',
  clientEmail: 'jamie@example.com',
  brokerLegalName: 'Example Realty LLC',
  brokerLicenseNumber: '900001',
  agentName: 'Taylor Agent',
  agentLicenseNumber: '700001',
  marketArea: 'Dallas-Fort Worth, Texas',
  representationType: 'buyer' as const,
  exclusivity: 'non_exclusive' as const,
  startsOn: '2026-08-24',
  endsOn: '2026-11-22',
  compensation: 'Buyer will pay any agreed fee not paid by the seller or listing broker.',
  intermediaryConsent: false,
};

describe('representation agreement', () => {
  it('builds a plain-language fiduciary agreement and signer contract', () => {
    const agreement = buildRepresentationAgreement(representationAgreementSchema.parse(validInput));

    expect(agreement.kind).toBe('buyer_tenant_representation');
    expect(agreement.reviewStatus).toBe('attorney_broker_review_required');
    expect(agreement.fiduciaryDuties.join(' ')).toContain('client’s interests above');
    expect(agreement.compensation.notice).toContain('fully negotiable');
    expect(agreement.intermediary.consented).toBe(false);
    expect(agreement.signerRoles[0]).toEqual(expect.objectContaining({ email: 'jamie@example.com' }));
    expect(agreement.references[0].href).toContain('trec.texas.gov');
  });

  it('rejects invalid email and backwards dates', () => {
    expect(representationAgreementSchema.safeParse({ ...validInput, clientEmail: 'not-email' }).success).toBe(false);
    expect(representationAgreementSchema.safeParse({ ...validInput, endsOn: '2026-08-23' }).success).toBe(false);
  });

  it('accepts optional commercial lineage without putting it into the legal text', () => {
    const parsed = representationAgreementSchema.parse({
      ...validInput,
      commercialContext: {
        leadId: '11111111-1111-4111-8111-111111111111',
        funnelId: '22222222-2222-4222-8222-222222222222',
        bookingId: null,
        agentId: 'agent-one',
        site: 'agent-one.sunsetpulse.app',
      },
    });
    const agreement = buildRepresentationAgreement(parsed);
    expect(agreement).not.toHaveProperty('commercialContext');
    expect(parsed.commercialContext?.funnelId).toBe('22222222-2222-4222-8222-222222222222');
  });
});

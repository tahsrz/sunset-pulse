import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { notifyAgentSiteLead } from '@/lib/sites/agentLeadNotification';
import type { TenantSite } from '@/lib/sites/siteData';

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.restoreAllMocks();
  process.env = { ...originalEnv };
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM_EMAIL;
  delete process.env.AGENT_LEAD_NOTIFICATION_EMAIL;
  delete process.env.OPERATOR_EMAIL;
  delete process.env.ADMIN_EMAIL;
  delete process.env.AGENT_LEAD_EMAIL_NOTIFICATIONS_DISABLED;
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('agent site lead notifications', () => {
  it('skips cleanly when there are no recipients', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const result = await notifyAgentSiteLead({
      leadId: 'lead-1',
      site: makeSite({
        leadEmail: '',
        agentEmail: '',
      }),
      inquiry: makeInquiry(),
    });

    expect(result).toMatchObject({
      status: 'skipped',
      reason: 'No lead notification recipient configured.',
      recipients: [],
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sends a Resend email to lead email before agent fallback', async () => {
    process.env.RESEND_API_KEY = 'resend-key';
    process.env.NEXT_PUBLIC_DOMAIN = 'https://sunsetpulse.test';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ id: 'email-123' }),
    } as any);

    const result = await notifyAgentSiteLead({
      leadId: 'lead-2',
      site: makeSite({
        leadEmail: 'leads@example.com',
        agentEmail: 'agent@example.com',
      }),
      inquiry: makeInquiry({
        email: 'buyer@example.com',
        listing: {
          id: 'listing-1',
          mlsId: '21177832',
          name: '13656 County Road 238',
        },
      }),
    });

    expect(result).toMatchObject({
      status: 'sent',
      provider: 'resend',
      id: 'email-123',
      recipients: ['leads@example.com', 'agent@example.com'],
    });
    expect(fetchMock).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        Authorization: 'Bearer resend-key',
      }),
    }));

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toMatchObject({
      from: 'Sunset Pulse <no-reply@sunsetpulse.app>',
      to: ['leads@example.com', 'agent@example.com'],
      reply_to: 'buyer@example.com',
    });
    expect(body.subject).toContain('New Taz Homes lead');
    expect(body.text).toContain('MLS ID: 21177832');
    expect(body.text).toContain('Admin Inbox: https://sunsetpulse.test/admin/agent-leads');
  });

  it('returns failed when Resend rejects the notification without throwing', async () => {
    process.env.RESEND_API_KEY = 'resend-key';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 502,
      json: vi.fn().mockResolvedValue({ message: 'provider down' }),
    } as any);

    const result = await notifyAgentSiteLead({
      leadId: 'lead-3',
      site: makeSite({
        leadEmail: 'leads@example.com',
      }),
      inquiry: makeInquiry(),
    });

    expect(result).toMatchObject({
      status: 'failed',
      reason: 'provider down',
      responseStatus: 502,
      recipients: ['leads@example.com'],
    });
  });
});

function makeSite(input: { leadEmail?: string; agentEmail?: string } = {}): TenantSite {
  return {
    site: 'taz',
    agentId: 'taz-realty-001',
    siteName: 'Taz Homes',
    title: 'Taz local home search',
    subtitle: 'Listings and local support.',
    primaryColor: '#22d3ee',
    fontFamily: 'Inter',
    status: 'active',
    ownerName: 'Taz',
    agentProfile: {
      displayName: 'Tahsin Reza',
      brokerageName: 'Lion Drive Realty',
      email: input.agentEmail,
      markets: ['North Texas'],
    },
    assistantProfile: {
      displayName: 'Jamie',
      roleLabel: 'Analyst Online',
      tone: 'warm',
      statusLabel: 'working',
      placeholder: 'Ask Jamie...',
      toolActionLabel: 'Jamie action',
    },
    complianceProfile: {
      jurisdiction: 'Texas',
      footerDisclaimer: 'Verify all details.',
      mlsDisclaimer: 'MLS data should be verified.',
      equalHousing: true,
    },
    integrationProfile: {
      mlsProvider: 'NTREIS',
      leadEmail: input.leadEmail,
      hotListMlsIds: ['21177832'],
    },
    sections: [],
  };
}

function makeInquiry(overrides: Partial<Parameters<typeof notifyAgentSiteLead>[0]['inquiry']> = {}) {
  return {
    name: 'Riley Buyer',
    email: 'riley@example.com',
    phone: '555-0100',
    preferredContact: 'email' as const,
    message: 'I would like to tour this property.',
    source: 'agent_site_listing',
    pagePath: '/properties/21177832',
    ...overrides,
  };
}

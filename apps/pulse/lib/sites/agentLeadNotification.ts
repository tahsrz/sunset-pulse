import type { TenantSite } from '@/lib/sites/siteData';

export type AgentLeadNotificationInput = {
  leadId: string;
  site: TenantSite;
  inquiry: {
    name: string;
    email: string;
    phone?: string | null;
    preferredContact: 'email' | 'phone' | 'either';
    message: string;
    source: string;
    pagePath?: string | null;
    listing?: {
      id?: string;
      mlsId?: string;
      name?: string;
    };
  };
};

export type AgentLeadNotificationResult =
  | {
      status: 'sent';
      provider: 'resend';
      id: string | null;
      recipients: string[];
    }
  | {
      status: 'skipped';
      reason: string;
      recipients: string[];
    }
  | {
      status: 'failed';
      reason: string;
      recipients: string[];
      responseStatus?: number;
    };

export async function notifyAgentSiteLead(input: AgentLeadNotificationInput): Promise<AgentLeadNotificationResult> {
  const recipients = resolveLeadNotificationRecipients(input.site);

  if (!recipients.length) {
    return {
      status: 'skipped',
      reason: 'No lead notification recipient configured.',
      recipients,
    };
  }

  if (process.env.AGENT_LEAD_EMAIL_NOTIFICATIONS_DISABLED === 'true') {
    return {
      status: 'skipped',
      reason: 'AGENT_LEAD_EMAIL_NOTIFICATIONS_DISABLED=true',
      recipients,
    };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return {
      status: 'skipped',
      reason: 'Missing RESEND_API_KEY.',
      recipients,
    };
  }

  const from = process.env.RESEND_FROM_EMAIL || 'Sunset Pulse <no-reply@sunsetpulse.app>';
  const subject = buildLeadNotificationSubject(input);
  const text = buildLeadNotificationText(input);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject,
        text,
        reply_to: input.inquiry.email,
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return {
        status: 'failed',
        reason: payload?.message || 'Resend request failed.',
        responseStatus: response.status,
        recipients,
      };
    }

    return {
      status: 'sent',
      provider: 'resend',
      id: payload?.id || null,
      recipients,
    };
  } catch (error: any) {
    return {
      status: 'failed',
      reason: error?.message || 'Email notification request failed.',
      recipients,
    };
  }
}

function resolveLeadNotificationRecipients(site: TenantSite) {
  return uniqueEmails([
    site.integrationProfile.leadEmail,
    site.agentProfile.email,
    process.env.AGENT_LEAD_NOTIFICATION_EMAIL,
    process.env.OPERATOR_EMAIL,
    process.env.ADMIN_EMAIL,
  ]);
}

function buildLeadNotificationSubject(input: AgentLeadNotificationInput) {
  const listingLabel = input.inquiry.listing?.mlsId
    ? `MLS ${input.inquiry.listing.mlsId}`
    : input.inquiry.listing?.name || 'agent site';

  return `New ${input.site.siteName} lead: ${input.inquiry.name} (${listingLabel})`;
}

function buildLeadNotificationText(input: AgentLeadNotificationInput) {
  const adminBaseUrl = getPublicBaseUrl();
  const adminInboxUrl = `${adminBaseUrl}/admin/agent-leads`;
  const listingUrl = input.inquiry.listing?.mlsId || input.inquiry.listing?.id
    ? `${adminBaseUrl}/properties/${encodeURIComponent(input.inquiry.listing.mlsId || input.inquiry.listing.id || '')}`
    : null;

  return [
    `New agent-site lead captured by Sunset Pulse.`,
    ``,
    `Lead ID: ${input.leadId}`,
    `Site: ${input.site.siteName} (${input.site.site})`,
    `Agent: ${input.site.agentProfile.displayName}`,
    `Brokerage: ${input.site.agentProfile.brokerageName}`,
    `Source: ${input.inquiry.source}`,
    ``,
    `Contact`,
    `Name: ${input.inquiry.name}`,
    `Email: ${input.inquiry.email}`,
    `Phone: ${input.inquiry.phone || 'Not provided'}`,
    `Preferred Contact: ${input.inquiry.preferredContact}`,
    ``,
    `Listing Context`,
    `Listing: ${input.inquiry.listing?.name || 'General site inquiry'}`,
    `MLS ID: ${input.inquiry.listing?.mlsId || 'Not provided'}`,
    `Listing ID: ${input.inquiry.listing?.id || 'Not provided'}`,
    listingUrl ? `Listing URL: ${listingUrl}` : null,
    input.inquiry.pagePath ? `Page Path: ${input.inquiry.pagePath}` : null,
    ``,
    `Message`,
    input.inquiry.message,
    ``,
    `Admin Inbox: ${adminInboxUrl}`,
    ``,
    `---`,
    `This notification was generated from the public SaaS agent-site lead form.`,
  ].filter((line): line is string => line !== null).join('\n');
}

function getPublicBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_DOMAIN ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` ||
    'https://sunsetpulse.app'
  ).replace(/\/+$/, '');
}

function uniqueEmails(values: Array<string | undefined | null>) {
  const seen = new Set<string>();

  for (const value of values) {
    const email = String(value || '').trim().toLowerCase();
    if (!isLikelyEmail(email)) continue;
    seen.add(email);
  }

  return Array.from(seen);
}

function isLikelyEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

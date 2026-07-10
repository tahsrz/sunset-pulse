export const dynamic = 'force-dynamic';

import { z } from 'zod';
import { applyApiRateLimit } from '@/lib/core/apiRateLimit';
import { errorResponse, successResponse, validationErrorResponse } from '@/lib/core/apiResponse';
import { supabaseAdmin } from '@/lib/supabase';
import { notifyAgentSiteLead } from '@/lib/sites/agentLeadNotification';
import { getTenantSite } from '@/lib/sites/siteData';

const leadSchema = z.object({
  agentId: z.string().trim().min(1).max(80),
  site: z.string().trim().min(1).max(80),
  siteName: z.string().trim().max(160).optional(),
  source: z.string().trim().max(80).default('agent_site'),
  pagePath: z.string().trim().max(500).optional(),
  name: z.string().trim().min(2, 'Name is required').max(120),
  email: z.string().trim().email('Valid email is required').max(180),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  preferredContact: z.enum(['email', 'phone', 'either']).default('either'),
  message: z.string().trim().min(5, 'Message is required').max(2000),
  listing: z.object({
    id: z.string().trim().max(120).optional(),
    mlsId: z.string().trim().max(80).optional(),
    name: z.string().trim().max(240).optional(),
  }).optional(),
  company: z.string().max(120).optional(),
});

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const rawBody = await request.json();
    const validation = leadSchema.safeParse(rawBody);

    if (!validation.success) {
      return validationErrorResponse(validation.error.flatten().fieldErrors);
    }

    const input = validation.data;

    // Honeypot: treat bots as a no-op success so the public form does not reveal the trap.
    if (input.company) {
      return successResponse({ accepted: true });
    }

    const rateLimitResponse = await applyApiRateLimit(`agent-site-lead:${input.agentId}:${ip}`, 5);
    if (rateLimitResponse) return rateLimitResponse;

    const tenantSite = await getTenantSite(input.site);
    const agentId = tenantSite.agentId || input.agentId;
    const siteName = input.siteName || tenantSite.siteName;
    const leadEmail = input.email.toLowerCase();
    const metadata = {
      tenantAgentName: tenantSite.agentProfile.displayName,
      tenantBrokerage: tenantSite.agentProfile.brokerageName,
      submittedAt: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('agent_site_leads')
      .insert({
        agent_id: agentId,
        site: input.site,
        site_name: siteName,
        listing_id: input.listing?.id || null,
        listing_mls_id: input.listing?.mlsId || null,
        listing_name: input.listing?.name || null,
        source: input.source,
        page_path: input.pagePath || null,
        name: input.name,
        email: leadEmail,
        phone: input.phone || null,
        preferred_contact: input.preferredContact,
        message: input.message,
        metadata,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[AGENT_SITE_LEAD_INSERT_ERROR]', error);
      return errorResponse('Failed to save lead inquiry.', 500);
    }

    const notification = await notifyAgentSiteLead({
      leadId: data.id,
      site: tenantSite,
      inquiry: {
        name: input.name,
        email: leadEmail,
        phone: input.phone || null,
        preferredContact: input.preferredContact,
        message: input.message,
        source: input.source,
        pagePath: input.pagePath || null,
        listing: input.listing,
      },
    });

    if (notification.status !== 'sent') {
      console.warn('[AGENT_SITE_LEAD_NOTIFICATION]', notification.status, notification.reason);
    }

    await supabaseAdmin
      .from('agent_site_leads')
      .update({
        metadata: {
          ...metadata,
          notification: summarizeNotification(notification),
        },
      })
      .eq('id', data.id);

    return successResponse({
      accepted: true,
      id: data?.id,
      agentId,
      site: input.site,
      notification: notification.status,
    }, 201);
  } catch (error: any) {
    console.error('[AGENT_SITE_LEAD_ROUTE_ERROR]', error);
    return errorResponse('Failed to submit lead inquiry.', 500, error?.message);
  }
}

function summarizeNotification(notification: Awaited<ReturnType<typeof notifyAgentSiteLead>>) {
  return {
    status: notification.status,
    provider: notification.status === 'sent' ? notification.provider : 'resend',
    id: notification.status === 'sent' ? notification.id : null,
    reason: notification.status === 'sent' ? undefined : notification.reason,
    recipientCount: notification.recipients.length,
    attemptedAt: new Date().toISOString(),
  };
}

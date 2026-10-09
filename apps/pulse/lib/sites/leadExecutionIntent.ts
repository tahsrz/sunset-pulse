import type { PublicGuideLeadIntelligence } from '@/lib/sites/publicGuideLeadIntelligence';
import {
  deriveNextBestAction,
  generateFollowUpMessage,
  type AgentSiteLeadData,
} from '@/lib/sites/leadOperatingSystem';
import { canContactSeller, readSellerLeadContext } from './sellerLeadContext';

export type LeadExecutionType = 'call' | 'email' | 'sms' | 'unavailable';

export type LeadExecutionIntent = {
  type: LeadExecutionType;
  actionLabel: string;
  recommendationLabel: string;
  recommendation: string;
  urgency: 'immediate' | 'high' | 'medium' | 'low';
  href?: string;
  reason?: string;
};

export function resolveLeadExecutionIntent(
  lead: AgentSiteLeadData,
  intelligence: PublicGuideLeadIntelligence | null = null,
  agentName = 'Agent',
): LeadExecutionIntent {
  if (lead.source === 'seller_plan') {
    const context = readSellerLeadContext(lead);
    const recommendation = deriveNextBestAction(lead);
    const presentation = {
      recommendationLabel: recommendation.label,
      recommendation: recommendation.recommendation,
      urgency: recommendation.urgency,
    };
    if (!canContactSeller(lead, context)) {
      const reason = !context?.requestedContact
        ? 'This seller request has no active permission to respond by email.'
        : lead.status === 'archived' || lead.status === 'closed'
          ? 'This seller request is closed or archived.'
          : !lead.email.trim()
            ? 'This seller request has no usable email address.'
            : 'The requested response has already been recorded. Wait for a reply or confirm separate marketing permission before following up.';
      return { ...presentation, type: 'unavailable', actionLabel: 'No email suggested', reason };
    }
    const email = lead.email.trim();
    const draft = generateFollowUpMessage(lead, 'email', agentName);
    const params = new URLSearchParams({ subject: draft.subject || recommendation.label, body: draft.body });
    return { ...presentation, type: 'email', actionLabel: 'Draft seller response', href: `mailto:${email}?${params.toString()}` };
  }

  const recommendation = intelligence?.recommendedAction || deriveNextBestAction(lead);
  const phone = normalizePhone(lead.phone);
  const email = lead.email?.trim();
  const presentation = {
    recommendationLabel: recommendation.label,
    recommendation: recommendation.recommendation,
    urgency: recommendation.urgency,
  };

  if ((recommendation.channel === 'phone' || recommendation.channel === 'either') && phone) {
    return {
      ...presentation,
      type: 'call',
      actionLabel: recommendation.label.toLowerCase().includes('call') ? recommendation.label : 'Call now',
      href: `tel:${phone}`,
    };
  }

  if (email) {
    const draft = generateFollowUpMessage(lead, 'email', agentName);
    const params = new URLSearchParams({
      subject: draft.subject || recommendation.label,
      body: draft.body,
    });

    return {
      ...presentation,
      type: 'email',
      actionLabel: recommendation.channel === 'phone' ? 'Draft email instead' : 'Draft email',
      href: `mailto:${email}?${params.toString()}`,
    };
  }

  if (phone) {
    const draft = generateFollowUpMessage(lead, 'sms', agentName);
    return {
      ...presentation,
      type: 'sms',
      actionLabel: 'Send text instead',
      href: `sms:${phone}?body=${encodeURIComponent(draft.body)}`,
    };
  }

  return {
    ...presentation,
    type: 'unavailable',
    actionLabel: 'Contact unavailable',
    reason: 'This lead has no usable phone number or email address.',
  };
}

function normalizePhone(value: string | null | undefined) {
  if (!value?.trim()) return null;
  const normalized = value.trim().replace(/[^\d+]/g, '');
  return /^\+?\d{7,15}$/.test(normalized) ? normalized : null;
}

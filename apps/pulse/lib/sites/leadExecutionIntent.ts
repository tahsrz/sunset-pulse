import type { PublicGuideLeadIntelligence } from '@/lib/sites/publicGuideLeadIntelligence';
import {
  deriveNextBestAction,
  generateFollowUpMessage,
  type AgentSiteLeadData,
} from '@/lib/sites/leadOperatingSystem';

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

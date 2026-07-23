export type LeadStatus = 'new' | 'contacted' | 'touring' | 'nurture' | 'closed' | 'archived';

export type NextBestAction = {
  urgency: 'immediate' | 'high' | 'medium' | 'low';
  label: string;
  recommendation: string;
  channel: 'phone' | 'email' | 'either';
};

export type AgentSiteLeadData = {
  id: string;
  created_at: string;
  agent_id: string;
  site: string;
  site_name?: string | null;
  listing_id?: string | null;
  listing_mls_id?: string | null;
  listing_name?: string | null;
  source?: string | null;
  page_path?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  preferred_contact?: 'email' | 'phone' | 'either' | null;
  message: string;
  status?: LeadStatus | null;
  internal_note?: string | null;
  reviewed_at?: string | null;
  archived_at?: string | null;
  metadata?: Record<string, unknown> | null;
};

export function deriveNextBestAction(lead: AgentSiteLeadData): NextBestAction {
  const status = lead.status || 'new';
  const preferred = lead.preferred_contact || 'either';
  const hasPhone = Boolean(lead.phone && lead.phone.trim().length > 0);
  const hasListing = Boolean(lead.listing_name || lead.listing_mls_id || lead.listing_id);

  if (status === 'new') {
    if (preferred === 'phone' && hasPhone) {
      return {
        urgency: 'immediate',
        label: 'Call Lead (High Intent)',
        recommendation: 'Place direct phone call within 15 minutes. Confirm listing interest and offer showing times.',
        channel: 'phone',
      };
    }
    if (hasListing) {
      return {
        urgency: 'high',
        label: 'Send Listing Packet & Tour Invite',
        recommendation: `Email detailed property sheet for ${lead.listing_name || 'requested property'} and suggest 2 tour times.`,
        channel: 'email',
      };
    }
    return {
      urgency: 'high',
      label: 'Initial Outreach & Discovery',
      recommendation: 'Send intro email confirming search criteria and offer local neighborhood market report.',
      channel: preferred === 'phone' && hasPhone ? 'phone' : 'email',
    };
  }

  if (status === 'contacted') {
    if (hasListing) {
      return {
        urgency: 'high',
        label: 'Schedule Private Showing',
        recommendation: `Follow up to lock in a showing time for ${lead.listing_name || 'the listing'}.`,
        channel: preferred === 'phone' && hasPhone ? 'phone' : 'email',
      };
    }
    return {
      urgency: 'medium',
      label: 'Send Curated Hot-List',
      recommendation: 'Send 3-5 matching active MLS listings in their target market.',
      channel: 'email',
    };
  }

  if (status === 'touring') {
    return {
      urgency: 'high',
      label: 'Gather Showing Feedback & CMA',
      recommendation: 'Debrief on recent tour, provide comparative market analysis, and evaluate offer strategy.',
      channel: 'phone',
    };
  }

  if (status === 'nurture') {
    return {
      urgency: 'medium',
      label: 'Monthly Market Update',
      recommendation: 'Keep lead engaged with bi-weekly automated MLS price drops and new inventory alerts.',
      channel: 'email',
    };
  }

  if (status === 'closed') {
    return {
      urgency: 'low',
      label: 'Post-Closing Check-in & Review',
      recommendation: 'Send housewarming thank-you note and request client testimonial for agent site.',
      channel: 'email',
    };
  }

  return {
    urgency: 'low',
    label: 'Archived Lead',
    recommendation: 'No immediate action needed. Lead can be restored to active pipeline at any time.',
    channel: 'email',
  };
}

export function generateFollowUpMessage(
  lead: AgentSiteLeadData,
  channel: 'email' | 'sms' = 'email',
  agentName = 'your agent',
): { subject?: string; body: string } {
  const firstName = lead.name.split(/\s+/)[0] || lead.name;
  const listingTitle = lead.listing_name || (lead.listing_mls_id ? `MLS #${lead.listing_mls_id}` : 'your home search');

  if (channel === 'sms') {
    if (lead.status === 'touring') {
      return {
        body: `Hi ${firstName}, this is ${agentName}. Checking in after our tour of ${listingTitle}! Do you have a few minutes to chat about your thoughts or next steps?`,
      };
    }
    return {
      body: `Hi ${firstName}, thanks for reaching out on ${lead.site_name || 'our site'} regarding ${listingTitle}! When is a good time for a quick 5-minute call today to discuss details? - ${agentName}`,
    };
  }

  // Email channel
  if (lead.status === 'touring') {
    return {
      subject: `Following up on our tour of ${listingTitle} - ${agentName}`,
      body: `Hi ${firstName},

Thank you for taking the time to tour ${listingTitle} with me!

I wanted to check in and see what your impressions were. I'm pulling together some additional context on recent comparable sales in the area to help evaluate pricing and value.

Would you be free for a quick call tomorrow to review the numbers or schedule any follow-up visits?

Best regards,
${agentName}`,
    };
  }

  if (lead.status === 'nurture') {
    return {
      subject: `New market updates & listings for ${firstName} - ${agentName}`,
      body: `Hi ${firstName},

I hope you're having a great week! I've been keeping an eye on new inventory and price adjustments matching your preferences.

I have a curated list of active properties that fit what you're looking for. Let me know if you'd like me to send over the latest hot-list or if your search timeline has shifted.

Best regards,
${agentName}`,
    };
  }

  return {
    subject: `Inquiry regarding ${listingTitle} - ${agentName}`,
    body: `Hi ${firstName},

Thank you for contacting me through ${lead.site_name || 'my site'} regarding ${listingTitle}!

I've received your message:
"${lead.message}"

I'd love to assist you with more details or set up a private showing. What time this week works best for your schedule?

Looking forward to connecting soon!

Best regards,
${agentName}`,
  };
}

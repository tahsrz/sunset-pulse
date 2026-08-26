import type {
  PublicGuideAction,
  PublicGuideActionId,
  PublicGuideContext,
  PublicGuideListing,
  PublicGuideOutcome,
} from '@/lib/ai/publicGuideContract';

export const PUBLIC_GUIDE_DESTINATIONS: Record<PublicGuideActionId, {
  description: string;
  kind: PublicGuideAction['kind'];
  label: string;
}> = {
  browse_homes: {
    description: 'Open the full verified property search.',
    kind: 'link',
    label: 'Browse homes',
  },
  contact_agent: {
    description: 'Send a private, consented inquiry to the agent.',
    kind: 'handoff',
    label: 'Contact the agent',
  },
  explore_sunset_pulse: {
    description: 'See how the wider Sunset Pulse system works.',
    kind: 'link',
    label: 'Explore Sunset Pulse',
  },
  view_agent_site: {
    description: 'Return to the agent site that brought you here.',
    kind: 'link',
    label: 'Visit agent site',
  },
  view_listing: {
    description: 'Open the verified property details.',
    kind: 'link',
    label: 'View this home',
  },
};

export function buildPublicGuideActions(input: {
  context?: PublicGuideContext | null;
  listings: PublicGuideListing[];
  outcome: PublicGuideOutcome;
  rootOrigin: string;
  userMessage: string;
}) {
  const actions: PublicGuideAction[] = [];
  const productQuestion = /\b(?:sunset pulse|command center|agent site|launch kit|tah)\b/i.test(input.userMessage);

  if (input.context?.listing) {
    actions.push(createAction('view_listing', input.context.listing.href));
  }

  if (input.context?.agent) {
    actions.push({
      ...createAction('contact_agent'),
      label: `Contact ${input.context.agent.agentName}`,
    });
    actions.push(createAction('view_agent_site', input.context.agent.publicUrl));
  }

  if (input.outcome === 'listing_search' || input.listings.length > 0 || actions.length === 0) {
    actions.push(createAction('browse_homes', `${input.rootOrigin}/properties/search-results`));
  }

  if (productQuestion || actions.length === 1) {
    actions.push(createAction('explore_sunset_pulse', `${input.rootOrigin}/pitch`));
  }

  return actions
    .filter((action, index, all) => all.findIndex((candidate) => candidate.id === action.id) === index)
    .slice(0, 3);
}

function createAction(id: PublicGuideActionId, href?: string): PublicGuideAction {
  const destination = PUBLIC_GUIDE_DESTINATIONS[id];
  return { id, ...destination, ...(href ? { href } : {}) };
}

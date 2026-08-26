import type { UIMessage } from 'ai';
import { z } from 'zod';

const publicGuideMessagePartSchema = z.object({
  type: z.string().trim().min(1).max(80),
  text: z.string().max(4000).optional(),
});

const publicGuideMessageSchema = z.object({
  id: z.string().trim().min(1).max(160),
  role: z.enum(['user', 'assistant']),
  parts: z.array(publicGuideMessagePartSchema).min(1).max(12),
}).strict();

export const publicGuideContextInputSchema = z.object({
  listingId: z.string().trim().min(1).max(120).optional(),
  siteSlug: z.string().trim().regex(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/).optional(),
}).strict().refine((value) => Boolean(value.listingId || value.siteSlug), {
  message: 'A listing or agent site is required for guide context.',
});

export const publicGuideRequestSchema = z.object({
  analyticsSessionId: z.string().trim().min(8).max(160).optional(),
  context: publicGuideContextInputSchema.optional(),
  id: z.string().trim().min(1).max(160).optional(),
  messages: z.array(publicGuideMessageSchema).min(1).max(20),
  messageId: z.string().trim().min(1).max(160).optional(),
  trigger: z.enum(['submit-message', 'regenerate-message']).optional(),
}).strict().superRefine((value, context) => {
  const lastMessage = value.messages[value.messages.length - 1];
  const hasUserText = lastMessage?.role === 'user' && lastMessage.parts.some(
    (part) => part.type === 'text' && Boolean(part.text?.trim()),
  );

  if (!hasUserText) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'The final message must contain user text.',
      path: ['messages', value.messages.length - 1],
    });
  }
}).transform(({ analyticsSessionId, context, messages }) => ({
  messages,
  ...(analyticsSessionId ? { analyticsSessionId } : {}),
  ...(context ? { context } : {}),
}));

export type PublicGuideRequest = z.infer<typeof publicGuideRequestSchema>;
export type PublicGuideContextInput = z.infer<typeof publicGuideContextInputSchema>;

export type PublicGuideListing = {
  id: string;
  name: string;
  city?: string;
  state?: string;
  price?: number | null;
  beds?: number | null;
  baths?: number | null;
  source?: string;
  image?: string | null;
  href: string;
  mlsId?: string;
  squareFeet?: number | null;
  status?: string;
};

export type PublicGuideAgent = {
  agentId: string;
  agentName: string;
  brokerageName: string;
  primaryColor: string;
  publicUrl: string;
  site: string;
  siteName: string;
};

export type PublicGuideContext = {
  agent?: PublicGuideAgent;
  listing?: PublicGuideListing;
};

export const PUBLIC_GUIDE_ACTION_IDS = [
  'browse_homes',
  'contact_agent',
  'explore_sunset_pulse',
  'view_agent_site',
  'view_listing',
] as const;

export const PUBLIC_GUIDE_CLIENT_EVENT_NAMES = [
  'action_click',
  'guide_opened',
  'handoff_open',
  'handoff_submit',
  'listing_opened',
] as const;

export type PublicGuideActionId = typeof PUBLIC_GUIDE_ACTION_IDS[number];
export type PublicGuideClientEventName = typeof PUBLIC_GUIDE_CLIENT_EVENT_NAMES[number];

export type PublicGuideAction = {
  description: string;
  href?: string;
  id: PublicGuideActionId;
  kind: 'handoff' | 'link';
  label: string;
};

export type PublicGuideOutcome =
  | 'context_fact'
  | 'fair_housing_redirect'
  | 'general_guidance'
  | 'listing_search'
  | 'listing_unverified'
  | 'safe_fallback';

export type PublicGuideSource = {
  label: string;
  detail: string;
};

export type PublicGuideResult = {
  actions: PublicGuideAction[];
  content: string;
  listings: PublicGuideListing[];
  sources: PublicGuideSource[];
  usedListingData: boolean;
  outcome: PublicGuideOutcome;
};

export type PublicGuideDataParts = {
  listings: {
    properties: PublicGuideListing[];
    disclaimer: string;
  };
  actions: {
    items: PublicGuideAction[];
  };
  sources: {
    items: PublicGuideSource[];
  };
};

export type PublicGuideUIMessage = UIMessage<never, PublicGuideDataParts>;

export function toPublicGuideModelMessages(input: PublicGuideRequest) {
  return input.messages
    .slice(-12)
    .filter((message) => message.role === 'user')
    .map((message) => ({
      role: 'user' as const,
      content: message.parts
        .filter((part) => part.type === 'text' && typeof part.text === 'string')
        .map((part) => part.text!.trim())
        .filter(Boolean)
        .join('\n'),
    }))
    .filter((message) => message.content.length > 0);
}

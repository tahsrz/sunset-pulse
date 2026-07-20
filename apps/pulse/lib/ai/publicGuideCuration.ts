export type PublicGuideCuration = {
  body: string;
  id: string;
  prompt: string;
  title: string;
};

export const PUBLIC_GUIDE_CURATION_REGISTRY: PublicGuideCuration[] = [
  {
    id: 'tour-questions',
    title: 'Look past the first impression',
    body: 'Jamie can turn a tour into a short inspection-minded question list before you walk through the door.',
    prompt: 'Build me a practical checklist for touring a home.',
  },
  {
    id: 'search-tradeoffs',
    title: 'Name the tradeoff first',
    body: 'Start with budget, location, space, or commute and let Jamie shape a search around the thing that matters most.',
    prompt: 'Help me define the most important tradeoff in my home search.',
  },
  {
    id: 'agent-follow-up',
    title: 'Make the next message useful',
    body: 'Jamie can help an agent structure a clear follow-up without collecting private client details in public chat.',
    prompt: 'Give me a structure for a useful first follow-up to a new lead.',
  },
  {
    id: 'platform-route',
    title: 'Find the right room',
    body: 'Describe the job in plain language and Jamie will point toward the appropriate public Sunset Pulse path.',
    prompt: 'Which part of Sunset Pulse should I use for the job I have in mind?',
  },
];

export function getPublicGuideCuration(now = new Date()) {
  const override = process.env.JAMIE_PUBLIC_GUIDE_CURATED_SLOT;
  const selectedOverride = PUBLIC_GUIDE_CURATION_REGISTRY.find((item) => item.id === override);
  if (selectedOverride) return selectedOverride;

  const dayKey = now.toISOString().slice(0, 10);
  const index = Array.from(dayKey).reduce((total, character) => total + character.charCodeAt(0), 0)
    % PUBLIC_GUIDE_CURATION_REGISTRY.length;
  return PUBLIC_GUIDE_CURATION_REGISTRY[index];
}

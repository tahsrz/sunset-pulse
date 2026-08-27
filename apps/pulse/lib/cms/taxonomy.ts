export const VIBE_TAXONOMIES = {
  mood: ['calm', 'tactical', 'luxurious', 'playful'],
  audience: ['buyer', 'seller', 'rental', 'brokerage'],
  visualFamily: ['light', 'dark', 'editorial', 'high-contrast'],
  voice: ['warm', 'concise', 'analytical', 'energetic'],
  industryUse: ['real-estate', 'hospitality', 'commerce', 'personal-brand'],
} as const;

export type VibeTaxonomyGroup = keyof typeof VIBE_TAXONOMIES;
export type VibeTaxonomyTerm = (typeof VIBE_TAXONOMIES)[VibeTaxonomyGroup][number];

export function listVibeTaxonomyTerms() {
  return Object.entries(VIBE_TAXONOMIES).flatMap(([group, terms]) => terms.map((term) => ({ id: `${group}:${term}`, group, term })));
}

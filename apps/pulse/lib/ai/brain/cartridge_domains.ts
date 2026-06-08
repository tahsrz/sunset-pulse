export type CartridgeDomain = {
  id: string;
  label: string;
  keywords: string[];
  color: string;
};

export const CARTRIDGE_DOMAINS: CartridgeDomain[] = [
  { id: 'texas-history', label: 'Atlas Pulse', color: '#facc15', keywords: ['atlas pulse', 'texas place history', 'sunset texas', 'sunset tx', 'montague county', 'handbook of texas', 'portal to texas history'] },
  { id: 'pulse', label: 'Sunset Pulse', color: '#22d3ee', keywords: ['sunset', 'pulse', 'jamie', 'user', 'memory', 'memories', 'abidan', 'vault'] },
  { id: 'real-estate', label: 'Real Estate', color: '#34d399', keywords: ['real', 'estate', 'tarrant', 'texas', 'deeds', 'listing', 'mls', 'neighborhood'] },
  { id: 'computer-science', label: 'Computer Science', color: '#a78bfa', keywords: ['algorithm', 'architecture', 'compiler', 'operating', 'python', 'unix', 'sicp', 'schemer', 'category'] },
  { id: 'ai', label: 'AI & Learning', color: '#f472b6', keywords: ['ai', 'artificial', 'deep', 'learning', 'neural', 'polymorphic'] },
  { id: 'medicine', label: 'Medical', color: '#fb7185', keywords: ['medical', 'encyclopedia'] },
  { id: 'local-world', label: 'Local World', color: '#facc15', keywords: ['dallas', 'wiki', 'local'] },
  { id: 'web-captures', label: 'Web Captures', color: '#38bdf8', keywords: ['web', 'crawl', 'site', 'url', 'internet', 'html', 'docs'] },
  { id: 'life-sciences', label: 'Life Sciences', color: '#a3e635', keywords: ['life', 'species', 'taxon', 'catalogue', 'biological', 'taxonomy', 'animalia', 'fungi', 'plantae'] },
  { id: 'knowledge', label: 'General Knowledge', color: '#94a3b8', keywords: [] }
];

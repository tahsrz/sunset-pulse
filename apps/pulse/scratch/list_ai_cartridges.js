const fs = require('fs');
const path = require('path');

// Mock listPulseCartridges and classifyCartridgeDomain
const CARTRIDGE_DOMAINS = [
  { id: 'texas-history', label: 'Atlas Pulse', color: '#facc15', keywords: ['atlas pulse', 'texas place history', 'sunset texas', 'sunset tx', 'montague county', 'handbook of texas', 'portal to texas history'] },
  { id: 'pulse', label: 'Sunset Pulse', color: '#22d3ee', keywords: ['sunset', 'pulse', 'jamie', 'user', 'memory', 'memories', 'abidan', 'vault'] },
  { id: 'real-estate', label: 'Real Estate', color: '#34d399', keywords: ['real', 'estate', 'tarrant', 'texas', 'deeds', 'listing', 'mls', 'neighborhood'] },
  { id: 'computer-science', label: 'Computer Science', color: '#a78bfa', keywords: ['algorithm', 'architecture', 'compiler', 'operating', 'python', 'unix', 'sicp', 'schemer', 'category'] },
  { id: 'ai', label: 'AI & Learning', color: '#f472b6', keywords: ['ai', 'artificial', 'deep', 'learning', 'neural', 'polymorphic'] },
  { id: 'medicine', label: 'Medical', color: '#fb7185', keywords: ['medical', 'encyclopedia'] },
  { id: 'local-world', label: 'Local World', color: '#facc15', keywords: ['dallas', 'wiki', 'local'] },
  { id: 'web-captures', label: 'Web Captures', color: '#38bdf8', keywords: ['web', 'crawl', 'site', 'url', 'internet', 'html', 'docs'] },
  { id: 'knowledge', label: 'General Knowledge', color: '#94a3b8', keywords: [] }
];

function cartridgeSlug(file) {
  return file
    .replace(/\.tah\.hat$/, '')
    .replace(/\.tah\.tah$/, '')
    .replace(/\.(hat|tah)$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function cartridgeTitle(file) {
  return file
    .replace(/\.tah\.hat$/, '')
    .replace(/\.tah\.tah$/, '')
    .replace(/\.(hat|tah)$/, '')
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function classifyCartridgeDomain(file, title) {
  const haystack = `${cartridgeSlug(file)} ${title} ${file}`.toLowerCase();
  return CARTRIDGE_DOMAINS.find(rule => rule.keywords.some(keyword => haystack.includes(keyword))) || CARTRIDGE_DOMAINS[CARTRIDGE_DOMAINS.length - 1];
}

const dir = path.join(process.cwd(), 'cartridges');
const files = fs.readdirSync(dir);
const aiCartridges = [];

for (const file of files) {
  if (file.endsWith('.tah') || file.endsWith('.hat')) {
    if (file.endsWith('.tah') && files.includes(file + '.hat')) continue; // Skip if paired
    const title = cartridgeTitle(file);
    const domain = classifyCartridgeDomain(file, title);
    if (domain.id === 'ai') {
      aiCartridges.push({ file, title });
    }
  }
}

console.log('Total AI cartridges found:', aiCartridges.length);
console.log('Sample of AI cartridges:');
console.log(aiCartridges.slice(0, 100));

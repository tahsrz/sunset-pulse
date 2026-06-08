'use client';

import { LucideIcon, Leaf, Bug, Fingerprint, Database, Network } from 'lucide-react';

type LifeSciencesShardProps = {
  text: string;
  links: number[];
  onNavigate?: (index: number) => void;
};

export function LifeSciencesShard({ text, links, onNavigate }: LifeSciencesShardProps) {
  // Parse taxonomic format:
  // Taxon: Ceratophys
  // Rank: genus
  // Path: Animalia > Arthropoda > Diplopoda > Opisthocheiridae
  // Vernacular: None
  
  const lines = text.split('\n');
  const fields: Record<string, string> = {};
  lines.forEach(line => {
    const parts = line.split(': ');
    if (parts.length >= 2) {
      fields[parts[0].trim()] = parts.slice(1).join(': ').trim();
    }
  });

  const taxon = fields['Taxon'] || 'Unknown Taxon';
  const rank = fields['Rank'] || 'unknown';
  const path = fields['Path'] || '';
  const vernacular = fields['Vernacular'] || 'None';
  const link = fields['Link'];

  const pathParts = path.split(' > ');
  const kingdom = pathParts[0] || 'Unknown';

  const Icon = getIconForKingdom(kingdom);

  return (
    <article className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-lime-400/40 hover:bg-white/[0.06]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-500/10 text-lime-400">
              <Icon size={18} />
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-lime-400/80">
              {rank}
            </span>
          </div>
          <h3 className="mt-3 text-2xl font-black text-white group-hover:text-lime-200">
            {taxon}
          </h3>
        </div>
        
        {vernacular !== 'None' && (
          <div className="max-w-[200px] text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Common Name</p>
            <p className="mt-1 text-sm font-medium text-slate-300">{vernacular}</p>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-1.5">
        {pathParts.map((part, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-slate-600">/</span>}
            <span className={`text-xs font-semibold ${i === pathParts.length - 1 ? 'text-lime-300' : 'text-slate-400'}`}>
              {part}
            </span>
          </span>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
        <div className="flex items-center gap-4">
          {links.length > 0 && (
            <div className="flex items-center gap-2">
              <Network size={14} className="text-slate-500" />
              <button 
                onClick={() => onNavigate?.(links[0])}
                className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-lime-300"
              >
                Go to Parent
              </button>
            </div>
          )}
          {link && (
            <a 
              href={link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-cyan-300"
            >
              External source
            </a>
          )}
        </div>
        
        <span className="font-mono text-[10px] text-slate-600">
          WEBGRAPH_V3.6_COMPRESSED
        </span>
      </div>
    </article>
  );
}

function getIconForKingdom(kingdom: string): LucideIcon {
  const k = kingdom.toLowerCase();
  if (k.includes('animalia')) return Bug;
  if (k.includes('plantae')) return Leaf;
  if (k.includes('fungi')) return Fingerprint; // Using Fingerprint for fungi (spores)
  return Database;
}

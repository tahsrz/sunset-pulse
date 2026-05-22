import fs from 'fs';
import path from 'path';
import { unstable_noStore as noStore } from 'next/cache';
import connectDB from '@/lib/core/database';
import Vibe from '@/models/Vibe';
import { VIBE_CATALOG } from '@/config/vibe_catalog';

type LocalBriefing = {
  timestamp?: string;
  simulated_research_hours?: number;
  daily_joke?: string;
  news_articles?: Array<{ title: string; summary: string }>;
  consolidated_truth?: string;
  ozriel_audit?: {
    humanized_rewrites?: Array<{
      original_fragment: string;
      suggested_rewrite: string;
      rationale: string;
    }>;
  };
};

type KnowledgeGraph = {
  verified_facts?: string[];
  logical_anchors?: Record<string, unknown>;
};

export type JamieFeedData = {
  briefing: LocalBriefing | null;
  knowledgeFacts: string[];
  watcherLastRun: string | null;
};

export type JamieVibeData = {
  source: 'mongo' | 'catalog';
  vibes: Array<{
    id: string;
    name: string;
    description: string;
    tone: string;
    pacing: string;
    color: string;
    structure?: string;
  }>;
};

export type JamieAgent = {
  id: string;
  name: string;
  role: string;
  state: string;
  signal: string;
  accent: string;
};

export async function getJamieFeedData(): Promise<JamieFeedData> {
  noStore();

  const briefing = readJson<LocalBriefing>('utils/jamie/memory/daily_briefing.json');
  const graph = readJson<KnowledgeGraph>('utils/jamie/memory/knowledge_graph.json');
  const watcher = readJson<{ last_run?: string }>('utils/jamie/watcher_state.json');

  return {
    briefing,
    knowledgeFacts: graph?.verified_facts?.slice(-5).reverse() || [],
    watcherLastRun: watcher?.last_run || null
  };
}

export async function getJamieVibeData(): Promise<JamieVibeData> {
  noStore();

  try {
    await connectDB();
    const savedVibes = await Vibe.find({}).sort({ updatedAt: -1 }).limit(8).lean();

    if (savedVibes.length > 0) {
      return {
        source: 'mongo',
        vibes: savedVibes.map((vibe: any) => ({
          id: vibe.vibeId || String(vibe._id),
          name: vibe.name || 'Untitled Vibe',
          description: vibe.description || 'Saved Jamie vibe dictionary entry.',
          tone: vibe.linguisticLogic?.tone || 'adaptive',
          pacing: vibe.linguisticLogic?.pacing || 'responsive',
          color: vibe.visualParameters?.meshColor || '#22d3ee'
        }))
      };
    }
  } catch (error) {
    console.warn('[JAMIE_VIBES_SLOT] Falling back to static catalog:', error);
  }

  return {
    source: 'catalog',
    vibes: Object.entries(VIBE_CATALOG).map(([id, vibe]) => ({
      id,
      name: vibe.name,
      description: vibe.prompt_injection,
      tone: vibe.name,
      pacing: 'agentic',
      color: colorForVibe(id),
      structure: vibe.structure
    }))
  };
}

export async function getJamieAgents(): Promise<JamieAgent[]> {
  noStore();

  return [
    {
      id: 'jamie-core',
      name: 'Jamie',
      role: 'Coordinator',
      state: 'Synthesizing',
      signal: 'Routes user intent through TAH, IDX, market memory, and final recommendation.',
      accent: '#22d3ee'
    },
    {
      id: 'market-scout',
      name: 'Market Scout',
      role: 'Local Trend Watch',
      state: 'Scanning',
      signal: 'Tracks zoning, velocity, permits, and neighborhood movement.',
      accent: '#34d399'
    },
    {
      id: 'asset-analyst',
      name: 'Asset Analyst',
      role: 'Property Lens',
      state: 'Evaluating',
      signal: 'Turns listing details into risk, fit, and value tradeoffs.',
      accent: '#facc15'
    },
    {
      id: 'ozriel',
      name: 'Ozriel',
      role: 'Language Audit',
      state: 'Polishing',
      signal: 'Removes generic AI phrasing and keeps Jamie human-readable.',
      accent: '#f472b6'
    }
  ];
}

function readJson<T>(relativePath: string): T | null {
  try {
    const fullPath = path.join(process.cwd(), relativePath);
    if (!fs.existsSync(fullPath)) return null;
    return JSON.parse(fs.readFileSync(fullPath, 'utf8')) as T;
  } catch {
    return null;
  }
}

function colorForVibe(id: string) {
  const colors: Record<string, string> = {
    'vibe-leaning-forward': '#22d3ee',
    'vibe-maxxing': '#facc15',
    'vibe-expanding-brain': '#a78bfa',
    'vibe-this-is-fine': '#fb7185',
    'vibe-institutional': '#34d399'
  };

  return colors[id] || '#94a3b8';
}

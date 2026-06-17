import {
  BadgeDollarSign,
  Building2,
  FileText,
  Handshake,
  Map,
  Megaphone,
  MessageSquareText,
  Radar,
  Route,
  ShieldCheck,
  Sparkles,
  Target
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { expandCommandTerms, expandedTextForSearch, scoreTermMatches } from './synonyms';

export type WorkerStatKey = 'speed' | 'cost' | 'precision' | 'contextFit';

export type IntelligenceWorker = {
  id: string;
  name: string;
  shortName: string;
  role: string;
  commandFit: string[];
  tahLoadout: string[];
  model: string;
  slot: 'Primary' | 'Voice' | 'Market' | 'Supervisor';
  status: 'Ready' | 'Needs lead' | 'Needs listing';
  accent: 'cyan' | 'emerald' | 'amber' | 'rose' | 'violet' | 'blue';
  icon: LucideIcon;
  stats: Record<WorkerStatKey, number>;
  sampleOutput: {
    title: string;
    bullets: string[];
  };
};

export const quickCommands = [
  'Tell me who to call first',
  'Write a buyer follow-up',
  'Generate a listing angle',
  'Explain this neighborhood',
  'Compare this listing',
  'Summarize market movement'
];

export const intelligenceWorkers: IntelligenceWorker[] = [
  {
    id: 'lead-scoring',
    name: 'Lead Scoring',
    shortName: 'Lead',
    role: 'Prioritizes warm leads and next calls.',
    commandFit: ['hot leads', 'call first', 'lead priority', 'who to call'],
    tahLoadout: ['lead_history.tah', 'market_rules.tah', 'agent_brand.tah'],
    model: 'Groq small / lead ranker',
    slot: 'Primary',
    status: 'Ready',
    accent: 'emerald',
    icon: Target,
    stats: { speed: 93, cost: 88, precision: 84, contextFit: 91 },
    sampleOutput: {
      title: 'Top call order prepared',
      bullets: ['Ranks active buyers by intent and timing.', 'Uses lead notes plus market rules.', 'Returns a call angle for each lead.']
    }
  },
  {
    id: 'listing-summary',
    name: 'Listing Summary',
    shortName: 'Listing',
    role: 'Turns property facts into agent-ready copy.',
    commandFit: ['listing summary', 'listing angle', 'property highlights', 'sell this home'],
    tahLoadout: ['listing_context.tah', 'agent_brand.tah', 'comps_context.tah'],
    model: 'Groq small / copy worker',
    slot: 'Primary',
    status: 'Needs listing',
    accent: 'cyan',
    icon: Building2,
    stats: { speed: 95, cost: 90, precision: 79, contextFit: 86 },
    sampleOutput: {
      title: 'Listing angle drafted',
      bullets: ['Finds the strongest property hook.', 'Keeps copy aligned to agent voice.', 'Flags missing property facts.']
    }
  },
  {
    id: 'neighborhood-explainer',
    name: 'Neighborhood Explainer',
    shortName: 'Area',
    role: 'Explains location, lifestyle, and local context.',
    commandFit: ['neighborhood', 'area', 'nearby', 'local context'],
    tahLoadout: ['neighborhood_context.tah', 'local_business_context.tah', 'market_rules.tah'],
    model: 'Ollama local / area explainer',
    slot: 'Market',
    status: 'Ready',
    accent: 'blue',
    icon: Map,
    stats: { speed: 82, cost: 94, precision: 87, contextFit: 89 },
    sampleOutput: {
      title: 'Neighborhood brief assembled',
      bullets: ['Summarizes buyer-relevant lifestyle context.', 'Adds nearby commerce and commute notes.', 'Avoids unsupported neighborhood claims.']
    }
  },
  {
    id: 'buyer-intent',
    name: 'Buyer Intent',
    shortName: 'Intent',
    role: 'Reads lead language for timing and motivation.',
    commandFit: ['buyer intent', 'motivation', 'ready to buy', 'lead temperature'],
    tahLoadout: ['lead_history.tah', 'objection_scripts.tah', 'market_rules.tah'],
    model: 'Groq small / intent reader',
    slot: 'Primary',
    status: 'Needs lead',
    accent: 'violet',
    icon: Radar,
    stats: { speed: 89, cost: 87, precision: 83, contextFit: 84 },
    sampleOutput: {
      title: 'Buyer intent classified',
      bullets: ['Separates curiosity from urgency.', 'Highlights blockers and next questions.', 'Suggests the best follow-up channel.']
    }
  },
  {
    id: 'follow-up-writer',
    name: 'Follow-Up Writer',
    shortName: 'Follow',
    role: 'Writes concise buyer and seller follow-ups.',
    commandFit: ['follow up', 'text lead', 'email buyer', 'message seller'],
    tahLoadout: ['agent_brand.tah', 'lead_history.tah', 'objection_scripts.tah'],
    model: 'Groq small / response writer',
    slot: 'Voice',
    status: 'Ready',
    accent: 'amber',
    icon: MessageSquareText,
    stats: { speed: 96, cost: 92, precision: 78, contextFit: 88 },
    sampleOutput: {
      title: 'Follow-up ready',
      bullets: ['Uses agent voice and lead history.', 'Keeps the message short and specific.', 'Adds one clear next step.']
    }
  },
  {
    id: 'comp-analysis',
    name: 'Comp Analysis',
    shortName: 'Comps',
    role: 'Compares a listing against nearby market signals.',
    commandFit: ['compare listing', 'comps', 'price check', 'valuation'],
    tahLoadout: ['comps_context.tah', 'listing_context.tah', 'market_rules.tah'],
    model: 'Ollama local / comp analyst',
    slot: 'Market',
    status: 'Needs listing',
    accent: 'rose',
    icon: BadgeDollarSign,
    stats: { speed: 76, cost: 82, precision: 91, contextFit: 85 },
    sampleOutput: {
      title: 'Comp view prepared',
      bullets: ['Compares price posture and nearby activity.', 'Flags stale or weak comparison points.', 'Summarizes confidence before claims.']
    }
  },
  {
    id: 'local-commerce',
    name: 'Local Commerce',
    shortName: 'Local',
    role: 'Adds business and community context to property stories.',
    commandFit: ['local business', 'nearby shops', 'community', 'commerce'],
    tahLoadout: ['local_business_context.tah', 'neighborhood_context.tah'],
    model: 'Ollama local / place context',
    slot: 'Market',
    status: 'Ready',
    accent: 'emerald',
    icon: Handshake,
    stats: { speed: 80, cost: 96, precision: 82, contextFit: 86 },
    sampleOutput: {
      title: 'Local context loaded',
      bullets: ['Finds useful nearby business context.', 'Supports listing angles with place memory.', 'Keeps claims grounded in local notes.']
    }
  },
  {
    id: 'agent-voice',
    name: 'Agent Voice',
    shortName: 'Voice',
    role: 'Keeps every output aligned to the agent brand.',
    commandFit: ['brand voice', 'make it sound like me', 'style', 'tone'],
    tahLoadout: ['agent_brand.tah', 'objection_scripts.tah'],
    model: 'Groq small / voice adapter',
    slot: 'Voice',
    status: 'Ready',
    accent: 'blue',
    icon: Megaphone,
    stats: { speed: 91, cost: 90, precision: 80, contextFit: 93 },
    sampleOutput: {
      title: 'Voice layer applied',
      bullets: ['Rewrites in the agent brand pattern.', 'Removes generic AI phrasing.', 'Keeps calls to action natural.']
    }
  },
  {
    id: 'market-movement',
    name: 'Market Movement',
    shortName: 'Market',
    role: 'Summarizes weekly market shifts and talking points.',
    commandFit: ['market movement', 'this week', 'market shift', 'trend'],
    tahLoadout: ['market_rules.tah', 'comps_context.tah', 'neighborhood_context.tah'],
    model: 'Groq small / market brief',
    slot: 'Market',
    status: 'Ready',
    accent: 'cyan',
    icon: Route,
    stats: { speed: 86, cost: 84, precision: 85, contextFit: 83 },
    sampleOutput: {
      title: 'Market brief generated',
      bullets: ['Condenses recent movement into talking points.', 'Separates signal from noise.', 'Suggests client-safe phrasing.']
    }
  },
  {
    id: 'supervisor',
    name: 'Supervisor Check',
    shortName: 'Check',
    role: 'Reviews output for support, tone, and risk.',
    commandFit: ['check result', 'supervisor', 'quality check', 'compliance'],
    tahLoadout: ['market_rules.tah', 'agent_brand.tah'],
    model: 'Optional supervisor model',
    slot: 'Supervisor',
    status: 'Ready',
    accent: 'violet',
    icon: ShieldCheck,
    stats: { speed: 68, cost: 70, precision: 94, contextFit: 79 },
    sampleOutput: {
      title: 'Output checked',
      bullets: ['Flags unsupported claims.', 'Checks tone against brand file.', 'Returns pass, revise, or escalate.']
    }
  },
  {
    id: 'objection-scripts',
    name: 'Objection Scripts',
    shortName: 'Objections',
    role: 'Prepares responses to buyer and seller pushback.',
    commandFit: ['objection', 'pushback', 'too expensive', 'not ready'],
    tahLoadout: ['objection_scripts.tah', 'agent_brand.tah', 'lead_history.tah'],
    model: 'Groq small / objection coach',
    slot: 'Voice',
    status: 'Ready',
    accent: 'amber',
    icon: FileText,
    stats: { speed: 88, cost: 91, precision: 82, contextFit: 87 },
    sampleOutput: {
      title: 'Objection response queued',
      bullets: ['Matches response to buyer concern.', 'Keeps tone advisory instead of pushy.', 'Offers a next-step question.']
    }
  },
  {
    id: 'listing-spark',
    name: 'Listing Spark',
    shortName: 'Spark',
    role: 'Finds the strongest hook for a property campaign.',
    commandFit: ['listing angle', 'campaign hook', 'marketing angle', 'property story'],
    tahLoadout: ['listing_context.tah', 'local_business_context.tah', 'agent_brand.tah'],
    model: 'Groq small / angle generator',
    slot: 'Primary',
    status: 'Needs listing',
    accent: 'rose',
    icon: Sparkles,
    stats: { speed: 90, cost: 89, precision: 77, contextFit: 90 },
    sampleOutput: {
      title: 'Campaign hook selected',
      bullets: ['Combines property facts with local memory.', 'Returns three angle options.', 'Marks the safest claim to lead with.']
    }
  }
];

export function chooseWorkerForCommand(command: string) {
  const normalized = expandedTextForSearch(command).toLowerCase();
  const expandedTerms = expandCommandTerms(command);
  const scored = intelligenceWorkers.map((worker) => {
    const score = worker.commandFit.reduce((total, phrase) => total + (normalized.includes(phrase) ? 3 : 0), 0) +
      worker.name.toLowerCase().split(/\s+/).reduce((total, term) => total + (normalized.includes(term) ? 1 : 0), 0) +
      scoreTermMatches(worker.commandFit.join(' '), expandedTerms);
    return { worker, score };
  });

  return scored.sort((a, b) => b.score - a.score)[0]?.score > 0
    ? scored.sort((a, b) => b.score - a.score)[0].worker
    : intelligenceWorkers[0];
}

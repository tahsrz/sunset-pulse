import {
  AppWindow,
  BadgeDollarSign,
  Building2,
  ClipboardCheck,
  Database,
  FileText,
  Handshake,
  Landmark,
  Map,
  Megaphone,
  MessageSquareText,
  Radar,
  Route,
  ShieldAlert,
  ShieldCheck,
  ShieldCog,
  SplinePointer,
  Sparkles,
  Target,
  TrendingUp,
  UsersRound,
  Wheat
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
  'Frame Dallas safety without steering',
  'Summarize Dallas community signals',
  'Explain the TREC option-fee risk',
  'Prepare a seller update',
  'Check farm and ranch context',
  'Show how Sunset Pulse chooses a helper',
  'Check command center security risk',
  'Explain the database slow spot',
  'Sketch a spatial listing experience',
  'Compare this listing',
  'Summarize market movement'
];

export const intelligenceWorkers: IntelligenceWorker[] = [
  {
    id: 'lead-scoring',
    name: 'Lead Scoring',
    shortName: 'Lead',
    role: 'Helps decide who to call first and why.',
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
      bullets: ['Sorts active buyers by timing and interest.', 'Uses lead notes plus market rules.', 'Gives you a call angle for each lead.']
    }
  },
  {
    id: 'listing-summary',
    name: 'Listing Summary',
    shortName: 'Listing',
    role: 'Turns property facts into listing copy you can use.',
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
    role: 'Explains an area in buyer-friendly language.',
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
    role: 'Looks at a lead and estimates how serious they are.',
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
    commandFit: ['follow up', 'text lead', 'email buyer', 'message seller', 'write note', 'rewrite note', 'chat note', 'clear and friendly', 'sunset chat note'],
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
    role: 'Compares a listing against nearby market activity.',
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
    role: 'Adds nearby business and community details to a property story.',
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
    role: 'Makes the answer sound like your brand.',
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
    role: 'Turns market changes into simple talking points.',
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
    id: 'seller-update',
    name: 'Seller Update',
    shortName: 'Seller',
    role: 'Turns listing activity into an update for the seller.',
    commandFit: ['seller update', 'seller update from market velocity', 'market velocity', 'listing performance', 'price adjustment', 'days on market', 'showing activity', 'seller check in'],
    tahLoadout: ['listing_context.tah', 'market_velocity.tah', 'comps_context.tah'],
    model: 'Groq small / seller briefing worker',
    slot: 'Market',
    status: 'Needs listing',
    accent: 'cyan',
    icon: TrendingUp,
    stats: { speed: 86, cost: 84, precision: 86, contextFit: 88 },
    sampleOutput: {
      title: 'Seller update assembled',
      bullets: ['Connects listing activity to market velocity.', 'Keeps tone calm and professional.', 'Returns one recommended next check-in.']
    }
  },
  {
    id: 'dallas-community',
    name: 'Dallas Community',
    shortName: '311',
    role: 'Uses Dallas 311 and city-service notes for local context.',
    commandFit: ['dallas community', '311', 'service request', 'pothole', 'code concern', 'community signal', 'local issue'],
    tahLoadout: ['dallas_community_intel.tah', 'neighborhood_context.tah', 'local_business_context.tah'],
    model: 'Ollama local / community signal worker',
    slot: 'Market',
    status: 'Ready',
    accent: 'emerald',
    icon: UsersRound,
    stats: { speed: 78, cost: 95, precision: 84, contextFit: 90 },
    sampleOutput: {
      title: 'Community pulse framed',
      bullets: ['Summarizes concrete local-service signals.', 'Turns them into client-safe local context.', 'Flags exact addresses and status for verification.']
    }
  },
  {
    id: 'dallas-safety',
    name: 'Dallas Safety',
    shortName: 'Safety',
    role: 'Answers safety questions carefully without making steering claims.',
    commandFit: ['dallas safety', 'crime', 'incident', 'police', 'safe area', 'unsafe', 'safety concern', 'public safety'],
    tahLoadout: ['dallas_safety_intel.tah', 'market_rules.tah'],
    model: 'Groq small / safety framing worker',
    slot: 'Supervisor',
    status: 'Ready',
    accent: 'rose',
    icon: ShieldAlert,
    stats: { speed: 74, cost: 82, precision: 93, contextFit: 88 },
    sampleOutput: {
      title: 'Safety wording prepared',
      bullets: ['Avoids safe/unsafe conclusions.', 'Points users toward official sources.', 'Provides neutral client-safe language.']
    }
  },
  {
    id: 'texas-contracts',
    name: 'Texas Contracts',
    shortName: 'TREC',
    role: 'Explains contract workflow issues without giving legal advice.',
    commandFit: ['trec', 'contract', 'option fee', 'addendum', 'paragraph', 'termination option', 'financing addendum'],
    tahLoadout: ['texas_contracts_expertise.tah', 'market_rules.tah', 'texas_real_estate.tah'],
    model: 'Groq small / contract brief worker',
    slot: 'Supervisor',
    status: 'Ready',
    accent: 'amber',
    icon: ClipboardCheck,
    stats: { speed: 82, cost: 83, precision: 92, contextFit: 87 },
    sampleOutput: {
      title: 'Contract brief prepared',
      bullets: ['Names the relevant form or clause topic.', 'Separates agent workflow from legal interpretation.', 'Flags items for broker or attorney review.']
    }
  },
  {
    id: 'yield-intel',
    name: 'Yield Intel',
    shortName: 'Yield',
    role: 'Adds farm, ranch, rural, and county productivity context.',
    commandFit: ['yield', 'agricultural', 'farm', 'ranch', 'crop', 'productivity', 'rural land', 'county yield'],
    tahLoadout: ['yield_intel.tah', 'texas_real_estate.tah', 'market_velocity.tah'],
    model: 'Ollama local / rural yield worker',
    slot: 'Market',
    status: 'Ready',
    accent: 'amber',
    icon: Wheat,
    stats: { speed: 73, cost: 91, precision: 84, contextFit: 82 },
    sampleOutput: {
      title: 'Yield context loaded',
      bullets: ['Summarizes county productivity signals.', 'Avoids return or tax promises.', 'Suggests professional verification for land decisions.']
    }
  },
  {
    id: 'place-history',
    name: 'Place History',
    shortName: 'History',
    role: 'Turns Texas place-history notes into grounded local stories.',
    commandFit: ['place history', 'town history', 'sunset texas', 'local history', 'railroad', 'post office', 'heritage'],
    tahLoadout: ['texas_place_history.tah', 'neighborhood_intel.tah', 'market_velocity.tah'],
    model: 'Ollama local / place historian',
    slot: 'Market',
    status: 'Ready',
    accent: 'blue',
    icon: Landmark,
    stats: { speed: 79, cost: 93, precision: 85, contextFit: 89 },
    sampleOutput: {
      title: 'Place story assembled',
      bullets: ['Extracts useful historical anchors.', 'Keeps claims tied to source material.', 'Turns local memory into a buyer-friendly narrative.']
    }
  },
  {
    id: 'pulse-architect',
    name: 'Pulse Architect',
    shortName: 'Pulse',
    role: 'Shows how Sunset Pulse chooses the right helper and files.',
    commandFit: ['sunset pulse', 'pulse command', 'command map', 'command flow', 'worker routing', 'tah routing', 'command center architecture'],
    tahLoadout: ['sunset_pulse_expertise.tah', 'query_memory.tah', 'agent_brand.tah'],
    model: 'Groq small / Pulse system mapper',
    slot: 'Supervisor',
    status: 'Ready',
    accent: 'violet',
    icon: AppWindow,
    stats: { speed: 82, cost: 84, precision: 88, contextFit: 92 },
    sampleOutput: {
      title: 'Command map drafted',
      bullets: ['Shows how a request becomes a helper choice.', 'Ties the answer back to the files used.', 'Points out the next product improvement.']
    }
  },
  {
    id: 'security-architect',
    name: 'Security Architect',
    shortName: 'Security',
    role: 'Explains product and technical risks in plain language.',
    commandFit: ['security architecture', 'threat model', 'threat-model', 'attack surface', 'security control', 'auth risk', 'privacy risk'],
    tahLoadout: ['security_architect.tah', 'market_rules.tah', 'query_memory.tah'],
    model: 'Groq small / threat board worker',
    slot: 'Supervisor',
    status: 'Ready',
    accent: 'rose',
    icon: ShieldCog,
    stats: { speed: 76, cost: 82, precision: 93, contextFit: 89 },
    sampleOutput: {
      title: 'Threat board prepared',
      bullets: ['Names what needs protection.', 'Suggests practical safeguards.', 'Explains what risk is still left.']
    }
  },
  {
    id: 'postgres-tuner',
    name: 'Postgres Tuner',
    shortName: 'SQL',
    role: 'Explains why a database request may be slow and what to check next.',
    commandFit: ['postgres', 'postgres query', 'query plan', 'index tuning', 'database performance', 'pgvector', 'sql bottleneck'],
    tahLoadout: ['postgres_mastery.tah', 'query_memory.tah', 'market_velocity.tah'],
    model: 'Ollama local / query-plan explainer',
    slot: 'Supervisor',
    status: 'Ready',
    accent: 'blue',
    icon: Database,
    stats: { speed: 78, cost: 90, precision: 91, contextFit: 87 },
    sampleOutput: {
      title: 'Query plan explained',
      bullets: ['Names the likely slow spot.', 'Separates measurement from guesswork.', 'Gives a cautious next check.']
    }
  },
  {
    id: 'spatial-designer',
    name: 'Spatial Designer',
    shortName: 'Spatial',
    role: 'Turns listings and maps into a clearer 3D or visual experience.',
    commandFit: ['spatial computing', 'spatial ui', '3d listing', 'immersive listing', 'scene design', 'interaction ray', 'map scene'],
    tahLoadout: ['spatial_computing.tah', 'listing_context.tah', 'neighborhood_context.tah'],
    model: 'Ollama local / spatial scene worker',
    slot: 'Market',
    status: 'Needs listing',
    accent: 'cyan',
    icon: SplinePointer,
    stats: { speed: 74, cost: 88, precision: 82, contextFit: 86 },
    sampleOutput: {
      title: 'Spatial scene framed',
      bullets: ['Shows where the user, property, and action fit.', 'Makes listing context useful, not just decorative.', 'Calls out scale and interaction assumptions.']
    }
  },
  {
    id: 'supervisor',
    name: 'Supervisor Check',
    shortName: 'Check',
    role: 'Checks whether the answer is supported, clear, and safe.',
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

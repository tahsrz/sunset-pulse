import {
  Clipboard,
  FileText,
  MessageSquareText,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from 'lucide-react';

export type RelayMode = 'briefing' | 'slideshow' | 'puppetshow' | 'field-board' | 'script';

export type StarterJob = {
  id: string;
  label: string;
  description: string;
  inputLabel: string;
  outputLabel: string;
  priorityLabel?: string;
  icon: LucideIcon;
  workerId: string;
  relayMode: RelayMode;
  prompt: string;
  placeholder: string;
  example: string;
};

export type CommandProgressEvent = {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'complete' | 'error' | string;
  detail?: string;
};

export type CommandResponse = {
  commandId: string;
  worker: {
    id: string;
    name: string;
    role: string;
  };
  result: {
    title: string;
    summary: string;
    actions: string[];
    confidence: number;
    deliverable: {
      title: string;
      copyReadyText: string;
      sourceSummary: string;
    };
  };
  trace?: {
    selectedShards?: Array<{
      title: string;
      source: string;
      excerpt: string;
    }>;
    progress?: CommandProgressEvent[];
  };
};

export type AgentPreferences = {
  agentName: string;
  market: string;
  tone: string;
  cta: string;
};

export type SavedExample = {
  id: string;
  jobId: string;
  title: string;
  input: string;
  output: string;
  createdAt: string;
};

export const starterJobs: StarterJob[] = [
  {
    id: 'lead-follow-up',
    label: 'Follow Up',
    description: 'Turn a lead note or stale thread into a reply that feels ready to send.',
    inputLabel: 'Lead context',
    outputLabel: 'Client-ready message',
    priorityLabel: 'Start here',
    icon: MessageSquareText,
    workerId: 'follow-up-writer',
    relayMode: 'script',
    prompt: 'Write a concise, client-ready real estate follow-up. Use the agent voice layer, reference only supplied facts, and end with one natural next step.',
    placeholder: 'Paste the lead note, last message, or situation...',
    example: 'Buyer toured Oak Cliff bungalow last weekend. Liked the kitchen and yard, worried about commute. Follow up today.',
  },
  {
    id: 'listing-copy',
    label: 'Listing Copy',
    description: 'Turn property facts into polished listing copy without overclaiming.',
    inputLabel: 'Property facts',
    outputLabel: 'Listing copy',
    icon: FileText,
    workerId: 'listing-spark',
    relayMode: 'briefing',
    prompt: 'Turn these property facts into listing copy. Lead with the strongest verified hook, keep claims grounded, and include one polished version plus a softer alternate angle.',
    placeholder: 'Paste listing facts, MLS notes, photos notes, or seller context...',
    example: '3 bed, 2 bath, updated kitchen, mature trees, near downtown Denton. Seller wants warm but not overhyped copy.',
  },
  {
    id: 'objection-reply',
    label: 'Objection Reply',
    description: 'Answer hesitation calmly and keep the conversation moving.',
    inputLabel: 'Objection or concern',
    outputLabel: 'Reply script',
    icon: ShieldCheck,
    workerId: 'objection-scripts',
    relayMode: 'script',
    prompt: 'Write a calm reply to this buyer or seller objection. Stay advisory, avoid pressure, and give one practical next-step question.',
    placeholder: 'Paste the objection or concern...',
    example: 'Buyer says rates are too high and wants to wait six months before looking again.',
  },
  {
    id: 'property-summary',
    label: 'Property Summary',
    description: 'Separate known facts from gaps so a client gets the point quickly.',
    inputLabel: 'Property details',
    outputLabel: 'Client summary',
    icon: Clipboard,
    workerId: 'listing-summary',
    relayMode: 'briefing',
    prompt: 'Summarize this property for a real estate client. Separate verified facts from missing details, and make the next action obvious.',
    placeholder: 'Paste property details, a listing description, or notes...',
    example: 'MLS notes: renovated ranch, 0.4 acre lot, new roof 2024, no seller disclosure attached yet.',
  },
  {
    id: 'agent-voice',
    label: 'Sound Like Me',
    description: 'Rewrite rough copy into the saved agent voice baseline.',
    inputLabel: 'Draft copy',
    outputLabel: 'Voice-matched rewrite',
    icon: UserRound,
    workerId: 'agent-voice',
    relayMode: 'script',
    prompt: 'Rewrite this in the agent brand voice. Make it concise, useful, local, confident, warm, and remove generic AI phrasing.',
    placeholder: 'Paste the draft that should sound more like you...',
    example: 'I wanted to reach out and see if you had any questions about the property we discussed previously.',
  },
];

export const idleProgress: CommandProgressEvent[] = [
  { id: 'ready', label: 'Ready', status: 'complete', detail: 'Choose a job and run it.' },
];

export const preferencesStorageKey = 'sunset_agent_console_preferences';
export const savedExamplesStorageKey = 'sunset_agent_console_examples';

export const defaultPreferences: AgentPreferences = {
  agentName: '',
  market: 'North Texas',
  tone: 'Warm, direct, local',
  cta: 'Ask for a quick reply',
};

export const toneOptions = [
  'Warm, direct, local',
  'Polished and concise',
  'Friendly and casual',
  'Calm and advisory',
];

export const ctaOptions = [
  'Ask for a quick reply',
  'Offer to send more detail',
  'Ask to schedule a showing',
  'Offer a short call',
];

export interface AbidanCharacter {
  id: string;
  name: string;
  mantle: string;
  color: string;
  description: string;
  missionLabel: string;
  geometryType: 'hound' | 'titan' | 'ghost' | 'spider' | 'wolf' | 'phoenix' | 'fox' | 'reaper';
}

export const ABIDAN_DATA: AbidanCharacter[] = [
  {
    id: 'makiel',
    name: 'Makiel',
    mantle: 'Future Outlook',
    color: '#3b82f6',
    description: 'Projects 5-10 year growth, infrastructure movement, and regional momentum for a target asset.',
    missionLabel: 'Growth Forecast',
    geometryType: 'hound'
  },
  {
    id: 'gadrael',
    name: 'Gadrael',
    mantle: 'Stability',
    color: '#94a3b8',
    description: 'Reviews zoning, risk exposure, FHA-sensitive language, and structural market stability.',
    missionLabel: 'Risk Shield',
    geometryType: 'titan'
  },
  {
    id: 'durandiel',
    name: 'Durandiel',
    mantle: 'Spatial Intelligence',
    color: '#ffffff',
    description: 'Maps transit access, utility corridors, infrastructure proximity, and location constraints.',
    missionLabel: 'Spatial Recon',
    geometryType: 'ghost'
  },
  {
    id: 'telariel',
    name: 'Telariel',
    mantle: 'Community Signals',
    color: '#a855f7',
    description: 'Connects neighborhood activity, historical listing behavior, and soft-market signal patterns.',
    missionLabel: 'Network Map',
    geometryType: 'spider'
  },
  {
    id: 'razael',
    name: 'Razael',
    mantle: 'Navigation',
    color: '#ef4444',
    description: 'Builds buyer strategy, timing guidance, negotiation posture, and tactical next steps.',
    missionLabel: 'Buyer Strategy',
    geometryType: 'wolf'
  },
  {
    id: 'suriel',
    name: 'Suriel',
    mantle: 'Aggregation',
    color: '#22c55e',
    description: 'Synthesizes raw judge output into a cohesive briefing with a plain-language throughline.',
    missionLabel: 'Restoration Core',
    geometryType: 'phoenix'
  },
  {
    id: 'zakariel',
    name: 'Zakariel',
    mantle: 'Coordination',
    color: '#f97316',
    description: 'Optimizes closing timelines, operator handoffs, logistics, and task sequencing.',
    missionLabel: 'Close Path',
    geometryType: 'fox'
  },
  {
    id: 'ozriel',
    name: 'Ozriel',
    mantle: 'Evaluation',
    color: '#1e1b4b',
    description: 'Performs final balanced review, language cleanup, and potential score evaluation.',
    missionLabel: 'Final Arbiter',
    geometryType: 'reaper'
  },
  {
    id: 'daily-briefing',
    name: 'Jamie Pulse',
    mantle: 'Regional Intelligence',
    color: '#10b981',
    description: 'Summarizes live regional signals, market notes, and operator-ready daily context.',
    missionLabel: 'Regional Brief',
    geometryType: 'phoenix'
  }
];

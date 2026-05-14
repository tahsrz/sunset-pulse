export interface IntelligencePersona {
  id: string;
  name: string;
  mantle: string;
  color: string;
  description: string;
  missionLabel: string;
  geometryType: 'hound' | 'titan' | 'ghost' | 'spider' | 'wolf' | 'phoenix' | 'fox' | 'reaper';
}

export const INTELLIGENCE_DATA: IntelligencePersona[] = [
  {
    id: 'atlas',
    name: 'Atlas',
    mantle: 'Strategic Forecast',
    color: '#3b82f6', 
    description: 'Specialized in multi-iteration predictive modeling and long-term asset growth.',
    missionLabel: 'Growth Outlook',
    geometryType: 'hound'
  },
  {
    id: 'sentinel',
    name: 'Sentinel',
    mantle: 'Defensive Integrity',
    color: '#94a3b8', 
    description: 'Expert in risk mitigation and structural asset protection.',
    missionLabel: 'Risk Review',
    geometryType: 'titan'
  },
  {
    id: 'phantom',
    name: 'Phantom',
    mantle: 'Neighborhood Intelligence',
    color: '#ffffff', 
    description: 'Analyzes subtle neighborhood signals and market anomalies that escape traditional audits.',
    missionLabel: 'Neighborhood Signals',
    geometryType: 'ghost'
  },
  {
    id: 'nexus',
    name: 'Nexus',
    mantle: 'Network Connectivity',
    color: '#a855f7', 
    description: 'Manages the integration of disparate data streams across the regional grid.',
    missionLabel: 'Influence Map',
    geometryType: 'spider'
  },
  {
    id: 'vanguard',
    name: 'Vanguard',
    mantle: 'Strategic Execution',
    color: '#ef4444', 
    description: 'Deployment lead for high-stakes negotiations and competitive acquisition strategies.',
    missionLabel: 'Negotiation Strategy',
    geometryType: 'wolf'
  },
  {
    id: 'aegis',
    name: 'Aegis',
    mantle: 'Resource Optimization',
    color: '#22c55e', 
    description: 'Focused on asset recovery and the revitalization of underperforming portfolios.',
    missionLabel: 'Recovery Model',
    geometryType: 'phoenix'
  },
  {
    id: 'vector',
    name: 'Vector',
    mantle: 'Logistics Efficiency',
    color: '#f97316', 
    description: 'Master of transit-linked asset valuation and rapid deployment logistics.',
    missionLabel: 'Path To Close',
    geometryType: 'fox'
  },
  {
    id: 'auditor',
    name: 'Auditor',
    mantle: 'Final Recommendation',
    color: '#1e1b4b', 
    description: 'Performs the final liquidation audit and definitive asset evaluation.',
    missionLabel: 'Final Recommendation',
    geometryType: 'reaper'
  },
  {
    id: 'daily-briefing',
    name: 'Jamie Pulse',
    mantle: 'Regional Intelligence',
    color: '#10b981', 
    description: 'The automated intelligence stream that purifies high-density market data into actionable signals.',
    missionLabel: 'Regional Brief',
    geometryType: 'phoenix'
  }
];

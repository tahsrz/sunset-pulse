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
    description: 'Specialized in multi-iteration predictive modeling and long-term property growth.',
    missionLabel: 'Growth Outlook',
    geometryType: 'hound'
  },
  {
    id: 'sentinel',
    name: 'Sentinel',
    mantle: 'Defensive Integrity',
    color: '#94a3b8', 
    description: 'Expert in risk mitigation and structural property protection.',
    missionLabel: 'Risk Review',
    geometryType: 'titan'
  },
  {
    id: 'phantom',
    name: 'Phantom',
    mantle: 'Neighborhood Analysis',
    color: '#ffffff', 
    description: 'Analyzes neighborhood patterns and market changes that may not appear in standard listing data.',
    missionLabel: 'Neighborhood Context',
    geometryType: 'ghost'
  },
  {
    id: 'nexus',
    name: 'Nexus',
    mantle: 'Network Connectivity',
    color: '#a855f7', 
    description: 'Manages the integration of regional data sources.',
    missionLabel: 'Influence Map',
    geometryType: 'spider'
  },
  {
    id: 'vanguard',
    name: 'Vanguard',
    mantle: 'Strategic Execution',
    color: '#ef4444', 
    description: 'Supports negotiation planning and competitive acquisition strategies.',
    missionLabel: 'Negotiation Strategy',
    geometryType: 'wolf'
  },
  {
    id: 'aegis',
    name: 'Aegis',
    mantle: 'Resource Optimization',
    color: '#22c55e', 
    description: 'Focused on property recovery and the revitalization of underperforming portfolios.',
    missionLabel: 'Recovery Model',
    geometryType: 'phoenix'
  },
  {
    id: 'vector',
    name: 'Vector',
    mantle: 'Logistics Efficiency',
    color: '#f97316', 
    description: 'Specializes in transit-linked property valuation and closing logistics.',
    missionLabel: 'Path To Close',
    geometryType: 'fox'
  },
  {
    id: 'auditor',
    name: 'Auditor',
    mantle: 'Final Recommendation',
    color: '#1e1b4b', 
    description: 'Performs the final review and property evaluation.',
    missionLabel: 'Final Recommendation',
    geometryType: 'reaper'
  },
  {
    id: 'daily-briefing',
    name: 'Jamie Pulse',
    mantle: 'Regional Analysis',
    color: '#10b981', 
    description: 'An automated stream that summarizes dense market data into useful context.',
    missionLabel: 'Regional Summary',
    geometryType: 'phoenix'
  }
];

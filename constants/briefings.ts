import { SlideData } from '@/components/BriefingEngine';

export const INVESTOR_DECK: SlideData[] = [
  {
    id: '001',
    title: 'Sunset Pulse // Phase 1',
    content: 'Modernizing real estate search through spatial property analysis and automated lead follow-up.',
    position: [0, 5, 0],
    rotation: [0, 0, 0],
    color: '#3b82f6'
  },
  {
    id: '002',
    title: 'The Jamie Neural Core',
    content: 'Persistent memory bridging across sessions. AI-driven re-engagement hooks generated in real-time.',
    position: [15, 8, -10],
    rotation: [0, -Math.PI / 4, 0],
    color: '#10b981'
  },
  {
    id: '003',
    title: 'Spatial Fidelity',
    content: 'Procedural building generation with deterministic clutter. Real-world sunlight synchronization.',
    position: [-10, 3, -20],
    rotation: [Math.PI / 8, Math.PI / 6, 0],
    color: '#facc15'
  }
];

export const BRIEFING_REGISTRY = {
  investor: INVESTOR_DECK,
  // Add more decks here
};

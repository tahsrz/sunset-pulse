export interface AbidanCharacter {
  id: string;
  name: string;
  mantle: string;
  color: string;
  description: string;
  geometryType: 'hound' | 'titan' | 'ghost' | 'spider' | 'wolf' | 'phoenix' | 'fox' | 'reaper';
}

export const ABIDAN_DATA: AbidanCharacter[] = [
  {
    id: 'makiel',
    name: 'Makiel',
    mantle: 'The Hound',
    color: '#3b82f6', // Deep Blue
    description: 'The Judge of Fate.',
    geometryType: 'hound'
  },
  {
    id: 'gadrael',
    name: 'Gadrael',
    mantle: 'The Titan',
    color: '#94a3b8', // Slate/Steel
    description: 'The Ultimate Shield.',
    geometryType: 'gigante'
  },
  {
    id: 'durandiel',
    name: 'Durandiel',
    mantle: 'The Ghost',
    color: '#ffffff', // White/Silver
    description: 'The Judge of Silence. Durandiel manages the end of things, ensuring that what must fall away does so without disturbing the balance.',
    geometryType: 'ghost'
  },
  {
    id: 'telariel',
    name: 'Telariel',
    mantle: 'The Spider',
    color: '#a855f7', // Purple
    description: 'The Network of Intelligence. Telariel sees all across the myriad iterations, connecting the grid of Abidan awareness.',
    geometryType: 'spider'
  },
  {
    id: 'razael',
    name: 'Razael',
    mantle: 'The Wolf',
    color: '#ef4444', // Red
    description: 'The Judge of Combat. The heavy hand of the Abidan, Razael is the ultimate force deployed when worlds are beyond diplomacy.',
    geometryType: 'wolf'
  },
  {
    id: 'suriel',
    name: 'Suriel',
    mantle: 'The Phoenix',
    color: '#22c55e', // Green/Emerald
    description: 'The Judge of Restoration. Suriel carries the power of healing and renewal, capable of restoring entire iterations from the brink of collapse.',
    geometryType: 'phoenix'
  },
  {
    id: 'zakariel',
    name: 'Zakariel',
    mantle: 'The Fox',
    color: '#f97316', // Orange
    description: 'The Judge of Speed and Transit. Zakariel masters the distances between worlds, moving the Abidan with near-instantaneous efficiency.',
    geometryType: 'fox'
  },
  {
    id: 'ozriel',
    name: 'Ozriel',
    mantle: 'The Reaper',
    color: '#1e1b4b', // Midnight Indigo/Black
    description: 'The Judge of Destruction. The absolute end of all things. Ozriel is the only Abidan capable of erasing an iteration without leaving behind the corruption of the Void.',
    geometryType: 'reaper'
  },
  {
    id: 'daily-briefing',
    name: 'Jamie Pulse',
    mantle: 'The Regional Briefing',
    color: '#10b981', // Emerald
    description: 'The 5-Hour Intelligence Sprint. Jamie consumes the news and purifies the signal.',
    geometryType: 'phoenix'
  }
];

export const clusterLayer = {
  id: 'clusters',
  type: 'circle',
  source: 'properties',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': ['step', ['get', 'point_count'], '#2563eb', 10, '#3b82f6', 30, '#60a5fa'],
    'circle-radius': ['step', ['get', 'point_count'], 20, 10, 30, 30, 40]
  }
};

export const clusterCountLayer = {
  id: 'cluster-count',
  type: 'symbol',
  source: 'properties',
  filter: ['has', 'point_count'],
  layout: {
    'text-field': '{point_count_abbreviated}',
    'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
    'text-size': 12
  },
  paint: {
    'text-color': '#ffffff'
  }
};

export const heatmapLayer = {
  id: 'property-heat',
  type: 'heatmap',
  source: 'properties',
  maxzoom: 15,
  paint: {
    'heatmap-weight': ['interpolate', ['linear'], ['get', 'trend'], 0.8, 0, 1.2, 1],
    'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
    'heatmap-color': [
      'interpolate',
      ['linear'],
      ['heatmap-density'],
      0, 'rgba(0, 0, 255, 0)',
      0.2, 'rgba(59, 130, 246, 0.5)',
      0.4, 'rgba(16, 185, 129, 0.6)',
      0.6, 'rgba(245, 158, 11, 0.7)',
      0.8, 'rgba(239, 68, 68, 0.8)',
      1, 'rgba(255, 255, 255, 0.9)'
    ],
    'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 5, 15, 30],
    'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 14, 0.8, 15, 0]
  }
};

export const unclusteredPointLayer = {
  id: 'unclustered-point',
  type: 'circle',
  source: 'properties',
  filter: ['!', ['has', 'point_count']],
  paint: {
    'circle-color': ['match', ['get', 'category'], 'RV', '#10b981', 'RV Park', '#10b981', '#2563eb'],
    'circle-radius': 8,
    'circle-stroke-width': 2,
    'circle-stroke-color': '#fff'
  }
};

export const poiLayer = {
  id: 'poi-labels',
  type: 'symbol',
  source: 'composite',
  'source-layer': 'poi_label',
  minzoom: 12,
  filter: ['any', 
    ['==', ['get', 'category_en'], 'Gas station'],
    ['==', ['get', 'category_en'], 'Supermarket'],
    ['==', ['get', 'category_en'], 'Coffee shop'],
    ['==', ['get', 'category_en'], 'Restaurant'],
    ['==', ['get', 'category_en'], 'Pharmacy'],
    ['==', ['get', 'category_en'], 'Bank'],
    ['==', ['get', 'category_en'], 'School'],
    ['==', ['get', 'category_en'], 'Hospital'],
    ['==', ['get', 'category_en'], 'Park']
  ],
  layout: {
    'text-field': ['get', 'name_en'],
    'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
    'text-size': 11,
    'text-letter-spacing': 0.05,
    'text-offset': [0, 1.5],
    'text-anchor': 'top',
    'icon-image': ['match', ['get', 'category_en'],
      'Gas station', 'fuel',
      'Supermarket', 'grocery',
      'Coffee shop', 'cafe',
      'Restaurant', 'restaurant',
      'Pharmacy', 'pharmacy',
      'Bank', 'bank',
      'School', 'school',
      'Hospital', 'hospital',
      'Park', 'park',
      'dot'
    ],
    'icon-size': 1.2,
    'visibility': 'visible'
  },
  paint: {
    'text-color': '#94a3b8',
    'text-halo-color': 'rgba(15, 23, 42, 0.8)',
    'text-halo-width': 2,
    'icon-opacity': 0.8,
    'icon-color': ['match', ['get', 'category_en'],
      'School', '#f59e0b',
      'Hospital', '#ef4444',
      'Park', '#10b981',
      '#3b82f6'
    ]
  }
};

export const vibeLayer = {
  id: 'neighborhood-vibe',
  type: 'fill',
  source: 'properties',
  paint: {
    'fill-color': [
      'interpolate',
      ['linear'],
      ['get', 'pulseScore'],
      50, '#ef4444',
      75, '#f59e0b',
      90, '#10b981'
    ],
    'fill-opacity': 0.15
  }
};

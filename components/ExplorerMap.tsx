'use client';
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Map, { Source, Layer, Marker, Popup, NavigationControl, FullscreenControl } from 'react-map-gl';
import { useSearchParams } from 'next/navigation';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
// @ts-ignore
import MapboxDirections from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions';
import '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css';
import { 
  FaHouse, 
  FaCircleInfo, 
  FaMapLocationDot, 
  FaBrain, 
  FaBolt, 
  FaRoute, 
  FaBus, 
  FaTrailer, 
  FaTags, 
  FaGasPump, 
  FaStore, 
  FaCoffee, 
  FaUtensils,
  FaCaravan
} from 'react-icons/fa6';
import Link from 'next/link';

const clusterLayer = {
  id: 'clusters',
  type: 'circle',
  source: 'properties',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': ['step', ['get', 'point_count'], '#2563eb', 10, '#3b82f6', 30, '#60a5fa'],
    'circle-radius': ['step', ['get', 'point_count'], 20, 10, 30, 30, 40]
  }
};

const clusterCountLayer = {
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

const heatmapLayer = {
  id: 'property-heat',
  type: 'heatmap',
  source: 'properties',
  maxzoom: 15,
  paint: {
    'heatmap-weight': ['interpolate', ['linear'], ['get', 'trend'], 0.9, 0, 1.1, 1],
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

const unclusteredPointLayer = {
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

const poiLayer = {
  id: 'poi-labels',
  type: 'symbol',
  source: 'composite',
  'source-layer': 'poi_label',
  filter: ['any', 
    ['==', ['get', 'category_en'], 'Gas station'],
    ['==', ['get', 'category_en'], 'Supermarket'],
    ['==', ['get', 'category_en'], 'Coffee shop'],
    ['==', ['get', 'category_en'], 'Restaurant'],
    ['==', ['get', 'category_en'], 'Pharmacy'],
    ['==', ['get', 'category_en'], 'Bank']
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
      'dot'
    ],
    'icon-size': 1.2
  },
  paint: {
    'text-color': '#94a3b8',
    'text-halo-color': 'rgba(15, 23, 42, 0.8)',
    'text-halo-width': 2,
    'icon-opacity': 0.8,
    'icon-color': '#3b82f6'
  }
};

const ExplorerMap = ({ onSelectionChange, onPropertySelect, results = [], hoveredId = null, activeRouteProperty = null }) => {
  const searchParams = useSearchParams();
  const [jamieInsights, setJamieInsights] = useState([]);
  const [valuations, setValuations] = useState([]);
  const [selectedInsight, setSelectedInsight] = useState(null);
  const [selectedValuation, setSelectedValuation] = useState(null);
  const [showDirections, setShowDirections] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showPOIs, setShowPOIs] = useState(false);

  // Sync routing from external trigger
  useEffect(() => {
    if (activeRouteProperty && !showDirections) {
      toggleDirections(activeRouteProperty);
    } else if (!activeRouteProperty && showDirections) {
      toggleDirections(null);
    }
  }, [activeRouteProperty]);

  // State for GeoJSON results calculated in Web Worker
  const [geojsonResults, setGeojsonResults] = useState({
    type: 'FeatureCollection',
    features: []
  });

  const workerRef = useRef(null);

  // Initialize Web Worker for background GeoJSON processing
  useEffect(() => {
    // @ts-ignore - Next.js handles Worker(new URL(...)) pattern
    const worker = new Worker(new URL('../utils/workers/geojson.worker.js', import.meta.url));
    workerRef.current = worker;

    worker.onmessage = (event) => {
      setGeojsonResults(event.data);
    };

    return () => {
      worker.terminate();
    };
  }, []);

  // Update GeoJSON when underlying data changes (Worker now handles state)
  useEffect(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ results, valuations });
    }
  }, [results, valuations]);

  // Sync hoveredId to Mapbox feature-state for instant performance
  const prevHoveredId = useRef(null);
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();
    
    // Clear previous hover state
    if (prevHoveredId.current) {
      try {
        map.setFeatureState(
          { source: 'properties', id: prevHoveredId.current },
          { hovered: false }
        );
      } catch (err) { /* Silent fail if source not loaded */ }
    }
    
    // Set new hover state
    if (hoveredId) {
      try {
        map.setFeatureState(
          { source: 'properties', id: hoveredId },
          { hovered: true }
        );
        prevHoveredId.current = hoveredId;
      } catch (err) { /* Silent fail if source not loaded */ }
    }
  }, [hoveredId]);

  useEffect(() => {
    const fetchJamieInsights = async () => {
      try {
        const res = await fetch('/api/jamie/dreams');
        if (res.ok) {
          const data = await res.json();
          setJamieInsights(data);
        }
      } catch (error) {
        console.error('Failed to fetch Jamie insights:', error);
      }
    };
    const fetchValuations = async () => {
      try {
        const res = await fetch('/api/valuation');
        if (res.ok) {
          const data = await res.json();
          setValuations(data);
        }
      } catch (error) {
        console.error('Failed to fetch valuation grid:', error);
      }
    };
    fetchJamieInsights();
    fetchValuations();
  }, []);

  const urlLat = searchParams.get('lat');
  const urlLng = searchParams.get('lng');
  const urlId = searchParams.get('id');

  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);

  // Auto-select property if urlId is present
  useEffect(() => {
    if (urlId && results.length > 0) {
      const target = results.find(p => p._id === urlId);
      if (target) {
        setSelectedProperty(target);
        if (onPropertySelect) onPropertySelect(target);
      }
    }
  }, [urlId, results, onPropertySelect]);

  // Sync with parent results
  useEffect(() => {
    if (results.length > 0) {
      setProperties(results);
    }
  }, [results]);

  const [viewState, setViewState] = useState({
    longitude: urlLng ? parseFloat(urlLng) : -97.7431,
    latitude: urlLat ? parseFloat(urlLat) : 30.2672,
    zoom: urlId ? 15 : 11,
    pitch: 45,
    bearing: -17
  });

  const mapRef = useRef();
  const drawRef = useRef();
  const directionsRef = useRef();

  // Handle draw control and directions initialization
  const onMapLoad = useCallback((e) => {
    const map = e.target;
    
    // Draw Control
    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true
      },
      defaultMode: 'simple_select'
    });
    map.addControl(draw, 'top-left');
    drawRef.current = draw;

    // Directions Control
    const directions = new MapboxDirections({
      accessToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
      unit: 'imperial',
      profile: 'mapbox/driving',
      interactive: false,
      controls: {
        inputs: false,
        instructions: true,
        profileSwitcher: false
      }
    });
    directionsRef.current = directions;

    const updateSelection = (event) => {
      const features = draw.getAll().features;
      if (features.length > 0) {
        const feature = features[features.length - 1]; 
        if (feature.geometry.type === 'Polygon') {
          const coords = feature.geometry.coordinates[0].flat().join(',');
          onSelectionChange({ type: 'polygon', data: coords, feature });
        }
      }
    };

    map.on('draw.create', updateSelection);
    map.on('draw.update', updateSelection);
    map.on('draw.delete', () => {
      onSelectionChange(null);
      setProperties([]);
    });

    return () => {
      map.removeControl(draw);
    };
  }, [onSelectionChange]);

  const toggleDirections = (targetProperty) => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();

    if (showDirections) {
      map.removeControl(directionsRef.current);
      setShowDirections(false);
    } else {
      map.addControl(directionsRef.current, 'top-left');
      
      // Attempt to get user location
      navigator.geolocation.getCurrentPosition((pos) => {
        directionsRef.current.setOrigin([pos.coords.longitude, pos.coords.latitude]);
        directionsRef.current.setDestination([
          targetProperty.location_geo.coordinates[0], 
          targetProperty.location_geo.coordinates[1]
        ]);
      });
      setShowDirections(true);
    }
  };

  return (
    <div className="relative w-full h-screen">
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        onLoad={onMapLoad}
        ref={mapRef}
        terrain={{ source: 'mapbox-dem', exaggeration: 1.5 }}
      >
        {showPOIs && <Layer {...poiLayer} />}
        <Source
          id="mapbox-dem"
          type="raster-dem"
          url="mapbox://mapbox.mapbox-terrain-dem-v1"
          tileSize={512}
          maxzoom={14}
        />
        
        <Source
          id="properties"
          type="geojson"
          data={geojsonResults}
          cluster={true}
          clusterMaxZoom={14}
          clusterRadius={50}
          promoteId="id"
        >
          {showHeatmap && <Layer {...heatmapLayer} />}
          <Layer {...clusterLayer} />
          <Layer {...clusterCountLayer} />
          <Layer 
            {...unclusteredPointLayer} 
            paint={{
              ...unclusteredPointLayer.paint,
              'circle-radius': ['case', ['boolean', ['feature-state', 'hovered'], false], 12, 8],
              'circle-stroke-width': ['case', ['boolean', ['feature-state', 'hovered'], false], 4, 2],
              'circle-stroke-color': ['case', ['boolean', ['feature-state', 'hovered'], false], '#3b82f6', '#fff']
            }}
          />
        </Source>

        <NavigationControl position="bottom-right" />
        <FullscreenControl position="bottom-right" />

        {/* Custom Marker Logic for Individual High-Focus Properties */}
        {results.length < 15 && results.map(property => {
          const isRV = property.type === 'RV' || property.type === 'RV Park';
          const isHovered = property._id === hoveredId;
          const intensity = (property.leadCount / (property.globalAvgLeads || 5)) * 1.5;
          const isHighIntensity = intensity > 1.2;
          const isUrgent = property.leadCount > 10;

          let RVIcon = FaCaravan;
          if (property.rv_type?.includes('Class')) RVIcon = FaBus;
          else if (property.rv_type?.includes('Trailer') || property.rv_type?.includes('Fifth') || property.rv_type?.includes('Hauler')) RVIcon = FaTrailer;

          return (
            <Marker
              key={property._id}
              longitude={property.location_geo.coordinates[0]}
              latitude={property.location_geo.coordinates[1]}
              anchor="bottom"
              onClick={e => {
                e.originalEvent.stopPropagation();
                setSelectedProperty(property);
                if (onPropertySelect) onPropertySelect(property);
              }}
            >
              <div className={`relative flex flex-col items-center group cursor-pointer transition-all duration-500 ${isHovered ? 'scale-125 z-50' : 'hover:scale-110'}`}>
                {/* Organic Sunset Glow (Radial Gradient) */}
                <div 
                  className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none transition-all duration-1000 ease-out'
                  style={{
                    width: `${40 + (property.leadCount * 10)}px`,
                    height: `${40 + (property.leadCount * 10)}px`,
                    background: `radial-gradient(circle, rgba(249, 115, 22, ${0.1 + Math.min(property.leadCount * 0.05, 0.4)}) 0%, rgba(249, 115, 22, 0) 70%)`,
                    opacity: isHighIntensity ? 1 : 0.6,
                    transform: `translate(-50%, -20%) scale(${isHovered ? 1.2 : 1})`,
                  }}
                />

                <div className={`bg-white text-[10px] font-black px-2 py-1 rounded-full shadow-xl mb-1 transition-all duration-300 ${isRV ? 'text-green-600 border border-green-500' : 'text-blue-600 border border-blue-500'} ${results.length > 8 && !isHovered ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'} ${isHovered ? 'ring-2 ring-blue-500 ring-offset-1' : ''} relative z-10`}>
                  ${(property.rates.monthly || property.rates.nightly || property.rates.weekly)?.toLocaleString()}
                </div>
                <div className={`p-2 rounded-full border-2 border-white shadow-2xl transition-all duration-500 group-hover:shadow-blue-500/50 ${isRV ? 'bg-green-500' : 'bg-blue-600'} ${isHovered || isHighIntensity ? 'bg-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.8)]' : ''} ${isUrgent ? 'animate-pulse ring-4 ring-red-500/50' : ''} relative z-10`}
                  style={{
                    boxShadow: isHighIntensity ? `0 0 ${15 * intensity}px rgba(59, 130, 246, 0.6)` : 'none'
                  }}
                >
                  {isRV && !isHovered ? <RVIcon className="text-white text-xs" /> : <FaHouse className="text-white text-xs" />}
                </div>
              </div>
            </Marker>
          );
        })}

        {/* Jamie's Spatial Intelligence (Dreams) */}
        {jamieInsights.map((dream, index) => (
          <Marker
            key={dream.id || index}
            longitude={dream.geometry.coordinates[0]}
            latitude={dream.geometry.coordinates[1]}
            anchor="bottom"
            onClick={e => {
              e.originalEvent.stopPropagation();
              setSelectedInsight(dream);
            }}
          >
            <div className="bg-amber-500 p-2 rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-125 transition-transform animate-pulse">
              <FaBrain className="text-white text-xs" />
            </div>
          </Marker>
        ))}

        {selectedInsight && (
          <Popup
            longitude={selectedInsight.geometry.coordinates[0]}
            latitude={selectedInsight.geometry.coordinates[1]}
            anchor="top"
            onClose={() => setSelectedInsight(null)}
            closeOnClick={false}
            className="z-50"
          >
            <div className="p-3 max-w-[220px] bg-slate-900 text-white rounded-xl">
              <div className="flex items-center gap-2 mb-2 text-amber-400">
                <FaBrain className="text-sm" />
                <h4 className="font-black text-[10px] uppercase tracking-widest">{selectedInsight.properties.category}</h4>
              </div>
              <h3 className="font-bold text-sm mb-1">{selectedInsight.properties.title}</h3>
              <p className="text-[10px] text-slate-300 leading-relaxed mb-3">
                {selectedInsight.properties.description}
              </p>
              <div className="flex justify-between items-center pt-2 border-t border-white/10">
                <span className="text-[8px] font-black uppercase text-slate-500">Intelligence: {selectedInsight.properties.intelligence_score}%</span>
                <span className="text-[8px] font-black uppercase text-blue-400">JAMIE_INTEL</span>
              </div>
            </div>
          </Popup>
        )}

        {/* Valuation Intelligence Markers */}
        {valuations.map(valuation => {
          const isHovered = valuation._id === hoveredId;
          return (
            <Marker
              key={valuation._id}
              longitude={valuation.location_geo.coordinates[0]}
              latitude={valuation.location_geo.coordinates[1]}
              anchor="bottom"
              onClick={e => {
                e.originalEvent.stopPropagation();
                setSelectedValuation(valuation);
              }}
            >
              <div className={`flex flex-col items-center group cursor-pointer transition-all duration-500 ${isHovered ? 'scale-125 z-50' : 'hover:scale-110'}`}>
                <div className={`bg-emerald-600 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-xl mb-1 transition-all duration-300 ${isHovered ? 'ring-2 ring-emerald-400 ring-offset-1' : ''}`}>
                  ${valuation.estimate?.toLocaleString()}
                </div>
                <div className={`p-2 rounded-full border-2 border-white shadow-2xl bg-emerald-500 transition-all duration-500 ${isHovered ? 'shadow-[0_0_20px_rgba(16,185,129,0.8)] animate-pulse' : ''}`}>
                  <FaTags className="text-white text-xs" />
                </div>
              </div>
            </Marker>
          );
        })}

        {selectedValuation && (
          <Popup
            longitude={selectedValuation.location_geo.coordinates[0]}
            latitude={selectedValuation.location_geo.coordinates[1]}
            anchor="top"
            onClose={() => setSelectedValuation(null)}
            closeOnClick={false}
            className="z-50"
          >
            <div className="p-3 max-w-[220px] bg-slate-900 text-white rounded-xl">
              <div className="flex items-center gap-2 mb-2 text-emerald-400">
                <FaTags className="text-sm" />
                <h4 className="font-black text-[10px] uppercase tracking-widest">Asset Valuation</h4>
              </div>
              <h3 className="font-bold text-sm mb-1">{selectedValuation.address}</h3>
              <div className="text-2xl font-black text-white italic tracking-tighter mb-2">
                ${selectedValuation.estimate?.toLocaleString()}
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-white/10">
                <span className="text-[8px] font-black uppercase text-slate-500">Confirmed Grid Data</span>
                <span className="text-[8px] font-black uppercase text-blue-400">JAMIE_RECON</span>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Floating UI Elements */}
      <div className="absolute top-5 right-5 z-10 space-y-3">
        <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-2xl max-w-[250px]">
          <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3 text-blue-400">
            <FaMapLocationDot />
            <h3 className="text-xs font-black uppercase tracking-widest">Grid Intelligence</h3>
          </div>            <div className="flex gap-2">
              <button 
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`text-[8px] px-2 py-1 rounded font-black transition-all border ${showHeatmap ? 'bg-orange-500 border-orange-400 text-white' : 'bg-white/5 border-white/10 text-slate-500'}`}
              >
                THERMAL
              </button>
              <button 
                onClick={() => setShowPOIs(!showPOIs)}
                className={`text-[8px] px-2 py-1 rounded font-black transition-all border ${showPOIs ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-slate-500'}`}
              >
                POI RECON
              </button>
            </div>
          </div>
          <p className="text-[10px] text-slate-300 leading-relaxed font-medium">
            3D Terrain and Clustering enabled. Toggle POI RECON to identify strategic infrastructure like gas and supplies.
          </p>
        </div>
        
        {showDirections && (
          <div className="bg-blue-600 p-4 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-right-10 duration-500">
            <div className="flex items-center gap-3 text-white">
              <FaRoute className="animate-pulse" />
              <h3 className="text-[10px] font-black uppercase tracking-widest">Active Route Grid</h3>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExplorerMap;

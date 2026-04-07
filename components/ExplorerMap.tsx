'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import Map, { Source, Layer, NavigationControl, FullscreenControl } from 'react-map-gl';
import { useSearchParams } from 'next/navigation';
import 'mapbox-gl/dist/mapbox-gl.css';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
// @ts-ignore
import MapboxDirections from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions';
import '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css';

import { 
  clusterLayer, 
  clusterCountLayer, 
  heatmapLayer, 
  unclusteredPointLayer, 
  poiLayer 
} from '@/constants/mapLayers';

import PropertyMarker from './explorer/PropertyMarker';
import InsightMarker from './explorer/InsightMarker';
import InsightPopup from './explorer/InsightPopup';
import ValuationMarker from './explorer/ValuationMarker';
import ValuationPopup from './explorer/ValuationPopup';
import MapControls from './explorer/MapControls';

import { useJamieInsights } from '@/hooks/useJamieInsights';
import { useValuations } from '@/hooks/useValuations';

const ExplorerMap = ({ onSelectionChange, onPropertySelect, results = [], hoveredId = null, activeRouteProperty = null }) => {
  const searchParams = useSearchParams();
  const { jamieInsights } = useJamieInsights();
  const { valuations } = useValuations();
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

  const urlLat = searchParams.get('lat');
  const urlLng = searchParams.get('lng');
  const urlId = searchParams.get('id');

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
        {results.length < 15 && results.map(property => (
          <PropertyMarker 
            key={property._id}
            property={property}
            hoveredId={hoveredId}
            resultsCount={results.length}
            onSelect={(p) => {
              setSelectedProperty(p);
              if (onPropertySelect) onPropertySelect(p);
            }}
          />
        ))}

        {/* Jamie's Spatial Intelligence (Dreams) */}
        {jamieInsights.map((dream, index) => (
          <InsightMarker 
            key={dream.id || index}
            dream={dream}
            onSelect={setSelectedInsight}
          />
        ))}

        {selectedInsight && (
          <InsightPopup 
            dream={selectedInsight}
            onClose={() => setSelectedInsight(null)}
          />
        )}

        {/* Valuation Intelligence Markers */}
        {valuations.map(valuation => (
          <ValuationMarker 
            key={valuation._id}
            valuation={valuation}
            hoveredId={hoveredId}
            onSelect={setSelectedValuation}
          />
        ))}

        {selectedValuation && (
          <ValuationPopup 
            valuation={selectedValuation}
            onClose={() => setSelectedValuation(null)}
          />
        )}
      </Map>

      {/* Floating UI Elements */}
      <MapControls 
        showHeatmap={showHeatmap}
        setShowHeatmap={setShowHeatmap}
        showPOIs={showPOIs}
        setShowPOIs={setShowPOIs}
        showDirections={showDirections}
      />
    </div>
  );
};

export default ExplorerMap;

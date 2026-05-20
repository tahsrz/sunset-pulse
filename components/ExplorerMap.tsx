'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import Map, { Source, Layer, NavigationControl, FullscreenControl, MapRef } from 'react-map-gl';
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
  poiLayer,
  vibeLayer
} from '@/constants/mapLayers';

import PropertyMarker from './explorer/PropertyMarker';
import InsightMarker from './explorer/InsightMarker';
import InsightPopup from './explorer/InsightPopup';
import ValuationMarker from './explorer/ValuationMarker';
import ValuationPopup from './explorer/ValuationPopup';
import MapControls from './explorer/MapControls';
import AtlasPulseMarker, { type AtlasPulsePlace } from './explorer/AtlasPulseMarker';
import AtlasPulsePopup from './explorer/AtlasPulsePopup';

import { useJamieInsights } from '@/hooks/useJamieInsights';
import { useValuations } from '@/hooks/useValuations';

interface ExplorerMapProps {
  onSelectionChange: (selection: any) => void;
  onPropertySelect?: (property: any) => void;
  results?: any[];
  hoveredId?: string | null;
  activeRouteProperty?: any;
  atlasPulsePlaces?: AtlasPulsePlace[];
}

const ExplorerMap: React.FC<ExplorerMapProps> = ({ 
  onSelectionChange, 
  onPropertySelect = null, 
  results = [], 
  hoveredId = null, 
  activeRouteProperty = null,
  atlasPulsePlaces = []
}) => {
  const searchParams = useSearchParams();
  const { jamieInsights } = useJamieInsights();
  const { valuations } = useValuations();
  const [selectedInsight, setSelectedInsight] = useState<any>(null);
  const [selectedValuation, setSelectedValuation] = useState<any>(null);
  const [showDirections, setShowDirections] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showPOIs, setShowPOIs] = useState(false);
  const [showVisual, setShowVisual] = useState(false);
  const [showAtlasPulse, setShowAtlasPulse] = useState(true);
  const [selectedAtlasPulsePlace, setSelectedAtlasPulsePlace] = useState<AtlasPulsePlace | null>(null);

  // State for GeoJSON results calculated in Web Worker
  const [geojsonResults, setGeojsonResults] = useState<any>({
    type: 'FeatureCollection',
    features: []
  });

  const workerRef = useRef<Worker | null>(null);

  // Initialize Web Worker for background GeoJSON processing
  useEffect(() => {
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
  const prevHoveredId = useRef<string | null>(null);
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

  const urlLat = searchParams?.get('lat');
  const urlLng = searchParams?.get('lng');
  const urlId = searchParams?.get('id');

  const [selectedProperty, setSelectedProperty] = useState<any>(null);

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
    longitude: urlLng ? parseFloat(urlLng) : -97.0403,
    latitude: urlLat ? parseFloat(urlLat) : 33.453823,
    zoom: urlId ? 15 : 10,
    pitch: 45,
    bearing: -17
  });

  const mapRef = useRef<MapRef>(null);
  const drawRef = useRef<any>(null);
  const directionsRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();

    const applyTerrain = () => {
      if (!map.getSource('mapbox-dem')) return;
      const currentTerrain = (map as any).getTerrain?.();
      if (currentTerrain?.source === 'mapbox-dem' && currentTerrain?.exaggeration === 1.5) return;
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
    };

    applyTerrain();
    map.on('styledata', applyTerrain);
    map.on('sourcedata', applyTerrain);

    return () => {
      map.off('styledata', applyTerrain);
      map.off('sourcedata', applyTerrain);
    };
  }, [showVisual]);

  const onMapClick = useCallback((event: any) => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();
    const features = map.queryRenderedFeatures(event.point, {
      layers: ['unclustered-point', 'clusters']
    });

    if (!features.length) return;

    const feature: any = features[0];
    if (feature.layer.id === 'clusters') {
      const clusterId = feature.properties.cluster_id;
      const source: any = map.getSource('properties');
      source.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
        if (err) return;
        map.easeTo({
          center: feature.geometry.coordinates,
          zoom: zoom
        });
      });
    } else {
      const propertyId = feature.properties.id;
      const target = results.find(p => p._id === propertyId);
      if (target) {
        setSelectedProperty(target);
        if (onPropertySelect) onPropertySelect(target);
      }
    }
  }, [results, onPropertySelect]);

  // Handle draw control and directions initialization
  const onMapLoad = useCallback((e: any) => {
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

    const updateSelection = (event: any) => {
      const features = draw.getAll().features;
      if (features.length > 0) {
        const feature = features[features.length - 1]; 
        if (feature.geometry.type === 'Polygon') {
          const coords = (feature.geometry as any).coordinates[0].flat().join(',');
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

  const toggleDirections = useCallback((targetProperty: any) => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();

    if (showDirections) {
      if (directionsRef.current) map.removeControl(directionsRef.current);
      setShowDirections(false);
    } else {
      if (directionsRef.current) {
        map.addControl(directionsRef.current, 'top-left');
        
        // Attempt to get user location
        navigator.geolocation.getCurrentPosition((pos) => {
          if (targetProperty?.location_geo?.coordinates) {
            directionsRef.current.setOrigin([pos.coords.longitude, pos.coords.latitude]);
            directionsRef.current.setDestination([
              targetProperty.location_geo.coordinates[0], 
              targetProperty.location_geo.coordinates[1]
            ]);
          }
        });
        setShowDirections(true);
      }
    }
  }, [showDirections]);

  // Sync routing from external trigger
  useEffect(() => {
    if (activeRouteProperty && !showDirections) {
      toggleDirections(activeRouteProperty);
    } else if (!activeRouteProperty && showDirections) {
      toggleDirections(null);
    }
  }, [activeRouteProperty, showDirections, toggleDirections]);

  return (
    <div className="relative w-full h-screen">
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapStyle={showVisual ? "mapbox://styles/mapbox/satellite-v9" : "mapbox://styles/mapbox/dark-v11"}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        onLoad={onMapLoad}
        onClick={onMapClick}
        interactiveLayerIds={['unclustered-point', 'clusters']}
        ref={mapRef}
      >
        {showPOIs && <Layer {...(poiLayer as any)} />}
        {showVisual && <Layer {...(vibeLayer as any)} />}
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
          {showHeatmap && <Layer {...(heatmapLayer as any)} />}
          <Layer {...(clusterLayer as any)} />
          <Layer {...(clusterCountLayer as any)} />
          <Layer 
            {...(unclusteredPointLayer as any)} 
            paint={{
              ...(unclusteredPointLayer.paint as any),
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

        {showAtlasPulse && atlasPulsePlaces.map(place => (
          <AtlasPulseMarker
            key={place.slug}
            place={place}
            onSelect={setSelectedAtlasPulsePlace}
          />
        ))}

        {selectedAtlasPulsePlace && (
          <AtlasPulsePopup
            place={selectedAtlasPulsePlace}
            onClose={() => setSelectedAtlasPulsePlace(null)}
          />
        )}
      </Map>

      {/* Floating UI Elements */}
      <MapControls 
        showHeatmap={showHeatmap}
        setShowHeatmap={setShowHeatmap}
        showPOIs={showPOIs}
        setShowPOIs={setShowPOIs}
        showVisual={showVisual}
        setShowVisual={setShowVisual}
        showAtlasPulse={showAtlasPulse}
        setShowAtlasPulse={setShowAtlasPulse}
        showDirections={showDirections}
      />
    </div>
  );
};

export default ExplorerMap;

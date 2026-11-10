'use client';
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Map, { Source, Layer, NavigationControl, FullscreenControl, MapRef } from 'react-map-gl';
import { useSearchParams } from 'next/navigation';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
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
import type { MapValuationResult } from '@/models/types';
import { buildPublicListingGeoJson, validCoordinates } from '@/lib/explorer/listingGeometry';
import { MapUnavailable } from './explorer/ExplorerMapBoundary';
import type { ExplorerSelection } from '@/lib/explorer/publicSearch';
import { mapFailureDiagnostic } from '@/lib/explorer/mapDiagnostics';

interface ExplorerMapProps {
  onSelectionChange: (selection: any) => void;
  onPropertySelect?: (property: any) => void;
  results?: any[];
  hoveredId?: string | null;
  activeRouteProperty?: any;
  onViewportChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  onUnavailable?: () => void;
  selection?: ExplorerSelection | null;
}

const ExplorerMap: React.FC<ExplorerMapProps> = ({ 
  onSelectionChange, 
  onPropertySelect = null, 
  results = [], 
  hoveredId = null, 
  activeRouteProperty = null,
  onViewportChange,
  onUnavailable,
  selection,
}) => {
  const searchParams = useSearchParams();
  const { jamieInsights } = useJamieInsights();
  const { valuations } = useValuations();
  const [selectedInsight, setSelectedInsight] = useState<any>(null);
  const [selectedValuation, setSelectedValuation] = useState<MapValuationResult | null>(null);
  const [showDirections, setShowDirections] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showPOIs, setShowPOIs] = useState(false);
  const [showVisual, setShowVisual] = useState(false);
  const selectionChangeRef = useRef(onSelectionChange);
  useEffect(() => { selectionChangeRef.current = onSelectionChange; }, [onSelectionChange]);

  // At most 500 public points; valuations remain separate markers, not listing density.
  const geojsonResults = useMemo(() => buildPublicListingGeoJson(results), [results]);
  const mapResults = useMemo(() => results.slice(0, 500).filter(property => property && validCoordinates(property.location_geo?.coordinates)), [results]);
  const [mapFailed, setMapFailed] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [directionsFailed, setDirectionsFailed] = useState(false);
  const mapCleanup = useRef<(() => void) | null>(null);
  const cleanControls = useCallback(() => { const clean = mapCleanup.current; mapCleanup.current = null; clean?.(); }, []);
  useEffect(() => () => cleanControls(), [cleanControls, mapFailed]);
  const reportUnavailable = useCallback((reason?: unknown) => {
    console.warn('[EXPLORER_MAP_UNAVAILABLE]', mapFailureDiagnostic(reason).message);
    setMapReady(false); setMapFailed(true); onUnavailable?.();
  }, [onUnavailable]);

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

  // Auto-select property if urlId is present
  useEffect(() => {
    if (urlId && results.length > 0) {
      const target = results.find(p => p.id === urlId || p._id === urlId);
      if (target) {
        if (urlLat === null && urlLng === null && validCoordinates(target.location_geo?.coordinates)) {
          const [longitude, latitude] = target.location_geo.coordinates;
          setViewState(view => ({ ...view, longitude, latitude, zoom: 15 }));
        }
        if (onPropertySelect) onPropertySelect(target);
      }
    }
  }, [urlId, urlLat, urlLng, results, onPropertySelect]);

  const initialCoordinates = urlLng?.trim() && urlLat?.trim() && validCoordinates([Number(urlLng), Number(urlLat)]) ? [Number(urlLng), Number(urlLat)] : null;
  const [viewState, setViewState] = useState({
    longitude: initialCoordinates?.[0] ?? -97.0403,
    latitude: initialCoordinates?.[1] ?? 33.453823,
    zoom: urlId ? 15 : 10,
    pitch: 45,
    bearing: -17
  });

  const mapRef = useRef<MapRef>(null);
  const drawRef = useRef<any>(null);
  const directionsRef = useRef<any>(null);
  const viewStateRef = useRef(viewState);

  useEffect(() => {
    if (!urlLng?.trim() || !urlLat?.trim() || !validCoordinates([Number(urlLng), Number(urlLat)])) return;
    setViewState(view => view.longitude === Number(urlLng) && view.latitude === Number(urlLat)
      ? view : { ...view, longitude: Number(urlLng), latitude: Number(urlLat) });
  }, [urlLng, urlLat]);

  useEffect(() => {
    if (selection === null) drawRef.current?.deleteAll();
  }, [selection]);

  useEffect(() => {
    viewStateRef.current = viewState;
  }, [viewState]);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();

    let frame: number | null = null;
    const settleLayout = () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        if (mapRef.current?.getMap() !== map) return;
        try {
          const currentView = viewStateRef.current;
          map.resize();
          map.jumpTo({
            center: [currentView.longitude, currentView.latitude],
            zoom: currentView.zoom,
            pitch: currentView.pitch,
            bearing: currentView.bearing,
          });
        } catch { reportUnavailable(); }
      });
    };

    const applyTerrain = () => {
      try {
        if (!map.getSource('mapbox-dem')) return;
        const currentTerrain = (map as any).getTerrain?.();
        if (currentTerrain?.source === 'mapbox-dem' && currentTerrain?.exaggeration === 1.5) return;
        map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
        settleLayout();
      } catch (error) { reportUnavailable(error); }
    };

    applyTerrain();
    map.on('styledata', applyTerrain);
    map.on('sourcedata', applyTerrain);
    map.once('idle', settleLayout);

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      map.off('styledata', applyTerrain);
      map.off('sourcedata', applyTerrain);
      map.off('idle', settleLayout);
    };
  }, [showVisual, mapFailed, reportUnavailable]);

  const onMapClick = useCallback((event: any) => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();
    try {
      const features = map.queryRenderedFeatures(event.point, {
        layers: ['unclustered-point', 'clusters']
      });

      if (!features.length) return;

      const feature: any = features[0];
      if (feature.layer.id === 'clusters') {
        const clusterId = feature.properties.cluster_id;
        const source: any = map.getSource('properties');
        source.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
          if (err || !Number.isFinite(zoom) || mapRef.current?.getMap() !== map) return;
          try { map.easeTo({
            center: feature.geometry.coordinates,
            zoom: zoom
          }); } catch { reportUnavailable(); }
        });
      } else {
        const propertyId = feature.properties.id;
        const target = results.find(p => p._id === propertyId);
        if (target) {
          if (onPropertySelect) onPropertySelect(target);
        }
      }
    } catch (error) { reportUnavailable(error); }
  }, [results, onPropertySelect, reportUnavailable]);

  // Handle draw control and directions initialization
  const onMapLoad = useCallback(async (e: any) => {
    const map = e.target;
    try {
      const bounds = map.getBounds();
      onViewportChange?.({
        north: bounds.getNorth(), south: bounds.getSouth(),
        east: bounds.getEast(), west: bounds.getWest(),
      });
    
      // Draw Control
      const { default: MapboxDraw } = await import('@mapbox/mapbox-gl-draw');
      if (mapRef.current?.getMap() !== map) return;
      cleanControls();
      const cleanup: Array<() => void> = [];
      mapCleanup.current = () => {
        cleanup.reverse().forEach(clean => { try { clean(); } catch { /* Map may already be removed. */ } });
        drawRef.current = null;
        directionsRef.current = null;
      };

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
      cleanup.push(() => { if (map.hasControl(draw)) map.removeControl(draw); });

      const updateSelection = () => {
        const features = draw.getAll().features;
        if (features.length > 0) {
          const feature = features[features.length - 1];
          if (feature.geometry.type === 'Polygon') {
            const coords = (feature.geometry as any).coordinates[0].flat().join(',');
            selectionChangeRef.current({ type: 'polygon', data: coords, feature });
          }
        }
      };

      map.on('draw.create', updateSelection);
      map.on('draw.update', updateSelection);
      const clearSelection = () => {
        selectionChangeRef.current(null);
      };
      map.on('draw.delete', clearSelection);
      cleanup.push(() => {
        map.off('draw.create', updateSelection);
        map.off('draw.update', updateSelection);
        map.off('draw.delete', clearSelection);
      });
      setMapReady(true);
    } catch (error) {
      if (mapRef.current?.getMap() === map) reportUnavailable(error);
    }
  }, [onViewportChange, cleanControls, reportUnavailable]);

  const publishViewport = useCallback(() => {
    const bounds = mapRef.current?.getMap().getBounds();
    if (!bounds) return;
    onViewportChange?.({
      north: bounds.getNorth(), south: bounds.getSouth(),
      east: bounds.getEast(), west: bounds.getWest(),
    });
  }, [onViewportChange]);

  const routePoint = validCoordinates(activeRouteProperty?.location_geo?.coordinates) ? activeRouteProperty.location_geo.coordinates : null;
  const routeLongitude = routePoint?.[0];
  const routeLatitude = routePoint?.[1];
  // The legacy routing bundle compiles templates with eval. It must not gate the map.
  useEffect(() => {
    setShowDirections(false); setDirectionsFailed(false);
    if (!mapReady || routeLongitude === undefined || routeLatitude === undefined || !mapRef.current) return;
    const map = mapRef.current.getMap();
    let active = true;
    let directions: any = null;
    const removeDirections = () => {
      try { if (directions && map.hasControl(directions)) map.removeControl(directions); }
      catch { /* The renderer may already have removed the map. */ }
    };
    const failed = (reason?: unknown) => {
      if (!active) return;
      console.warn('[EXPLORER_DIRECTIONS_UNAVAILABLE]', mapFailureDiagnostic(reason).message);
      removeDirections();
      setShowDirections(false); setDirectionsFailed(true);
    };
    void import('@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions').then(({ default: MapboxDirections }) => {
      if (!active || mapRef.current?.getMap() !== map) return;
      directions = new MapboxDirections({ accessToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN, unit: 'imperial', profile: 'mapbox/driving', interactive: false, controls: { inputs: false, instructions: true, profileSwitcher: false } });
      directionsRef.current = directions;
      directions.on?.('error', failed);
      map.addControl(directions, 'top-left');
      navigator.geolocation.getCurrentPosition(pos => {
        if (!active || mapRef.current?.getMap() !== map) return;
        try {
          directions.setOrigin([pos.coords.longitude, pos.coords.latitude]);
          directions.setDestination([routeLongitude, routeLatitude]);
          setShowDirections(true);
        } catch (error) { failed(error); }
      }, failed);
    }).catch(failed);
    return () => {
      active = false;
      removeDirections();
      if (directionsRef.current === directions) directionsRef.current = null;
    };
  }, [mapReady, routeLongitude, routeLatitude]);

  const isTesting = process.env.NEXT_PUBLIC_E2E_MODE === 'true' && typeof navigator !== 'undefined' && navigator.webdriver;

  if (mapFailed) return <MapUnavailable onRetry={() => { cleanControls(); setShowDirections(false); setMapFailed(false); }} />;

  if (isTesting) {
    const activeId = hoveredId || urlId;
    const mockResults = mapResults;
    return (
      <div className="relative h-full w-full mapboxgl-map bg-slate-950" data-map-mode="fixture">
        {/* Render mock markers so Playwright finds them */}
        {mockResults.map((property, idx) => {
          const isMarkerHovered = property._id === activeId;
          return (
            <div 
              key={property._id || idx} 
              className="mapboxgl-marker absolute cursor-pointer"
              style={{
                left: `${100 + (idx * 50)}px`,
                top: `${200 + (idx * 30)}px`,
              }}
              onClick={() => {
                if (onPropertySelect) onPropertySelect(property);
              }}
            >
              <div className="relative flex flex-col items-center">
                {isMarkerHovered && (
                  <div className="absolute -top-8 bg-slate-900/90 text-[8px] font-black text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/50 uppercase tracking-widest whitespace-nowrap z-50">
                    Priority target: {property.name}
                  </div>
                )}
                <div className="bg-blue-600 text-white p-2 rounded-full text-xs">
                  {property.name}
                </div>
              </div>
            </div>
          );
        })}

        {/* Floating UI Elements */}
        <MapControls 
          showHeatmap={showHeatmap}
          setShowHeatmap={setShowHeatmap}
          showPOIs={showPOIs}
          setShowPOIs={setShowPOIs}
          showVisual={showVisual}
          setShowVisual={setShowVisual}
          showDirections={showDirections}
        />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {directionsFailed && routePoint ? <div role="status" className="absolute bottom-4 left-4 z-20 max-w-xs rounded-lg bg-slate-900 p-3 text-sm text-white">
        <p>In-map directions are unavailable.</p>
        <a className="underline" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${routeLatitude},${routeLongitude}`)}`} target="_blank" rel="noopener noreferrer">Open driving directions</a>
      </div> : null}
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onMoveEnd={publishViewport}
        mapStyle={showVisual ? "mapbox://styles/mapbox/satellite-v9" : "mapbox://styles/mapbox/dark-v11"}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        onLoad={onMapLoad}
        onError={reportUnavailable}
        onClick={onMapClick}
        interactiveLayerIds={['unclustered-point', 'clusters']}
        ref={mapRef}
      >
        {showPOIs && !showVisual && <Layer {...(poiLayer as any)} />}
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
        {mapResults.length < 15 && mapResults.map(property => (
          <PropertyMarker 
            key={property._id}
            property={property}
            hoveredId={hoveredId || urlId}
            resultsCount={results.length}
            onSelect={(p) => {
              if (onPropertySelect) onPropertySelect(p);
            }}
          />
        ))}

        {/* Jamie's Spatial Intelligence (Dreams) */}
        {jamieInsights.filter(dream => validCoordinates(dream?.geometry?.coordinates)).map((dream, index) => (
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
        {valuations.filter(valuation => validCoordinates(valuation?.location_geo?.coordinates)).map(valuation => (
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
        showVisual={showVisual}
        setShowVisual={setShowVisual}
        showDirections={showDirections}
      />
    </div>
  );
};

export default ExplorerMap;

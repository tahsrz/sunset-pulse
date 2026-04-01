'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import Map, { Source, Layer, Marker, Popup, NavigationControl, FullscreenControl } from 'react-map-gl';
import { useSearchParams } from 'next/navigation';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { FaHome, FaInfoCircle, FaMapMarkedAlt } from 'react-icons/fa';
import Link from 'next/link';

const ExplorerMap = ({ onSelectionChange, results = [] }) => {
  const searchParams = useSearchParams();
  const urlLat = searchParams.get('lat');
  const urlLng = searchParams.get('lng');
  const urlId = searchParams.get('id');

  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);

  // Sync with parent results
  useEffect(() => {
    if (results.length > 0) {
      setProperties(results);
    }
  }, [results]);
  const [viewState, setViewState] = useState({
    longitude: urlLng ? parseFloat(urlLng) : -97.7431,
    latitude: urlLat ? parseFloat(urlLat) : 30.2672,
    zoom: urlId ? 15 : 11
  });

  // Handle URL selection on load
  useEffect(() => {
    if (urlId && urlLat && urlLng) {
      const fetchProperty = async () => {
        try {
          const res = await fetch(`/api/properties/${urlId}`);
          const data = await res.json();
          if (data) {
            setProperties([data]);
            setSelectedProperty(data);
          }
        } catch (e) {
          console.error('Failed to fetch property from URL', e);
        }
      };
      fetchProperty();
    }
  }, [urlId, urlLat, urlLng]);

  const mapRef = useRef();
  const drawRef = useRef();

  // Handle draw control initialization
  const onMapLoad = useCallback((e) => {
    const map = e.target;
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

    const updateSelection = (event) => {
      const features = draw.getAll().features;
      if (features.length > 0) {
        const feature = features[features.length - 1]; // Use latest
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

  // Fetch properties when selection changes (via prop effect in parent or here)
  useEffect(() => {
    // This will be handled by the parent component (ExplorerPage) to sync with Jamie
  }, []);

  return (
    <div className="relative w-full h-screen">
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        onLoad={onMapLoad}
        ref={mapRef}
      >
        <NavigationControl position="bottom-right" />
        <FullscreenControl position="bottom-right" />

        {properties.map(property => (
          <Marker
            key={property._id}
            longitude={property.location_geo.coordinates[0]}
            latitude={property.location_geo.coordinates[1]}
            anchor="bottom"
            onClick={e => {
              e.originalEvent.stopPropagation();
              setSelectedProperty(property);
            }}
          >
            <div className="bg-blue-600 p-2 rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-110 transition-transform">
              <FaHome className="text-white text-xs" />
            </div>
          </Marker>
        ))}

        {selectedProperty && (
          <Popup
            longitude={selectedProperty.location_geo.coordinates[0]}
            latitude={selectedProperty.location_geo.coordinates[1]}
            anchor="top"
            onClose={() => setSelectedProperty(null)}
            closeOnClick={false}
            className="z-50"
          >
            <div className="p-2 max-w-[200px]">
              <img 
                src={selectedProperty.images[0]} 
                alt={selectedProperty.name} 
                className="w-full h-24 object-cover rounded-lg mb-2"
              />
              <h4 className="font-bold text-sm truncate">{selectedProperty.name}</h4>
              <p className="text-xs text-slate-600 mb-2">${selectedProperty.rates.monthly?.toLocaleString()}/mo</p>
              <Link 
                href={`/properties/${selectedProperty._id}`}
                className="block text-center bg-blue-600 text-white text-[10px] font-bold py-1.5 rounded-md hover:bg-blue-500 transition-colors"
              >
                View Details
              </Link>
            </div>
          </Popup>
        )}
      </Map>

      {/* Floating Instructions */}
      <div className="absolute top-5 right-5 z-10 bg-slate-900/80 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-2xl max-w-[250px]">
        <div className="flex items-center gap-3 mb-2 text-blue-400">
          <FaMapMarkedAlt />
          <h3 className="text-xs font-black uppercase tracking-widest">Map Explorer</h3>
        </div>
        <p className="text-[10px] text-slate-300 leading-relaxed font-medium">
          Draw a polygon on the map to search a specific neighborhood. Jamie will analyze the properties and local "Grill" data within your selection.
        </p>
      </div>
    </div>
  );
};

export default ExplorerMap;
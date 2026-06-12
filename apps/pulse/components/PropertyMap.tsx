'use client';
import { useEffect, useState } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import Map, { Marker } from 'react-map-gl';
import { setDefaults, fromAddress, OutputFormat } from 'react-geocode';
import Spinner from './Spinner';
import Image from 'next/image';
import pin from '@/assets/images/pin.svg';
import { Property } from '@/lib/types';

interface PropertyMapProps {
  property: Property;
}

const PropertyMap: React.FC<PropertyMapProps> = ({ property }) => {
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [geocodeError, setGeocodeError] = useState(false);

  setDefaults({
    key: process.env.NEXT_PUBLIC_GOOGLE_GEOCODING_API_KEY || '',
    language: 'en',
    region: 'us',
    outputFormat: OutputFormat.JSON,
  });

  useEffect(() => {
    const fetchCoords = async () => {
      try {
        const address = `${property.location.street} ${property.location.city} ${property.location.state} ${property.location.zipcode}`;
        const res: any = await fromAddress(address);

        //  Check for results
        if (!res.results || res.results.length === 0) {
          // No results found
          setGeocodeError(true);
          setLoading(false);
          return;
        }

        const { lat, lng } = res.results[0].geometry.location;

        setLat(lat);
        setLng(lng);
        setLoading(false);
      } catch (error) {
        console.error('Geocoding error:', error);
        setGeocodeError(true);
        setLoading(false);
      }
    };

    fetchCoords();
  }, [property]);

  if (loading) return <Spinner loading={loading} />;

  // Handle case where geocoding failed
  if (geocodeError || !lat || !lng) {
    return <div className='text-xl'>Location details unavailable for this property.</div>;
  }

  return (
    <Map
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      mapLib={import('mapbox-gl') as any}
      initialViewState={{
        longitude: lng,
        latitude: lat,
        zoom: 15,
      }}
      style={{ width: '100%', height: 500 }}
      mapStyle='mapbox://styles/mapbox/streets-v9'
    >
      <Marker longitude={lng} latitude={lat} anchor='bottom'>
        <Image src={pin} alt='Location Marker' width={40} height={40} />
      </Marker>
    </Map>
  );
};

export default PropertyMap;

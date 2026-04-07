'use client';

import { useState } from 'react';
import PropertyMap from '@/components/PropertyMap';
import PropertyHeader from './property/PropertyHeader';
import MarketIntelligence from './property/MarketIntelligence';
import PropertySpecs from './property/PropertySpecs';
import AmenityList from './property/AmenityList';
import PropertyViewer from './property/PropertyViewer';

/**
 * Detailed information about property
 * @param {Object} props - Component properties
 * @param {Object} props.property - The property object
 * @param {Object} props.rentData - RentCast data 
 */
const PropertyDetails = ({ property, rentData }) => {
  const [viewerType, setViewerType] = useState('fiber'); // Default to elite R3F

  return (
    <main>
      <PropertyHeader property={property} />

      {/* Market Intel / RentCast Section */}
      <MarketIntelligence rentData={rentData} />

      <PropertySpecs property={property} />

      <PropertyViewer 
        property={property} 
        viewerType={viewerType} 
        setViewerType={setViewerType} 
      />

      <AmenityList amenities={property.amenities} />

      <div className='bg-white p-6 rounded-lg shadow-md mt-6'>
        <PropertyMap property={property} />
      </div>
    </main>
  );
};
export default PropertyDetails;

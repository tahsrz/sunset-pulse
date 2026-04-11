'use client';

import React, { useState } from 'react';
import PropertyMap from '@/components/PropertyMap';
import PropertyHeader from './property/PropertyHeader';
import MarketIntelligence from './property/MarketIntelligence';
import NeighborhoodRecon from './property/NeighborhoodRecon';
import PropertySpecs from './property/PropertySpecs';
import AmenityList from './property/AmenityList';
import PropertyViewer from './property/PropertyViewer';
import { Property } from '@/lib/types';

interface PropertyDetailsProps {
  property: Property;
  rentData: any; // RentCast data structure is complex, using any for now or could be typed further
}

/**
 * Detailed information about property
 */
const PropertyDetails: React.FC<PropertyDetailsProps> = ({ property, rentData }) => {
  const [viewerType, setViewerType] = useState<string>('fiber'); // Default to elite R3F

  return (
    <main>
      <PropertyHeader property={property} />

      {/* Market Intel / RentCast Section */}
      <MarketIntelligence rentData={rentData} />

      {/* Neighborhood Intelligence Recon */}
      <NeighborhoodRecon propertyId={property._id} />

      <PropertySpecs property={property} />

      <PropertyViewer 
        property={property} 
        viewerType={viewerType} 
        setViewerType={setViewerType} 
      />

      <AmenityList amenities={property.amenities || []} />

      <div className='bg-white p-6 rounded-lg shadow-md mt-6'>
        <PropertyMap property={property} />
      </div>
    </main>
  );
};

export default PropertyDetails;

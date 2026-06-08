'use client';

import React, { useState } from 'react';
import PropertyMap from '@/components/PropertyMap';
import PropertyHeader from './property/PropertyHeader';
import MarketIntelligence from './property/MarketIntelligence';
import NeighborhoodInsights from './property/NeighborhoodInsights';
import PropertySpecs from './property/PropertySpecs';
import AmenityList from './property/AmenityList';
import PropertyViewer from './property/PropertyViewer';
import { Property } from '@/lib/types';

interface PropertyDetailsProps {
  property: Property;
  marketIntelligenceSlot?: React.ReactNode;
}

/**
 * Detailed information about property
 */
const PropertyDetails: React.FC<PropertyDetailsProps> = ({ property, marketIntelligenceSlot }) => {
  const [viewerType, setViewerType] = useState<string>('fiber'); // Default to R3F

  return (
    <main>
      <PropertyHeader property={property} />

      {/* Market Analysis (Streamed Slot) */}
      {marketIntelligenceSlot}

      {/* Neighborhood Insights */}
      <NeighborhoodInsights propertyId={property._id} />

      <PropertySpecs property={property} />

      <PropertyViewer property={property} />

      <AmenityList amenities={property.amenities || []} />

      <div className='bg-white p-6 rounded-lg shadow-md mt-6'>
        <PropertyMap property={property} />
      </div>
    </main>
  );
};

export default PropertyDetails;

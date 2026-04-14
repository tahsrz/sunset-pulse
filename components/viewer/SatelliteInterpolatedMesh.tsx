'use client';

import React from 'react';
import ProceduralBuilding, { BuildingType } from '../hero/ProceduralBuilding';

interface SatelliteInterpolatedMeshProps {
  property: any;
  color: string;
  customConfig?: any;
}

const SatelliteInterpolatedMesh: React.FC<SatelliteInterpolatedMeshProps> = ({ 
  property, 
  color, 
  customConfig 
}) => {
  const typeMap: Record<string, BuildingType> = {
    'House': 'GABLE_HOUSE',
    'Industrial': 'INDUSTRIAL',
    'Apartment': 'APARTMENT',
    'RV': 'RV_TRAILER',
    'RV Park': 'RV_TRAILER',
    'Office': 'MODERN_CUBE',
    'Senior Living': 'APARTMENT',
    'Other': 'MODERN_CUBE'
  };

  const buildingType = customConfig?.type || typeMap[property.type] || 'GABLE_HOUSE';
  const finalColor = customConfig?.color || color;
  const seed = customConfig?.seed || property._id || 0;
  
  const sqft = property.square_feet || 2000;
  const area = sqft / 100; 
  const side = Math.sqrt(area);
  
  const dimensions = {
    width: side,
    height: (property.beds > 3 || sqft > 3000) ? 1.8 : 1.0, 
    depth: side
  };

  if (buildingType === 'INDUSTRIAL') {
    dimensions.width *= 1.5;
    dimensions.depth *= 2;
    dimensions.height = 1.2;
  } else if (buildingType === 'RV_TRAILER') {
    dimensions.width = 1.5;
    dimensions.depth = 0.6;
    dimensions.height = 0.6;
  }
  
  return (
    <ProceduralBuilding 
      type={buildingType as any} 
      color={finalColor} 
      seed={seed} 
      dimensions={dimensions}
    />
  );
};

export default SatelliteInterpolatedMesh;

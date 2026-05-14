'use client';

import React, { Suspense, useRef } from 'react';
import { 
  OrbitControls, 
  PerspectiveCamera, 
  Environment, 
  ContactShadows, 
  Float, 
  PointerLockControls
} from '@react-three/drei';
import * as THREE from 'three';
import SunLight from '../hero/SunLight';
import TacticalStarfield from '../hero/TacticalStarfield';
import UserOrb from './UserOrb';
import NavigationController from './NavigationController';
import DetailedPropertyMesh from './DetailedPropertyMesh';
import SatelliteInterpolatedMesh from './SatelliteInterpolatedMesh';
import SpatialHotspots from './SpatialHotspots';
import PulseHeatmap from './PulseHeatmap';
import SurgicalIntelligenceOverlays from './SurgicalIntelligenceOverlays';
import { normalizeThreeGroup } from '@/lib/visualization/threeUtils';

const NormalizedModel = ({ children }: { children: React.ReactNode }) => {
  const groupRef = useRef<THREE.Group>(null);

  React.useEffect(() => {
    if (groupRef.current) {
      normalizeThreeGroup(groupRef.current, 5.0);
    }
  }, [children]);

  return <group ref={groupRef}>{children}</group>;
};

interface ViewerSceneProps {
  property: any;
  isNavigationMode: boolean;
  isNeuralMode: boolean;
  primaryColor: string;
  customConfig: any;
  peers: any;
  leadId: string | null;
  onUpdate: (pos: THREE.Vector3, rot: { yaw: number, pitch: number }) => void;
  onBoundaryHit: (hit: boolean) => void;
}

const ViewerScene: React.FC<ViewerSceneProps> = ({
  property,
  isNavigationMode,
  isNeuralMode,
  primaryColor,
  customConfig,
  peers,
  leadId,
  onUpdate,
  onBoundaryHit
}) => {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 8, 15]} fov={45} />
      
      <PointerLockControls enabled={isNavigationMode} />
      
      <OrbitControls 
        enabled={!isNavigationMode}
        enablePan={false} 
        enableZoom={true} 
        minDistance={8}
        maxDistance={25}
        minPolarAngle={Math.PI / 6} 
        maxPolarAngle={Math.PI / 2.2} 
        autoRotate={!isNavigationMode} 
        autoRotateSpeed={0.8}
      />

      {isNavigationMode && (
        <NavigationController 
          onUpdate={onUpdate} 
          onBoundaryHit={onBoundaryHit}
        />
      )}
      
      {!isNeuralMode && <SunLight preset="CYCLE" cycleSpeed={1000} />}
      
      <ambientLight intensity={isNavigationMode ? 0.3 : 0.4} />
      <spotLight position={[20, 30, 10]} angle={0.15} penumbra={1} intensity={0.5} color="#facc15" castShadow />
      <pointLight position={[-15, 10, -15]} intensity={0.8} color="#3b82f6" />
      <pointLight position={[15, 5, 15]} intensity={0.4} color="#f87171" />

      <Suspense fallback={null}>
        <TacticalStarfield />
        <SpatialHotspots property={property} isNeuralMode={isNeuralMode} />
        {isNeuralMode && <PulseHeatmap intensity={0.5} color="#3b82f6" />}
        {isNeuralMode && <SurgicalIntelligenceOverlays property={property} isNeuralMode={isNeuralMode} />}
        
        <Float speed={isNavigationMode ? 2.5 : 1.2} rotationIntensity={0.5} floatIntensity={0.5}>
          <NormalizedModel>
            {isNavigationMode ? (
              <DetailedPropertyMesh property={property} isNeuralMode={isNeuralMode} />
            ) : (
              <SatelliteInterpolatedMesh property={property} color={primaryColor} customConfig={customConfig} isNeuralMode={isNeuralMode} />
            )}
          </NormalizedModel>
        </Float>

        {Object.entries(peers).map(([peerId, peer]: [string, any]) => (
          <UserOrb 
            key={peerId} 
            pos={peer.pos} 
            user={peerId} 
            isLead={peerId === leadId} 
          />
        ))}
        
        <ContactShadows 
          position={[0, -2.5, 0]} 
          opacity={isNeuralMode ? 0.2 : 0.6} 
          scale={25} 
          blur={2.5} 
          far={5} 
        />
        <Environment preset={isNavigationMode || isNeuralMode ? 'night' : 'city'} />
      </Suspense>
    </>
  );
};

export default ViewerScene;

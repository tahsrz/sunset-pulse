'use client';

import React, { Suspense, useRef, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { 
  OrbitControls, 
  PerspectiveCamera, 
  Environment, 
  ContactShadows, 
  Float, 
  PointerLockControls
} from '@react-three/drei';
import * as THREE from 'three';
import { normalizeThreeGroup } from '@/lib/visualization/threeUtils';
import { getPropertySatelliteUrl } from '@/lib/core/geospatial/geotagUtils';
import { useAuth } from '@/context/AuthContext';
import { useMultiplayer } from '@/hooks/useMultiplayer';
import SunLight from './hero/SunLight';
import TacticalStarfield from './hero/TacticalStarfield';
import { useTheme } from '@/context/ThemeProvider';
import UserOrb from './viewer/UserOrb';
import NavigationController from './viewer/NavigationController';
import DetailedPropertyMesh from './viewer/DetailedPropertyMesh';
import SatelliteInterpolatedMesh from './viewer/SatelliteInterpolatedMesh';
const NormalizedModel = ({ children }: { children: React.ReactNode }) => {
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (groupRef.current) {
      normalizeThreeGroup(groupRef.current, 5.0);
    }
  }, [children]);

  return <group ref={groupRef}>{children}</group>;
};

interface PropertyFiberViewerProps {
  property: any;
  color?: string;
  customConfig?: any;
}

export default function PropertyFiberViewer({ property, color, customConfig }: PropertyFiberViewerProps) {
  const { user } = useAuth();
  const { updateBranding, logProtocol } = useTheme();
  const userName = user?.user_metadata?.full_name || user?.email || 'Anonymous_User';

  const primaryColor = color || '#ffffff';
  const [satelliteUrl, setSatelliteUrl] = useState<string | null>(null);
  const [isNavigationMode, setNavigationMode] = useState(false);
  const [telemetry, setTelemetry] = useState({ lat: 0, lng: 0, alt: 0 });
  const [boundaryHit, setBoundaryHit] = useState(false);
  
  const viewPos = useRef(new THREE.Vector3(0, 8, 15));
  const viewRot = useRef({ yaw: 0, pitch: 0 });

  const { peers, sendUpdate, leadId, isMeLead } = useMultiplayer(userName, viewPos.current);

  useEffect(() => {
    const fetchImagery = async () => {
      const url = await getPropertySatelliteUrl(property);
      setSatelliteUrl(url);
    };
    fetchImagery();
  }, [property]);

  const handleUpdate = (pos: THREE.Vector3, rot: { yaw: number, pitch: number }) => {
    const baseLat = property.location_geo?.coordinates?.[1] || 32.7767;
    const baseLng = property.location_geo?.coordinates?.[0] || -96.7970;
    
    setTelemetry({
      lat: baseLat + (pos.z * 0.0001),
      lng: baseLng + (pos.x * 0.0001),
      alt: pos.y * 3.28084 
    });

    viewPos.current.copy(pos);
    viewRot.current = rot;

    if (isNavigationMode) {
      sendUpdate(pos, rot, isMeLead);
    }
  };

  return (
    <div className={`relative w-full h-[500px] bg-slate-950 rounded-2xl overflow-hidden border border-white/10 group shadow-2xl transition-all duration-700 ${isNavigationMode ? 'ring-2 ring-blue-500/50' : ''}`}>
      
      {boundaryHit && (
        <div className="absolute inset-0 pointer-events-none z-20 border-[10px] border-red-500/20 animate-pulse flex items-center justify-center">
           <div className="font-mono text-red-500 text-[8px] font-black uppercase tracking-[0.5em] bg-black/80 px-4 py-2 rounded-full border border-red-500/50 backdrop-blur-md">
             [ ! ] Navigation_Limit_Reached
           </div>
        </div>
      )}

      <div className="absolute inset-0 pointer-events-none z-10 p-6" onPointerDown={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-2">
            <div className={`font-mono text-[10px] tracking-[0.4em] uppercase flex items-center gap-2 ${isNavigationMode ? 'text-blue-400' : 'text-slate-400'}`}>
              <div className={`w-2 h-2 rounded-full animate-pulse ${isNavigationMode ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,1)]' : 'bg-slate-500'}`} />
              [ {isNavigationMode ? `VIRTUAL_VIEW_ACTIVE // ${property.name?.toUpperCase()}` : 'ORBITAL_SCAN_ACTIVE'} ]
            </div>
            <div className="font-mono text-[8px] text-white/20 uppercase tracking-widest">
              Location: {property.location?.street?.slice(0, 10) || 'PROPERTY_BASE'}...
            </div>
          </div>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              setNavigationMode(!isNavigationMode);
            }}
            className="pointer-events-auto bg-black/60 backdrop-blur-xl border border-white/10 px-4 py-1.5 rounded-full text-[8px] font-black text-white/70 hover:text-white transition-colors tracking-tighter uppercase"
          >
            {isNavigationMode ? 'Exit Navigation' : 'Interactive View'}
          </button>
        </div>

        {isNavigationMode && (
          <div className="absolute top-20 right-6 text-right font-mono space-y-1">
            <div className="text-[10px] text-blue-500 uppercase tracking-tighter">View Coordinates</div>
            <div className="text-sm text-white font-bold">LAT: {telemetry.lat.toFixed(6)}</div>
            <div className="text-sm text-white font-bold">LNG: {telemetry.lng.toFixed(6)}</div>
            <div className="text-sm text-blue-400 font-bold">ALT: {telemetry.alt.toFixed(1)} FT</div>
          </div>
        )}
        
        <div className="absolute bottom-6 left-6 font-mono text-[9px] text-white/30 uppercase tracking-widest">
          Sunset Render Engine v6.1.0 // Pulse Visualization
        </div>
        
        <div className="absolute bottom-6 right-6 font-mono text-[9px] text-white/30 uppercase tracking-widest">
          {isNavigationMode ? 'MOVE: WASD | FAST: SPACE | VERT: CTRL/SHIFT' : 'MODE: ORBITAL_SCAN'}
        </div>

        <div className={`recon-scan-line ${isNavigationMode ? 'bg-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'opacity-20'}`} />
      </div>
      
      <Canvas shadows dpr={[1, 2]}>
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
            onUpdate={handleUpdate} 
            onBoundaryHit={setBoundaryHit}
          />
        )}
        
        <SunLight preset="CYCLE" cycleSpeed={1000} />
        
        <ambientLight intensity={isNavigationMode ? 0.3 : 0.4} />
        <spotLight position={[20, 30, 10]} angle={0.15} penumbra={1} intensity={0.5} color="#facc15" castShadow />
        <pointLight position={[-15, 10, -15]} intensity={0.8} color="#3b82f6" />
        <pointLight position={[15, 5, 15]} intensity={0.4} color="#f87171" />

        <Suspense fallback={null}>
          <TacticalStarfield />
          <Float speed={isNavigationMode ? 2.5 : 1.2} rotationIntensity={0.5} floatIntensity={0.5}>
            <NormalizedModel>
              {isNavigationMode ? (
                <DetailedPropertyMesh property={property} />
              ) : (
                <SatelliteInterpolatedMesh property={property} color={primaryColor} customConfig={customConfig} />
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
            opacity={0.6} 
            scale={25} 
            blur={2.5} 
            far={5} 
          />
          <Environment preset={isNavigationMode ? 'night' : 'city'} />
        </Suspense>
      </Canvas>
    </div>
  );
}

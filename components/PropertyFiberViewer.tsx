'use client';

import React, { Suspense, useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { 
  OrbitControls, 
  PerspectiveCamera, 
  Environment, 
  ContactShadows, 
  Float, 
  PointerLockControls,
  Stars,
  Html
} from '@react-three/drei';
import * as THREE from 'three';
import { normalizeThreeGroup } from '@/lib/visualization/threeUtils';
import { getPropertySatelliteUrl } from '@/lib/core/geospatial/geotagUtils';
import { generatePropertyModel } from '@/lib/visualization/engine/generator';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { useAuth } from '@/context/AuthContext';
import { useMultiplayer } from '@/hooks/useMultiplayer';
import SunLight from './hero/SunLight';
import TacticalStarfield from './hero/TacticalStarfield';
import { useTheme } from '@/context/ThemeProvider';
import { VIBE_DICTIONARY } from '@/constants/vibes';

/**
 *
 * Represents other players in the grid using the Durandiel Ghost Protocol.
 * Interactive on mouseover.
 */

/**
 * Represents Durandiel Ghost Protocol WIP
 * Interactive on mouseover.
 */
const GhostOrb = ({ pos, user, isLead }: { pos: any, user: string, isLead?: boolean }) => {
  const [hovered, setHovered] = useState(false);
  const orbColor = isLead ? '#fbbf24' : '#ffffff'; // Amber for lead, white for ghost

  return (
    <mesh 
      position={[pos.x, pos.y, pos.z]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <sphereGeometry args={[0.6, 32, 32]} />
      <meshStandardMaterial 
        color={orbColor} 
        emissive={orbColor}
        emissiveIntensity={hovered ? 5 : 1.5}
        transparent 
        opacity={0.4} 
      />
      
      {/* Ghost Core */}
      <mesh>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial color={orbColor} />
      </mesh>

      {hovered && (
        <Html distanceFactor={15}>
          <div className="bg-black/90 backdrop-blur-xl border border-white/20 p-3 rounded-2xl whitespace-nowrap shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${isLead ? 'bg-amber-500 animate-pulse' : 'bg-white/50'}`} />
              <div className="text-[10px] font-black uppercase text-white/40 tracking-widest">
                {isLead ? 'Lead Interceptor' : 'Ghost Protocol'}
              </div>
            </div>
            <div className="text-xs text-white font-bold tracking-tighter uppercase">{user}</div>
            <div className="h-[1px] w-full bg-white/10 my-1.5" />
            <div className="text-[8px] text-blue-400 font-mono uppercase tracking-tighter">Spatial_Sync: Locked</div>
          </div>
        </Html>
      )}
    </mesh>
  );
};

/**
 * Kinetic  Connection
 * smooth WASD movement for the Fiber camera with coordinate telemetry and collision intelligence
 */
const KineticController = ({ 
  onUpdate, 
  onBoundaryHit 
}: { 
  onUpdate: (pos: THREE.Vector3, rot: { yaw: number, pitch: number }) => void,
  onBoundaryHit: (hit: boolean) => void
}) => {
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const boundaryHitRef = useRef(false);

  useFrame((state) => {
    const keys = (window as any).pressedKeys || {};

    const boost = keys[' '] ? 2.5 : 1.0;
    const speed = 0.2 * boost;

    direction.current.set(0, 0, 0);

    if (keys['w']) direction.current.z += 1;
    if (keys['s']) direction.current.z -= 1;
    if (keys['a']) direction.current.x += 1;
    if (keys['d']) direction.current.x -= 1;

    direction.current.normalize();

    velocity.current.set(0, 0, 0);
    if (keys['w'] || keys['s']) velocity.current.z -= direction.current.z * speed;
    if (keys['a'] || keys['d']) velocity.current.x -= direction.current.x * speed;

    // Vertical Movement
    if (keys['control'] && state.camera.position.y < 30) state.camera.position.y += speed;
    if (keys['shift'] && state.camera.position.y > 1.5) state.camera.position.y -= speed;

    state.camera.translateX(velocity.current.x);
    state.camera.translateZ(velocity.current.z);

    // Collision Intelligence: Boundary Clamp
    const limit = 40;
    const prevX = state.camera.position.x;
    const prevY = state.camera.position.y;
    const prevZ = state.camera.position.z;

    state.camera.position.x = THREE.MathUtils.clamp(state.camera.position.x, -limit, limit);
    state.camera.position.z = THREE.MathUtils.clamp(state.camera.position.z, -limit, limit);
    state.camera.position.y = THREE.MathUtils.clamp(state.camera.position.y, 1.2, 35);

    const hit = state.camera.position.x !== prevX || state.camera.position.y !== prevY || state.camera.position.z !== prevZ;
    if (hit !== boundaryHitRef.current) {
      boundaryHitRef.current = hit;
      onBoundaryHit(hit);
    }

    // Send position and rotation back to parent for HUD/Multiplayer
    onUpdate(state.camera.position, { 
      yaw: state.camera.rotation.y, 
      pitch: state.camera.rotation.x 
    });
  });

  useEffect(() => {
    (window as any).pressedKeys = {};
    const down = (e: KeyboardEvent) => (window as any).pressedKeys[e.key.toLowerCase()] = true;
    const up = (e: KeyboardEvent) => (window as any).pressedKeys[e.key.toLowerCase()] = false;
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  return null;
};

/**
 * Normalization Bridge:
 * This component wraps any R3F child and applies geometric zeroing (Copyright SunsetPulse)
 * and scaling logic to ensure consistent display in the grid.
 */
const NormalizedModel = ({ children }: { children: React.ReactNode }) => {
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (groupRef.current) {
      normalizeThreeGroup(groupRef.current, 5.0);
    }
  }, [children]); // Re-normalize if content changes

  return <group ref={groupRef}>{children}</group>;
};

/**
 * PropertyDroneView:
 * Renders the detailed procedural model of the property for Drone Mode.
 */
const PropertyDroneView = ({ property }: { property: any }) => {
  const [meshes, setMeshes] = useState<THREE.Mesh[]>([]);
  
  useEffect(() => {
    const loadModel = async () => {
      const loader = new OBJLoader();
      let group;
      
      if (property.objUrl) {
        try {
          group = await new Promise((resolve, reject) => {
            loader.load(property.objUrl, resolve, undefined, reject);
          });
        } catch (e) {
          console.warn('Failed to load external OBJ, falling back to procedural', e);
          const rawObj = generatePropertyModel(property);
          group = loader.parse(rawObj);
        }
      } else {
        const rawObj = generatePropertyModel(property);
        group = loader.parse(rawObj);
      }
      
      const extractedMeshes: THREE.Mesh[] = [];
      (group as THREE.Group).traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          extractedMeshes.push(child as THREE.Mesh);
        }
      });
      setMeshes(extractedMeshes);
    };

    loadModel();
  }, [property]);

  if (meshes.length === 0) return null;

  return (
    <group>
      <Stars radius={50} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      {meshes.map((mesh, i) => (
        <mesh key={i} geometry={mesh.geometry}>
          <meshStandardMaterial 
            color="#94a3b8" 
            roughness={0.7}
            metalness={0.2}
            emissive="#3b82f6"
            emissiveIntensity={0.05}
          />
        </mesh>
      ))}
    </group>
  );
};

import ProceduralBuilding, { BuildingType } from './hero/ProceduralBuilding';

const SatelliteInterpolatedMesh = ({ property, color, customConfig }: { property: any, color: string, customConfig?: any }) => {
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
  
  // Calculate dimensions based on square footage
  // 1 unit roughly = 10ft in world space
  const sqft = property.square_feet || 2000;
  const area = sqft / 100; // normalized area
  const side = Math.sqrt(area);
  
  const dimensions = {
    width: side,
    height: (property.beds > 3 || sqft > 3000) ? 1.8 : 1.0, // Multi-story proxy
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

interface PropertyFiberViewerProps {
  property: any;
  color?: string;
  customConfig?: any;
}

export default function PropertyFiberViewer({ property, color, customConfig }: PropertyFiberViewerProps) {
  const { user } = useAuth();
  const { updateBranding, logProtocol } = useTheme();
  const userName = user?.user_metadata?.full_name || user?.email || 'Anonymous_Ghost';

  const primaryColor = color || '#ffffff';
  const [satelliteUrl, setSatelliteUrl] = useState<string | null>(null);
  const [isDroneMode, setDroneMode] = useState(false);
  const [telemetry, setTelemetry] = useState({ lat: 0, lng: 0, alt: 0 });
  const [boundaryHit, setBoundaryHit] = useState(false);
  
  // Track local drone state for multiplayer sync
  const dronePos = useRef(new THREE.Vector3(0, 8, 15));
  const droneRot = useRef({ yaw: 0, pitch: 0 });

  const { peers, sendUpdate, leadId, isMeLead } = useMultiplayer(userName, dronePos.current);

  const handleThemeRandomizer = () => {
    const keys = Object.keys(VIBE_DICTIONARY);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    const randomVibe = (VIBE_DICTIONARY as any)[randomKey];
    
    logProtocol('THEME', `Property Trigger: Shifting grid to ${randomKey}`, { theme: randomKey });
    updateBranding(randomVibe);
  };

  useEffect(() => {
    const fetchImagery = async () => {
      const url = await getPropertySatelliteUrl(property);
      setSatelliteUrl(url);
    };
    fetchImagery();
  }, [property]);

  const handleUpdate = (pos: THREE.Vector3, rot: { yaw: number, pitch: number }) => {
    // Mock coordinate mapping: Assume property is at base and 1 unit = 0.0001 degrees (~11m)
    const baseLat = property.location_geo?.coordinates?.[1] || 32.7767;
    const baseLng = property.location_geo?.coordinates?.[0] || -96.7970;
    
    setTelemetry({
      lat: baseLat + (pos.z * 0.0001),
      lng: baseLng + (pos.x * 0.0001),
      alt: pos.y * 3.28084 // Convert to feet
    });

    dronePos.current.copy(pos);
    droneRot.current = rot;

    if (isDroneMode) {
      sendUpdate(pos, rot, isMeLead);
    }
  };

  return (
    <div className={`relative w-full h-[500px] bg-slate-950 rounded-2xl overflow-hidden border border-white/10 group shadow-2xl recon-hud transition-all duration-700 ${isDroneMode ? 'ring-2 ring-blue-500/50' : ''}`}>
      
      {/* Sector Boundary Alert */}
      {boundaryHit && (
        <div className="absolute inset-0 pointer-events-none z-20 border-[10px] border-red-500/20 animate-pulse flex items-center justify-center">
           <div className="font-mono text-red-500 text-[8px] font-black uppercase tracking-[0.5em] bg-black/80 px-4 py-2 rounded-full border border-red-500/50 backdrop-blur-md">
             [ ! ] Sector_Boundary_Reached
           </div>
        </div>
      )}

      {/* Dynamic HUD */}
      <div className="absolute inset-0 pointer-events-none z-10 p-6" onPointerDown={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-2">
            <div className={`font-mono text-[10px] tracking-[0.4em] uppercase flex items-center gap-2 ${isDroneMode ? 'text-blue-400' : 'text-slate-400'}`}>
              <div className={`w-2 h-2 rounded-full animate-pulse ${isDroneMode ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,1)]' : 'bg-slate-500'}`} />
              [ {isDroneMode ? `DRONE_RECON_ACTIVE // ${property.name?.toUpperCase()}` : 'SATELLITE_INTERPOLATION_ACTIVE'} ]
            </div>
            <div className="font-mono text-[8px] text-white/20 uppercase tracking-widest">
              Origin: {property.location?.street?.slice(0, 10) || 'PROPERTY_CORE'}...
            </div>
          </div>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              setDroneMode(!isDroneMode);
            }}
            className="pointer-events-auto bg-black/60 backdrop-blur-xl border border-white/10 px-4 py-1.5 rounded-full text-[8px] font-black text-white/70 hover:text-white transition-colors tracking-tighter uppercase"
          >
            {isDroneMode ? 'Exit Drone Mode' : 'Drone Mode'}
          </button>
        </div>

        {/* Live Telemetry Overlay */}
        {isDroneMode && (
          <div className="absolute top-20 right-6 text-right font-mono space-y-1">
            <div className="text-[10px] text-blue-500 uppercase tracking-tighter">Live Telemetry</div>
            <div className="text-sm text-white font-bold">LAT: {telemetry.lat.toFixed(6)}</div>
            <div className="text-sm text-white font-bold">LNG: {telemetry.lng.toFixed(6)}</div>
            <div className="text-sm text-blue-400 font-bold">ALT: {telemetry.alt.toFixed(1)} FT</div>
          </div>
        )}
        
        <div className="absolute bottom-6 left-6 font-mono text-[9px] text-white/30 uppercase tracking-widest">
          Neural Render Engine v6.1.0 // Pulse Recon System
        </div>
        
        <div className="absolute bottom-6 right-6 font-mono text-[9px] text-white/30 uppercase tracking-widest">
          {isDroneMode ? 'NAV: WASD | SPD: SPACE | VERT: CTRL/SHIFT' : 'MODE: ORBITAL_SCAN'}
        </div>

        <div className={`recon-scan-line ${isDroneMode ? 'bg-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'opacity-20'}`} />
      </div>
      
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 8, 15]} fov={45} />
        
        <PointerLockControls enabled={isDroneMode} />
        
        <OrbitControls 
          enabled={!isDroneMode}
          enablePan={false} 
          enableZoom={true} 
          minDistance={8}
          maxDistance={25}
          minPolarAngle={Math.PI / 6} 
          maxPolarAngle={Math.PI / 2.2} 
          autoRotate={!isDroneMode} 
          autoRotateSpeed={0.8}
        />

        {isDroneMode && (
          <KineticController 
            onUpdate={handleUpdate} 
            onBoundaryHit={setBoundaryHit}
          />
        )}
        
        <SunLight preset="CYCLE" cycleSpeed={1000} />
        
        <ambientLight intensity={isDroneMode ? 0.3 : 0.4} />
        <spotLight position={[20, 30, 10]} angle={0.15} penumbra={1} intensity={0.5} color="#facc15" castShadow />
        <pointLight position={[-15, 10, -15]} intensity={0.8} color="#3b82f6" />
        <pointLight position={[15, 5, 15]} intensity={0.4} color="#f87171" />

        <Suspense fallback={null}>
          <TacticalStarfield />
          <Float speed={isDroneMode ? 2.5 : 1.2} rotationIntensity={0.5} floatIntensity={0.5}>
            <NormalizedModel>
              {isDroneMode ? (
                <PropertyDroneView property={property} />
              ) : (
                <SatelliteInterpolatedMesh property={property} color={primaryColor} customConfig={customConfig} onClick={handleThemeRandomizer} />
              )}
            </NormalizedModel>
          </Float>

          {/* Multiplayer Orbs (Ghost Protocol) */}
          {Object.entries(peers).map(([peerId, peer]: [string, any]) => (
            <GhostOrb 
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
          <Environment preset={isDroneMode ? 'night' : 'city'} />
        </Suspense>
      </Canvas>
    </div>
  );
}

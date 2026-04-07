'use client';

import React, { Suspense, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { 
  OrbitControls, 
  PerspectiveCamera, 
  Environment, 
  ContactShadows, 
  Float, 
  PointerLockControls,
  Stars
} from '@react-three/drei';
import * as THREE from 'three';
import { normalizeThreeGroup } from '@/lib/visualization/threeUtils';
import { getPropertySatelliteUrl } from '@/lib/core/geospatial/geotagUtils';
import { generatePropertyModel } from '@/lib/visualization/engine/generator';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';

/**
 * Kinetic Controller:
 * smooth WASD movement for the Fiber camera with coordinate telemetry and collision intelligence.
 */
const KineticController = ({ onUpdate }: { onUpdate: (pos: THREE.Vector3) => void }) => {
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());

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

    // Vertical Movement (with collision/ceiling)
    if (keys['control'] && state.camera.position.y < 30) state.camera.position.y += speed;
    if (keys['shift'] && state.camera.position.y > 1.5) state.camera.position.y -= speed;

    state.camera.translateX(velocity.current.x);
    state.camera.translateZ(velocity.current.z);

    // Collision Intelligence: Boundary Clamp
    const limit = 40;
    state.camera.position.x = THREE.MathUtils.clamp(state.camera.position.x, -limit, limit);
    state.camera.position.z = THREE.MathUtils.clamp(state.camera.position.z, -limit, limit);
    state.camera.position.y = THREE.MathUtils.clamp(state.camera.position.y, 1.2, 35);

    // Send position back to parent for HUD
    onUpdate(state.camera.position);
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

import ProceduralBuilding from './hero/ProceduralBuilding';

const SatelliteInterpolatedMesh = ({ property, color, customConfig }: { property: any, color: string, customConfig?: any }) => {
  // Use custom config if provided, otherwise fallback to defaults
  const buildingType = customConfig?.type || 'GABLE_HOUSE';
  const finalColor = customConfig?.color || color;
  const seed = customConfig?.seed || property._id || 0;
  
  return (
    <ProceduralBuilding 
      type={buildingType as any} 
      color={finalColor} 
      seed={seed} 
    />
  );
};

interface PropertyFiberViewerProps {
  property: any;
  color?: string;
  customConfig?: any;
}

export default function PropertyFiberViewer({ property, color, customConfig }: PropertyFiberViewerProps) {
  const primaryColor = color || '#ffffff';
  const [satelliteUrl, setSatelliteUrl] = useState<string | null>(null);
  const [isDroneMode, setDroneMode] = useState(false);
  const [telemetry, setTelemetry] = useState({ lat: 0, lng: 0, alt: 0 });

  useEffect(() => {
    const fetchImagery = async () => {
      const url = await getPropertySatelliteUrl(property);
      setSatelliteUrl(url);
    };
    fetchImagery();
  }, [property]);

  const updateTelemetry = (pos: THREE.Vector3) => {
    // Mock coordinate mapping: Assume property is at base and 1 unit = 0.0001 degrees (~11m)
    const baseLat = property.location_geo?.coordinates?.[1] || 32.7767;
    const baseLng = property.location_geo?.coordinates?.[0] || -96.7970;
    
    setTelemetry({
      lat: baseLat + (pos.z * 0.0001),
      lng: baseLng + (pos.x * 0.0001),
      alt: pos.y * 3.28084 // Convert to feet
    });
  };

  return (
    <div className={`relative w-full h-[500px] bg-slate-950 rounded-2xl overflow-hidden border border-white/10 group shadow-2xl recon-hud transition-all duration-700 ${isDroneMode ? 'ring-2 ring-blue-500/50' : ''}`}>
      
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

        {isDroneMode && <KineticController onUpdate={updateTelemetry} />}
        
        <ambientLight intensity={isDroneMode ? 0.3 : 0.4} />
        <spotLight position={[15, 20, 10]} angle={0.2} penumbra={1} intensity={2} castShadow />
        <pointLight position={[-10, 5, -10]} intensity={1} color={isDroneMode ? '#3b82f6' : primaryColor} />

        <Suspense fallback={null}>
          <Float speed={isDroneMode ? 2.5 : 1.2} rotationIntensity={0.5} floatIntensity={0.5}>
            <NormalizedModel>
              {isDroneMode ? (
                <PropertyDroneView property={property} />
              ) : (
                <SatelliteInterpolatedMesh property={property} color={primaryColor} customConfig={customConfig} />
              )}
            </NormalizedModel>
          </Float>
          
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

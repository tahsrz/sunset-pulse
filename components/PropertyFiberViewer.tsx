import React, { Suspense, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { 
  OrbitControls, 
  PerspectiveCamera, 
  Environment, 
  ContactShadows, 
  Float, 
  useTexture,
  MeshDistortMaterial,
  PointerLockControls
} from '@react-three/drei';
import * as THREE from 'three';
import { normalizeThreeGroup } from '@/utils/threeUtils';
import { getPropertySatelliteUrl } from '@/utils/geotagUtils';
import { generateAbidanModel } from '@/utils/sunset-pulse-engine/generator';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { useTheme } from '@/context/ThemeProvider';

/**
 * Kinetic Controller:
 * smooth WASD movement for the Fiber camera.
 */
const KineticController = () => {
  useFrame((state) => {
    const camera = state.camera;
    const keys = (window as any).pressedKeys || {};
    const velocity = new THREE.Vector3();
    const direction = new THREE.Vector3();
    
    const boost = keys['shift'] ? 2.5 : 1.0;
    const speed = 0.2 * boost;

    if (keys['w']) direction.z += 1;
    if (keys['s']) direction.z -= 1;
    if (keys['a']) direction.x += 1;
    if (keys['d']) direction.x -= 1;

    direction.normalize();

    if (keys['w'] || keys['s']) velocity.z -= direction.z * speed;
    if (keys['a'] || keys['d']) velocity.x -= direction.x * speed;
    
    // Vertical
    if (keys[' ']) state.camera.position.y += speed;
    if (keys['c'] || keys['control']) state.camera.position.y -= speed;

    state.camera.translateX(velocity.x);
    state.camera.translateZ(velocity.z);
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

const AbidanEntity = ({ character }: { character: any }) => {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  
  useEffect(() => {
    // We use the procedural generator to create the specific mantle geometry
    const rawObj = generateAbidanModel(character.geometryType, character.color.replace('#', ''));
    const loader = new OBJLoader();
    const group = loader.parse(rawObj);
    const mesh = group.children[0] as THREE.Mesh;
    if (mesh) setGeometry(mesh.geometry);
  }, [character]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial 
        color={character.color} 
        emissive={character.color} 
        emissiveIntensity={0.8} 
        wireframe 
      />
    </mesh>
  );
};

const SatelliteInterpolatedMesh = ({ property, primaryColor, satelliteUrl }: { property: any, primaryColor: string, satelliteUrl: string | null }) => {
  const finalUrl = satelliteUrl || property.images?.[0] || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1000&auto=format&fit=crop';
  
  const texture = useTexture(finalUrl);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);

  return (
    <mesh castShadow receiveShadow>
      <boxGeometry args={[4, 3, 4]} />
      <meshStandardMaterial 
        map={texture} 
        color={primaryColor} 
        roughness={0.4} 
        metalness={0.2} 
        bumpScale={0.1}
      />
      
      {/* Roof Detail with interpolation */}
      <mesh position={[0, 2, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[3.5, 2, 4]} />
        <meshStandardMaterial map={texture} color="#444" />
      </mesh>
    </mesh>
  );
};

const ReconHUD = () => (
  <div className="absolute inset-0 pointer-events-none z-10">
    <div className="absolute top-6 left-6 font-mono text-[10px] text-blue-400 tracking-[0.4em] uppercase flex items-center gap-2">
      <div className="w-2 h-2 bg-blue-500 animate-pulse rounded-full" />
      [ SATELLITE_INTERPOLATION_ACTIVE ]
    </div>
    <div className="absolute bottom-6 left-6 font-mono text-[9px] text-white/30 uppercase tracking-widest">
      Neural Render Engine v4.0.2
    </div>
    <div className="recon-scan-line opacity-20" />
  </div>
);

interface PropertyFiberViewerProps {
  property: any;
  color?: string;
}

export default function PropertyFiberViewer({ property, color }: PropertyFiberViewerProps) {
  const { selectedAbidan } = useTheme();
  const primaryColor = color || '#ffffff';
  const [satelliteUrl, setSatelliteUrl] = useState<string | null>(null);
  const [isAbidanMode, setAbidanMode] = useState(false);

  useEffect(() => {
    const fetchImagery = async () => {
      const url = await getPropertySatelliteUrl(property);
      setSatelliteUrl(url);
    };
    fetchImagery();
  }, [property]);

  return (
    <div className={`relative w-full h-[500px] bg-slate-950 rounded-2xl overflow-hidden border border-white/10 group shadow-2xl recon-hud transition-all duration-700 ${isAbidanMode ? 'ring-2 ring-blue-500/50' : ''}`}>
      
      {/* Dynamic HUD */}
      <div className="absolute inset-0 pointer-events-none z-10 p-6">
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-2">
            <div className={`font-mono text-[10px] tracking-[0.4em] uppercase flex items-center gap-2 ${isAbidanMode ? 'text-blue-400' : 'text-slate-400'}`}>
              <div className={`w-2 h-2 rounded-full animate-pulse ${isAbidanMode ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,1)]' : 'bg-slate-500'}`} />
              [ {isAbidanMode ? `ABIDAN_MANIFESTED // ${selectedAbidan.name.toUpperCase()}` : 'SATELLITE_INTERPOLATION_ACTIVE'} ]
            </div>
            <div className="font-mono text-[8px] text-white/20 uppercase tracking-widest">
              Origin: {property.location?.street?.slice(0, 10) || 'ABIDAN_CORE'}...
            </div>
          </div>

          <button 
            onClick={() => setAbidanMode(!isAbidanMode)}
            className="pointer-events-auto bg-black/60 backdrop-blur-xl border border-white/10 px-4 py-1.5 rounded-full text-[8px] font-black text-white/70 hover:text-white transition-colors tracking-tighter uppercase"
          >
            {isAbidanMode ? 'Return to Recon' : 'Assume Mantle'}
          </button>
        </div>
        
        <div className="absolute bottom-6 left-6 font-mono text-[9px] text-white/30 uppercase tracking-widest">
          Neural Render Engine v5.0.0 // Abidan Core
        </div>
        <div className={`recon-scan-line ${isAbidanMode ? 'bg-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'opacity-20'}`} />
      </div>
      
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 8, 15]} fov={45} />
        
        {isAbidanMode ? (
          <>
            <PointerLockControls />
            <KineticController />
          </>
        ) : (
          <OrbitControls 
            enablePan={false} 
            enableZoom={true} 
            minDistance={8}
            maxDistance={25}
            minPolarAngle={Math.PI / 6} 
            maxPolarAngle={Math.PI / 2.2} 
            autoRotate 
            autoRotateSpeed={0.8}
          />
        )}
        
        <ambientLight intensity={isAbidanMode ? 0.3 : 0.4} />
        <spotLight position={[15, 20, 10]} angle={0.2} penumbra={1} intensity={2} castShadow />
        <pointLight position={[-10, 5, -10]} intensity={1} color={isAbidanMode ? selectedAbidan.color : primaryColor} />

        <Suspense fallback={null}>
          <Float speed={isAbidanMode ? 2.5 : 1.2} rotationIntensity={0.5} floatIntensity={0.5}>
            <NormalizedModel>
              {isAbidanMode ? (
                <AbidanEntity character={selectedAbidan} />
              ) : (
                <SatelliteInterpolatedMesh property={property} primaryColor={primaryColor} satelliteUrl={satelliteUrl} />
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
          <Environment preset={isAbidanMode ? 'night' : 'city'} />
        </Suspense>
      </Canvas>
    </div>
  );
}

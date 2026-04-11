'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
export type BuildingType = 'MODERN_CUBE' | 'GABLE_HOUSE' | 'A_FRAME' | 'RV_TRAILER' | 'SKYSCRAPER_SLIM' | 'INDUSTRIAL' | 'APARTMENT';

interface ProceduralBuildingProps {
  type?: BuildingType;
  color?: string;
  seed?: string | number;
  scale?: [number, number, number];
  position?: [number, number, number];
  dimensions?: { width: number; height: number; depth: number };
  onClick?: () => void;
}

const ProceduralBuilding: React.FC<ProceduralBuildingProps> = ({ 
  type = 'GABLE_HOUSE', 
  color = '#3b82f6', 
  seed = 0,
  scale = [1, 1, 1],
  position = [0, 0, 0],
  dimensions,
  onClick
}) => {
  const [noiseTexture, setNoiseTexture] = React.useState<THREE.CanvasTexture | null>(null);
  const s = useMemo(() => (typeof seed === 'string' ? seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : seed), [seed]);

  const variations = useMemo(() => {
    return {
      width: (dimensions?.width || 1) * (1 + (Math.sin(s * 1.1) * 0.1)),
      height: (dimensions?.height || 1) * (1 + (Math.cos(s * 0.9) * 0.1)),
      depth: (dimensions?.depth || 1) * (1 + (Math.sin(s * 0.7) * 0.1)),
      roofHeight: 0.5 + (Math.abs(Math.sin(s * 1.5)) * 0.5),
      windowDensity: 0.5 + (Math.abs(Math.cos(s * 2.2)) * 0.5),
      hasBalcony: Math.sin(s * 3.1) > 0.5,
      textureRepeat: 2 + Math.floor(Math.abs(Math.sin(s)) * 4),
      rooftopClutter: Math.sin(s * 4.5) > 0,
      lawnClutter: Math.cos(s * 5.5) > 0
    };
  }, [s]);

  // Procedural Noise Texture Generator (Client-side only)
  React.useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Base color
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 256, 256);

    // Add noise
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const gray = Math.random() * 50 + 200;
      ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
      ctx.fillRect(x, y, 1, 1);
    }

    // Add some "seams" or grid
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 256, 256);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(variations.textureRepeat, variations.textureRepeat);
    setNoiseTexture(tex);
  }, [variations.textureRepeat]);

  // Rooftop Clutter (AC Units, Antennas)
  const RooftopClutter = ({ w, h, d }: { w: number, h: number, d: number }) => {
    if (!variations.rooftopClutter) return null;
    return (
      <group position={[0, h / 2, 0]}>
        <mesh position={[w * 0.2, 0.2, d * 0.2]}>
          <boxGeometry args={[0.6, 0.4, 0.6]} />
          <meshStandardMaterial color="#64748b" metalness={0.8} />
        </mesh>
        <mesh position={[-w * 0.2, 0.5, -d * 0.2]}>
          <cylinderGeometry args={[0.02, 0.02, 1]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
      </group>
    );
  };

  // Lawn Detail (Bushes, Mailboxes)
  const LawnDetail = ({ w, d }: { w: number, d: number }) => {
    if (!variations.lawnClutter) return null;
    return (
      <group position={[0, 0, d / 2 + 1]}>
        <mesh position={[w * 0.4, 0, 0]}>
          <sphereGeometry args={[0.4, 8, 8]} />
          <meshStandardMaterial color="#16a34a" />
        </mesh>
        <mesh position={[-w * 0.4, 0.3, 0.5]}>
          <boxGeometry args={[0.2, 0.6, 0.2]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
      </group>
    );
  };

  // Procedural Window Generator
  const Windows = ({ w, h, d, density }: { w: number, h: number, d: number, density: number }) => {
    const windows = [];
    const rows = Math.floor(h * 2 * density);
    const cols = Math.floor(w * 1.5 * density);
    
    if (rows < 1 || cols < 1) return null;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c - (cols - 1) / 2) * (w / cols) * 0.8;
        const y = (r - (rows - 1) / 2) * (h / rows) * 0.8;
        
        windows.push(
          <mesh key={`f-${r}-${c}`} position={[x, y, d / 2 + 0.02]}>
            <planeGeometry args={[w / cols * 0.4, h / rows * 0.5]} />
            <meshStandardMaterial 
              color="#60a5fa" 
              emissive="#3b82f6" 
              emissiveIntensity={Math.sin(s + r + c) > 0.8 ? 2 : 0.2} 
              transparent 
              opacity={0.8} 
              metalness={1}
              roughness={0}
            />
          </mesh>
        );
      }
    }
    return <group>{windows}</group>;
  };

  const renderBuilding = () => {
    switch (type) {
      case 'MODERN_CUBE':
        const mcW = 4 * variations.width;
        const mcH = 4 * variations.height;
        const mcD = 4 * variations.depth;
        return (
          <group>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[mcW, mcH, mcD]} />
              <meshStandardMaterial 
                color={color} 
                roughness={0.2} 
                metalness={0.8} 
                map={noiseTexture || undefined}
                bumpMap={noiseTexture || undefined}
                bumpScale={0.05}
              />
            </mesh>
            <Windows w={mcW} h={mcH} d={mcD} density={variations.windowDensity} />
            {variations.hasBalcony && (
              <mesh position={[0, 0, mcD / 2 + 0.3]}>
                <boxGeometry args={[mcW * 0.8, 0.1, 0.6]} />
                <meshStandardMaterial color="#1e293b" metalness={0.5} map={noiseTexture || undefined} />
              </mesh>
            )}
            <RooftopClutter w={mcW} h={mcH} d={mcD} />
            <LawnDetail w={mcW} d={mcD} />
          </group>
        );

      case 'RV_TRAILER':
        const rvW = 6 * variations.width;
        return (
          <group>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[rvW, 2.5, 2.5]} />
              <meshStandardMaterial 
                color="#f8fafc" 
                metalness={0.9} 
                roughness={0.1} 
                map={noiseTexture || undefined}
              />
            </mesh>
            <mesh position={[rvW * 0.2, 0.3, 1.26]}>
              <planeGeometry args={[1, 0.8]} />
              <meshStandardMaterial color="#1e293b" metalness={1} roughness={0} />
            </mesh>
            <mesh position={[-rvW * 0.2, 0.3, 1.26]}>
              <planeGeometry args={[1, 0.8]} />
              <meshStandardMaterial color="#1e293b" metalness={1} roughness={0} />
            </mesh>
            <mesh position={[0, -0.2, 1.26]}>
              <planeGeometry args={[rvW, 0.2]} />
              <meshStandardMaterial color={color} metalness={0.5} />
            </mesh>
            <mesh position={[-1.5, -1.2, 1]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.4, 0.4, 0.3, 16]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            <mesh position={[1.5, -1.2, 1]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.4, 0.4, 0.3, 16]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            <LawnDetail w={rvW} d={2.5} />
          </group>
        );

      case 'INDUSTRIAL':
        const indW = 8 * variations.width;
        const indH = 3 * variations.height;
        const indD = 10 * variations.depth;
        return (
          <group>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[indW, indH, indD]} />
              <meshStandardMaterial 
                color="#475569" 
                roughness={0.4} 
                metalness={0.6} 
                map={noiseTexture || undefined}
              />
            </mesh>
            {/* Loading Docks */}
            <mesh position={[indW/2 + 0.01, -indH/2 + 1, 0]}>
              <boxGeometry args={[0.2, 1.5, indD * 0.8]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
            <RooftopClutter w={indW} h={indH} d={indD} />
          </group>
        );

      case 'APARTMENT':
        const aptW = 6 * variations.width;
        const aptH = 8 * variations.height;
        const aptD = 6 * variations.depth;
        return (
          <group>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[aptW, aptH, aptD]} />
              <meshStandardMaterial 
                color={color} 
                roughness={0.5} 
                metalness={0.2} 
                map={noiseTexture || undefined}
              />
            </mesh>
            <Windows w={aptW} h={aptH} d={aptD} density={1.5} />
            <RooftopClutter w={aptW} h={aptH} d={aptD} />
          </group>
        );

      case 'SKYSCRAPER_SLIM':
        const skH = 12 * variations.height;
        return (
          <group>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[2.5, skH, 2.5]} />
              <meshStandardMaterial 
                color="#0f172a" 
                metalness={0.9} 
                roughness={0.1} 
                map={noiseTexture || undefined}
                bumpMap={noiseTexture || undefined}
                bumpScale={0.1}
              />
            </mesh>
            <Windows w={2.5} h={skH} d={2.5} density={1.2} />
            <mesh position={[0, skH/2 + 1, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 2]} />
              <meshStandardMaterial color="#64748b" />
            </mesh>
            <RooftopClutter w={2.5} h={skH} d={2.5} />
          </group>
        );

      case 'GABLE_HOUSE':
      default:
        const ghW = 4 * variations.width;
        const ghH = 3 * variations.height;
        const ghD = 4 * variations.depth;
        return (
          <group>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[ghW, ghH, ghD]} />
              <meshStandardMaterial 
                color={color} 
                roughness={0.7} 
                metalness={0.1} 
                map={noiseTexture || undefined}
                bumpMap={noiseTexture || undefined}
                bumpScale={0.02}
              />
            </mesh>
            <mesh position={[ghW * 0.2, -ghH / 2 + 0.8, ghD / 2 + 0.01]}>
              <planeGeometry args={[0.8, 1.6]} />
              <meshStandardMaterial color="#1e293b" map={noiseTexture || undefined} />
            </mesh>
            <mesh position={[-ghW * 0.2, 0.2, ghD / 2 + 0.02]}>
              <planeGeometry args={[1, 1]} />
              <meshStandardMaterial color="#60a5fa" transparent opacity={0.6} metalness={1} />
            </mesh>
            <mesh position={[0, ghH / 2 + (variations.roofHeight * 2) / 2, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
              <coneGeometry args={[ghW * 0.8, variations.roofHeight * 2.5, 4]} />
              <meshStandardMaterial color="#1e293b" flatShading roughness={0.9} map={noiseTexture || undefined} />
            </mesh>
            <LawnDetail w={ghW} d={ghD} />
          </group>
        );
    }
  };

  return (
    <group 
      position={position} 
      scale={scale} 
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'auto';
      }}
    >
      {renderBuilding()}
    </group>
  );
};

export default ProceduralBuilding;

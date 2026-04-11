'use client';

import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, Float, Stars } from '@react-three/drei';
import ProceduralBuilding, { BuildingType } from './ProceduralBuilding';
import SunLight from './SunLight';
import TacticalStarfield from './TacticalStarfield';
import { useTheme } from '@/context/ThemeProvider';
import { VIBE_DICTIONARY } from '@/constants/vibes';

const ProceduralCity = () => {
  const { updateBranding, logProtocol } = useTheme();
  const buildings = useMemo(() => {
    const types: BuildingType[] = ['GABLE_HOUSE', 'MODERN_CUBE', 'A_FRAME', 'RV_TRAILER', 'SKYSCRAPER_SLIM'];
    const b = [];
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const radius = 15 + Math.random() * 10;
      b.push({
        id: i,
        type: types[Math.floor(Math.random() * types.length)],
        position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius] as [number, number, number],
        rotation: [0, -angle, 0] as [number, number, number],
        color: ['#3b82f6', '#1e293b', '#60a5fa', '#94a3b8', '#f59e0b'][Math.floor(Math.random() * 5)],
        scale: (0.5 + Math.random() * 0.5) as any
      });
    }
    return b;
  }, []);

  const handleThemeRandomizer = () => {
    const keys = Object.keys(VIBE_DICTIONARY);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    const randomVibe = (VIBE_DICTIONARY as any)[randomKey];
    
    logProtocol('THEME', `Building Trigger: Shifting grid to ${randomKey}`, { theme: randomKey });
    updateBranding(randomVibe);
  };

  return (
    <group>
      {buildings.map((b) => (
        <ProceduralBuilding 
          key={b.id} 
          type={b.type} 
          position={b.position} 
          color={b.color} 
          seed={b.id}
          scale={[b.scale, b.scale, b.scale]}
          onClick={handleThemeRandomizer}
        />
      ))}
      {/* Centerpiece */}
      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
        <ProceduralBuilding type="MODERN_CUBE" color="#facc15" seed="center" onClick={handleThemeRandomizer} />
      </Float>
    </group>
  );
};

const Live3DScene = () => {
  return (
    <Canvas shadows dpr={[1, 2]}>
      <PerspectiveCamera makeDefault position={[20, 15, 20]} fov={45} />
      <OrbitControls 
        enablePan={false} 
        enableZoom={false} 
        autoRotate 
        autoRotateSpeed={0.3}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2.5}
      />
      
      <SunLight preset="CYCLE" cycleSpeed={1000} />
      
      {/* City Street Lights (Only active at night) */}
      <spotLight position={[20, 30, 10]} angle={0.15} penumbra={1} intensity={0.5} color="#facc15" castShadow />
      <pointLight position={[-15, 10, -15]} intensity={0.8} color="#3b82f6" />
      <pointLight position={[15, 5, 15]} intensity={0.4} color="#f87171" />
      
      
      <Suspense fallback={null}>
        <TacticalStarfield />
        <ProceduralCity />
        <ContactShadows position={[0, -2, 0]} opacity={0.4} scale={50} blur={2} far={10} />
        <Environment preset="city" />
      </Suspense>
    </Canvas>
  );
};

export default Live3DScene;

'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SunLightProps {
  preset?: 'REALTIME' | 'GOLDEN_HOUR' | 'MIDNIGHT' | 'HIGH_NOON' | 'CYCLE';
  cycleSpeed?: number; // Speed of time progression (1 = normal, 100 = fast)
}

const SunLight: React.FC<SunLightProps> = ({ preset = 'REALTIME', cycleSpeed = 500 }) => {
  const sunRef = useRef<THREE.DirectionalLight>(null);
  
  // Use a fixed initial state to avoid hydration mismatch, then sync on mount
  const [simulatedHour, setSimulatedHour] = useState(12);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSimulatedHour(new Date().getHours());
  }, []);

  // Update simulated time if in CYCLE mode
  useFrame((state) => {
    if (!mounted) return;
    
    if (preset === 'CYCLE') {
      const time = state.clock.getElapsedTime() * (cycleSpeed / 3600); // cycleSpeed is effectively seconds per day
      const currentHour = (new Date().getHours() + time) % 24;
      setSimulatedHour(currentHour);
    } else {
      setSimulatedHour(new Date().getHours());
    }
  });

  const sunSettings = useMemo(() => {
    let hour = simulatedHour;
    
    if (preset === 'GOLDEN_HOUR') hour = 18.5;
    if (preset === 'MIDNIGHT') hour = 0;
    if (preset === 'HIGH_NOON') hour = 12;

    // Calculate sun position based on hour (0-24 cycle)
    const angle = ((hour - 6) / 24) * Math.PI * 2;
    const radius = 30;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const z = Math.sin(angle * 0.5) * 10;

    // Daytime: 6 to 18
    const isDay = hour >= 6 && hour <= 18;
    
    let color = new THREE.Color('#ffffff');
    let intensity = 1.0;

    // Dynamic Coloring based on hour
    if (hour >= 5 && hour < 7) {
      const t = (hour - 5) / 2;
      color.lerpColors(new THREE.Color('#3b82f6'), new THREE.Color('#ff9e22'), t);
      intensity = 0.2 + t * 0.8;
    } else if (hour >= 7 && hour < 17) {
      color.set('#ffffff');
      intensity = 1.0;
    } else if (hour >= 17 && hour < 19) {
      const t = (hour - 17) / 2;
      color.lerpColors(new THREE.Color('#ffffff'), new THREE.Color('#f87171'), t);
      intensity = 1.0 + Math.sin(t * Math.PI) * 0.5;
    } else if (hour >= 19 && hour < 21) {
      const t = (hour - 19) / 2;
      color.lerpColors(new THREE.Color('#f87171'), new THREE.Color('#1e293b'), t);
      intensity = 1.2 - t * 1.0;
    } else {
      color.set('#1e293b');
      intensity = 0.15;
    }

    return { 
      position: [x, Math.max(y, -5), z] as [number, number, number], 
      color, 
      intensity, 
      isDay,
      hour 
    };
  }, [simulatedHour, preset]);

  useFrame((state) => {
    if (sunRef.current) {
      const shimmer = Math.sin(state.clock.elapsedTime * 0.5) * 0.02;
      sunRef.current.intensity = sunSettings.intensity + shimmer;
    }
  });

  // Safety: Don't render complex dynamic light rigs until mounted to prevent hydration errors
  if (!mounted) return <ambientLight intensity={0.5} />;

  return (
    <group>
      <directionalLight
        ref={sunRef}
        position={sunSettings.position}
        color={sunSettings.color}
        intensity={sunSettings.intensity}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      
      <ambientLight 
        intensity={sunSettings.isDay ? 0.3 : 0.05} 
        color={sunSettings.isDay ? '#ffffff' : '#1e293b'} 
      />
      
      <mesh position={sunSettings.position}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial 
          color={sunSettings.color} 
          transparent 
          opacity={sunSettings.isDay ? 1 : 0.5} 
        />
      </mesh>

      {!sunSettings.isDay && (
        <fog color="#0f172a" near={20} far={100} />
      )}
    </group>
  );
};

export default SunLight;

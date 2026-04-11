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
  const sunMeshRef = useRef<THREE.Mesh>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  
  const simulatedHourRef = useRef(12);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    simulatedHourRef.current = new Date().getHours();
  }, []);

  const getSunSettings = (hour: number) => {
    let currentHour = hour;
    if (preset === 'GOLDEN_HOUR') currentHour = 18.5;
    if (preset === 'MIDNIGHT') currentHour = 0;
    if (preset === 'HIGH_NOON') currentHour = 12;

    const angle = ((currentHour - 6) / 24) * Math.PI * 2;
    const radius = 30;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const z = Math.sin(angle * 0.5) * 10;

    const isDay = currentHour >= 6 && currentHour <= 18;
    let color = new THREE.Color('#ffffff');
    let intensity = 1.0;

    if (currentHour >= 5 && currentHour < 7) {
      const t = (currentHour - 5) / 2;
      color.lerpColors(new THREE.Color('#3b82f6'), new THREE.Color('#ff9e22'), t);
      intensity = 0.2 + t * 0.8;
    } else if (currentHour >= 7 && currentHour < 17) {
      color.set('#ffffff');
      intensity = 1.0;
    } else if (currentHour >= 17 && currentHour < 19) {
      const t = (currentHour - 17) / 2;
      color.lerpColors(new THREE.Color('#ffffff'), new THREE.Color('#f87171'), t);
      intensity = 1.0 + Math.sin(t * Math.PI) * 0.5;
    } else if (currentHour >= 19 && currentHour < 21) {
      const t = (currentHour - 19) / 2;
      color.lerpColors(new THREE.Color('#f87171'), new THREE.Color('#1e293b'), t);
      intensity = 1.2 - t * 1.0;
    } else {
      color.set('#1e293b');
      intensity = 0.15;
    }

    return { position: [x, Math.max(y, -5), z] as [number, number, number], color, intensity, isDay };
  };

  useFrame((state) => {
    if (!mounted) return;
    
    // Update time
    if (preset === 'CYCLE') {
      const timeDelta = state.clock.getDelta() * (cycleSpeed / 3600);
      simulatedHourRef.current = (simulatedHourRef.current + timeDelta) % 24;
    } else {
      simulatedHourRef.current = new Date().getHours();
    }

    const settings = getSunSettings(simulatedHourRef.current);
    
    // Update lights
    if (sunRef.current) {
      sunRef.current.position.set(...settings.position);
      sunRef.current.color.copy(settings.color);
      const shimmer = Math.sin(state.clock.elapsedTime * 0.5) * 0.02;
      sunRef.current.intensity = settings.intensity + shimmer;
    }

    if (ambientRef.current) {
      ambientRef.current.intensity = settings.isDay ? 0.3 : 0.05;
      ambientRef.current.color.copy(new THREE.Color(settings.isDay ? '#ffffff' : '#1e293b'));
    }

    if (sunMeshRef.current) {
      sunMeshRef.current.position.set(...settings.position);
      (sunMeshRef.current.material as THREE.MeshBasicMaterial).color.copy(settings.color);
      (sunMeshRef.current.material as THREE.MeshBasicMaterial).opacity = settings.isDay ? 1 : 0.5;
    }
  });

  if (!mounted) return <ambientLight intensity={0.5} />;

  return (
    <group>
      <directionalLight
        ref={sunRef}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      
      <ambientLight ref={ambientRef} />
      
      <mesh ref={sunMeshRef}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial transparent />
      </mesh>
    </group>
  );
};

export default SunLight;

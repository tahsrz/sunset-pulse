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
  const [userLocation, setUserLocation] = useState<{lat: number, lon: number} | null>(null);

  useEffect(() => {
    setMounted(true);
    
    // Attempt to get user location for more precise grounding
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => console.log("[SunLight] Location denied. Defaulting to local time sync.")
      );
    }

    const now = new Date();
    simulatedHourRef.current = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  }, []);

  const getSunSettings = (hour: number) => {
    let currentHour = hour;
    if (preset === 'GOLDEN_HOUR') currentHour = 18.3; // Deep golden hour
    if (preset === 'MIDNIGHT') currentHour = 0;
    if (preset === 'HIGH_NOON') currentHour = 12.5;

    // Mapping hour to azimuth (angle around the Y axis)
    // 6 AM = 0, 12 PM = PI/2, 6 PM = PI, 12 AM = 3PI/2
    const angle = ((currentHour - 6) / 24) * Math.PI * 2;
    const radius = 40;
    
    // Height adjustment based on time of day (sine wave)
    // Noon is highest (positive Y), Midnight is lowest (negative Y)
    const yHeight = Math.sin(((currentHour - 6) / 12) * Math.PI) * radius;
    
    // Azimuth (X and Z)
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const isDay = currentHour >= 5.5 && currentHour <= 19.5;
    let color = new THREE.Color('#ffffff');
    let intensity = 1.0;

    // Detailed Lighting Transitions (Grounding in Real-world States)
    if (currentHour >= 4.5 && currentHour < 6.5) {
      // Dawn / Early Morning
      const t = (currentHour - 4.5) / 2;
      color.lerpColors(new THREE.Color('#1e1b4b'), new THREE.Color('#fbbf24'), t);
      intensity = 0.1 + t * 0.7;
    } else if (currentHour >= 6.5 && currentHour < 16.5) {
      // Daylight
      color.set('#ffffff');
      intensity = 1.0;
    } else if (currentHour >= 16.5 && currentHour < 19.5) {
      // Golden Hour / Sunset
      const t = (currentHour - 16.5) / 3;
      if (t < 0.5) {
        // Shifting to gold
        color.lerpColors(new THREE.Color('#ffffff'), new THREE.Color('#f59e0b'), t * 2);
        intensity = 1.0 + t * 0.4;
      } else {
        // Shifting to deep orange/red
        color.lerpColors(new THREE.Color('#f59e0b'), new THREE.Color('#ef4444'), (t - 0.5) * 2);
        intensity = 1.4 - (t - 0.5) * 0.6;
      }
    } else if (currentHour >= 19.5 && currentHour < 21.5) {
      // Twilight / Dusk
      const t = (currentHour - 19.5) / 2;
      color.lerpColors(new THREE.Color('#7f1d1d'), new THREE.Color('#0f172a'), t);
      intensity = 0.8 - t * 0.7;
    } else {
      // Midnight / Night
      color.set('#1e293b'); // Dark blue night
      intensity = 0.1;
    }

    return { position: [x, yHeight, z] as [number, number, number], color, intensity, isDay };
  };

  useFrame((state) => {
    if (!mounted) return;
    
    // Update time
    if (preset === 'CYCLE') {
      const timeDelta = state.clock.getDelta() * (cycleSpeed / 3600);
      simulatedHourRef.current = (simulatedHourRef.current + timeDelta) % 24;
    } else if (preset === 'REALTIME') {
      const now = new Date();
      simulatedHourRef.current = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
    }

    const settings = getSunSettings(simulatedHourRef.current);
    
    // Update lights
    if (sunRef.current) {
      sunRef.current.position.set(...settings.position);
      sunRef.current.color.copy(settings.color);
      // Atmosphere jitter for realism
      const shimmer = Math.sin(state.clock.elapsedTime * 0.2) * 0.01;
      sunRef.current.intensity = settings.intensity + shimmer;
    }

    if (ambientRef.current) {
      // Blue ambient light at night, White/Sky blue during day
      ambientRef.current.intensity = settings.isDay ? 0.4 : 0.08;
      ambientRef.current.color.copy(new THREE.Color(settings.isDay ? '#cbd5e1' : '#1e1b4b'));
    }

    if (sunMeshRef.current) {
      sunMeshRef.current.position.set(...settings.position);
      (sunMeshRef.current.material as THREE.MeshBasicMaterial).color.copy(settings.color);
      // Hide sun below horizon
      (sunMeshRef.current.material as THREE.MeshBasicMaterial).opacity = settings.position[1] > -2 ? 1 : 0;
      sunMeshRef.current.scale.setScalar(settings.isDay ? 1 : 0.5);
    }
  });

  if (!mounted) return <ambientLight intensity={0.5} />;

  return (
    <group>
      <directionalLight
        ref={sunRef}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />
      
      <ambientLight ref={ambientRef} />
      
      <mesh ref={sunMeshRef}>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshBasicMaterial transparent />
      </mesh>
    </group>
  );
};

export default SunLight;

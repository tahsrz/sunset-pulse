'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';

/**
 * TacticalStarfield:
 * Uses multi-layered interference and sinusoidal opacity to simulate 
 * fluctuating density and "living" space.
 */
const TacticalStarfield = () => {
  const layer1Ref = useRef<THREE.Points>(null!);
  const layer2Ref = useRef<THREE.Points>(null!);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // Trick 1: Slow, independent rotation for parallax interference
    if (layer1Ref.current) {
      layer1Ref.current.rotation.y = t * 0.02;
      layer1Ref.current.rotation.x = t * 0.01;
    }
    if (layer2Ref.current) {
      layer2Ref.current.rotation.y = -t * 0.015;
      layer2Ref.current.rotation.z = t * 0.01;
    }

    // Trick 2: Sinusoidal Density (Opacity Pulsing)
    // We access the point material directly to pulse the "glow"
    if (layer1Ref.current.material) {
      const m = layer1Ref.current.material as THREE.ShaderMaterial;
      // Stars internal material uses uniforms for size/opacity in some versions
      // but we can also pulse the scale of the points
      const pulse = 0.8 + Math.sin(t * 0.5) * 0.2;
      layer1Ref.current.scale.setScalar(pulse);
    }

    if (layer2Ref.current.material) {
      const pulse = 1.0 + Math.cos(t * 0.8) * 0.3;
      layer2Ref.current.scale.setScalar(pulse);
    }
  });

  return (
    <group>
      {/* Base Layer: High density, small stars */}
      <Stars 
        ref={layer1Ref}
        radius={120} 
        depth={60} 
        count={4000} 
        factor={3} 
        saturation={0} 
        fade 
        speed={0} // We manual-animate for better control
      />
      
      {/* Interference Layer: Lower density, larger "pulsing" stars */}
      <Stars 
        ref={layer2Ref}
        radius={100} 
        depth={40} 
        count={1500} 
        factor={6} 
        saturation={0.5} 
        fade 
        speed={0} 
      />
    </group>
  );
};

export default TacticalStarfield;

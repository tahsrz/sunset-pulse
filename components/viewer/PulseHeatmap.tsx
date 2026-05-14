'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface PulseHeatmapProps {
  intensity?: number;
  color?: string;
  radius?: number;
}

const PulseHeatmap: React.FC<PulseHeatmapProps> = ({ 
  intensity = 1.0, 
  color = '#3b82f6', 
  radius = 20 
}) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  
  const shaderArgs = useMemo(() => ({
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: intensity },
      uColor: { value: new THREE.Color(color) },
      uRadius: { value: radius }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uIntensity;
      uniform vec3 uColor;
      uniform float uRadius;
      varying vec2 vUv;

      void main() {
        vec2 center = vec2(0.5, 0.5);
        float dist = distance(vUv, center);
        
        // Pulse effect
        float pulse = sin(uTime * 2.0) * 0.5 + 0.5;
        float ring = smoothstep(0.4, 0.45, dist) * (1.0 - smoothstep(0.45, 0.5, dist));
        
        // Grid lines
        vec2 grid = abs(fract(vUv * 20.0 - 0.5) - 0.5);
        float line = min(grid.x, grid.y);
        float gridAlpha = smoothstep(0.02, 0.0, line);
        
        float finalAlpha = (ring * pulse * 0.8 + gridAlpha * 0.2) * (1.0 - dist * 2.0) * uIntensity;
        
        gl_FragColor = vec4(uColor, finalAlpha);
      }
    `
  }), [intensity, color, radius]);

  useFrame((state) => {
    if (meshRef.current) {
      (meshRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.4, 0]}>
      <planeGeometry args={[radius * 2, radius * 2, 64, 64]} />
      <shaderMaterial 
        args={[shaderArgs]} 
        transparent={true} 
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};

export default PulseHeatmap;

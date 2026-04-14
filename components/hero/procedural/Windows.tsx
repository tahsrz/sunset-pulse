'use client';

import React from 'react';

interface WindowsProps {
  w: number;
  h: number;
  d: number;
  density: number;
  seed: number;
}

const Windows: React.FC<WindowsProps> = ({ w, h, d, density, seed }) => {
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
            emissiveIntensity={Math.sin(seed + r + c) > 0.8 ? 2 : 0.2} 
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

export default Windows;

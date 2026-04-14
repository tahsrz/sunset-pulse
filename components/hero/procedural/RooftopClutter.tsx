'use client';

import React from 'react';

interface RooftopClutterProps {
  w: number;
  h: number;
  d: number;
  active: boolean;
}

const RooftopClutter: React.FC<RooftopClutterProps> = ({ w, h, d, active }) => {
  if (!active) return null;
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

export default RooftopClutter;

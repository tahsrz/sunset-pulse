'use client';

import React, { useState } from 'react';
import { Html } from '@react-three/drei';

interface UserOrbProps {
  pos: { x: number; y: number; z: number };
  user: string;
  isLead?: boolean;
}

const UserOrb: React.FC<UserOrbProps> = ({ pos, user, isLead }) => {
  const [hovered, setHovered] = useState(false);
  const orbColor = isLead ? '#fbbf24' : '#ffffff'; 

  return (
    <mesh 
      position={[pos.x, pos.y, pos.z]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <sphereGeometry args={[0.6, 32, 32]} />
      <meshStandardMaterial 
        color={orbColor} 
        emissive={orbColor}
        emissiveIntensity={hovered ? 5 : 1.5}
        transparent 
        opacity={0.4} 
      />
      
      <mesh>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial color={orbColor} />
      </mesh>

      {hovered && (
        <Html distanceFactor={15}>
          <div className="bg-black/90 backdrop-blur-xl border border-white/20 p-3 rounded-2xl whitespace-nowrap shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${isLead ? 'bg-amber-500 animate-pulse' : 'bg-white/50'}`} />
              <div className="text-[10px] font-black uppercase text-white/40 tracking-widest">
                {isLead ? 'Active Guide' : 'Active User'}
              </div>
            </div>
            <div className="text-xs text-white font-bold tracking-tighter uppercase">{user}</div>
            <div className="h-[1px] w-full bg-white/10 my-1.5" />
            <div className="text-[8px] text-blue-400 font-mono uppercase tracking-tighter">Spatial_Sync: Active</div>
          </div>
        </Html>
      )}
    </mesh>
  );
};

export default UserOrb;

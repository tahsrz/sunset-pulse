'use client';

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, OrbitControls, Sparkles, Stars } from '@react-three/drei';

const BADGE_MARKS = {
  hound: '◈',
  titan: '⬡',
  ghost: '◌',
  spider: '✣',
  wolf: '◉',
  phoenix: '✦',
  fox: '⌁',
  reaper: '†',
};

const getAccent = (color) => (color === '#1e1b4b' ? '#818cf8' : color);

function Halo({ color, radius = 2.05 }) {
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh>
        <torusGeometry args={[radius, 0.025, 8, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[radius * 0.78, 0.012, 8, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

function Wings({ color, scale = 1 }) {
  return (
    <group scale={scale}>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.72, 0.55, -0.05]} rotation={[0, side * 0.25, side * 0.22]}>
          {[-0.48, -0.16, 0.16, 0.48].map((offset, index) => (
            <mesh key={offset} position={[side * offset, index * 0.13, 0]} rotation={[0, side * 0.25, side * (0.55 - index * 0.12)]}>
              <coneGeometry args={[0.14 - index * 0.015, 0.95 - index * 0.08, 6]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.22} metalness={0.3} roughness={0.6} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function HoundFigure({ color, wolf = false }) {
  return (
    <group>
      <mesh position={[0, 0.15, 0]} scale={[0.62, 0.9, 0.46]}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.18} metalness={0.35} roughness={0.58} />
      </mesh>
      <mesh position={[0, 1.18, 0.05]} scale={[0.55, 0.62, 0.5]}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} metalness={0.3} roughness={0.5} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.3, 1.72, 0.04]} rotation={[0, 0, side * 0.16]}>
          <coneGeometry args={[0.22, 0.72, 4]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} metalness={0.35} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 1.07, 0.48]} rotation={[Math.PI / 2, 0, 0]} scale={[0.4, 0.55, 0.4]}>
        <coneGeometry args={[0.35, 0.9, 12]} />
        <meshStandardMaterial color={wolf ? '#f8fafc' : color} emissive={color} emissiveIntensity={0.15} roughness={0.58} />
      </mesh>
      <mesh position={[0, 1.25, 0.52]}>
        <sphereGeometry args={[0.07, 12, 8]} />
        <meshBasicMaterial color={wolf ? '#fff7ed' : '#dbeafe'} />
      </mesh>
      {wolf && <mesh position={[0, 0.75, 0.02]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.72, 0.035, 8, 48]} /><meshBasicMaterial color={color} /></mesh>}
      <Wings color={color} scale={wolf ? 1.08 : 0.9} />
    </group>
  );
}

function TitanFigure({ color }) {
  return (
    <group>
      <mesh position={[0, 0.15, 0]} scale={[0.85, 1.15, 0.55]}>
        <cylinderGeometry args={[0.62, 0.86, 1.8, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.1} metalness={0.85} roughness={0.28} />
      </mesh>
      <mesh position={[0, 1.45, 0]}>
        <icosahedronGeometry args={[0.52, 1]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.16} metalness={0.9} roughness={0.24} />
      </mesh>
      <mesh position={[0, 0.2, 0.62]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.18]}>
        <cylinderGeometry args={[0.85, 0.85, 0.18, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.2, 0.74]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.62, 0.035, 8, 48]} />
        <meshBasicMaterial color="#fff7ed" />
      </mesh>
      <Wings color={color} scale={1.15} />
    </group>
  );
}

function GhostFigure({ color }) {
  return (
    <group>
      <mesh position={[0, 0.2, 0]} scale={[0.72, 1.25, 0.48]}>
        <coneGeometry args={[0.8, 2.2, 24]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} transparent opacity={0.34} metalness={0.15} roughness={0.18} />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.48, 24, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.65} transparent opacity={0.48} metalness={0.1} roughness={0.12} />
      </mesh>
      {[0.72, 1.04, 1.36].map((radius) => (
        <mesh key={radius} rotation={[Math.PI / 2, 0, radius]}>
          <torusGeometry args={[radius, 0.015, 8, 64]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} />
        </mesh>
      ))}
      <Wings color={color} scale={1.2} />
    </group>
  );
}

function SpiderFigure({ color }) {
  const legs = Array.from({ length: 8 }, (_, index) => {
    const angle = (index / 8) * Math.PI * 2;
    return { angle, x: Math.cos(angle) * 0.85, z: Math.sin(angle) * 0.85 };
  });

  return (
    <group>
      <mesh position={[0, 0.35, 0]} scale={[0.75, 0.75, 0.5]}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} metalness={0.45} roughness={0.4} />
      </mesh>
      {legs.map(({ angle, x, z }) => (
        <group key={angle} position={[x * 0.72, 0.35, z * 0.72]} rotation={[0, -angle, 0]}>
          <mesh scale={[1.35, 0.08, 0.08]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} metalness={0.25} roughness={0.4} />
          </mesh>
          <mesh position={[0.65, 0, 0]}>
            <sphereGeometry args={[0.1, 12, 8]} />
            <meshBasicMaterial color="#f5d0fe" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.16, 0]}>
        <octahedronGeometry args={[0.34, 1]} />
        <meshStandardMaterial color="#f5d0fe" emissive={color} emissiveIntensity={0.65} metalness={0.4} roughness={0.25} />
      </mesh>
    </group>
  );
}

function PhoenixFigure({ color, guardian = false }) {
  return (
    <group>
      <mesh position={[0, 0.25, 0]} scale={[0.62, 1.05, 0.42]}>
        <coneGeometry args={[0.72, 1.8, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45} metalness={0.35} roughness={0.42} />
      </mesh>
      <mesh position={[0, 1.42, 0]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.4, 0.8, 6]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} metalness={0.25} roughness={0.36} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.78, 0.55, 0]} rotation={[0, 0, side * 0.35]}>
          {[0, 1, 2].map((index) => (
            <mesh key={index} position={[side * index * 0.16, index * 0.18, 0]} rotation={[0, side * 0.18, side * 0.18]}>
              <coneGeometry args={[0.18, 1.15 - index * 0.12, 6]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.38} metalness={0.25} roughness={0.42} />
            </mesh>
          ))}
        </group>
      ))}
      {guardian ? (
        <mesh position={[0, 0.3, 0.62]}>
          <sphereGeometry args={[0.38, 24, 16]} />
          <meshStandardMaterial color="#86efac" emissive={color} emissiveIntensity={0.7} metalness={0.35} roughness={0.22} />
        </mesh>
      ) : (
        <mesh position={[0, 0.05, 0.2]} rotation={[0.3, 0, 0]}>
          <torusGeometry args={[0.46, 0.035, 8, 48]} />
          <meshBasicMaterial color="#fed7aa" />
        </mesh>
      )}
    </group>
  );
}

function FoxFigure({ color }) {
  return (
    <group>
      <HoundFigure color={color} />
      <group position={[0.55, 0.25, -0.2]} rotation={[0, 0, -0.65]}>
        <mesh scale={[0.28, 1.15, 0.28]}>
          <coneGeometry args={[0.6, 1.7, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45} metalness={0.25} roughness={0.4} />
        </mesh>
      </group>
      <mesh position={[0, 0.35, 0.58]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.55, 0.025, 8, 48]} />
        <meshBasicMaterial color="#ffedd5" />
      </mesh>
    </group>
  );
}

function ReaperFigure({ color }) {
  return (
    <group>
      <mesh position={[0, 0.2, 0]}>
        <coneGeometry args={[0.86, 1.9, 8]} />
        <meshStandardMaterial color="#0f172a" emissive={color} emissiveIntensity={0.32} metalness={0.55} roughness={0.32} />
      </mesh>
      <mesh position={[0, 1.38, 0]}>
        <coneGeometry args={[0.56, 0.95, 8]} />
        <meshStandardMaterial color="#020617" emissive={color} emissiveIntensity={0.4} metalness={0.4} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.2, 0.45]}>
        <sphereGeometry args={[0.09, 12, 8]} />
        <meshBasicMaterial color="#e0e7ff" />
      </mesh>
      <mesh position={[0.7, 0.55, 0.05]} rotation={[0, 0, -0.4]}>
        <cylinderGeometry args={[0.035, 0.035, 1.8, 8]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.22} />
      </mesh>
      <mesh position={[0.93, 1.35, 0.05]} rotation={[0, 0, -0.55]}>
        <torusGeometry args={[0.52, 0.045, 8, 32, Math.PI]} />
        <meshStandardMaterial color="#fda4af" emissive="#fb7185" emissiveIntensity={0.6} metalness={0.6} roughness={0.2} />
      </mesh>
      <Wings color="#1e293b" scale={1.15} />
    </group>
  );
}

function AbidanFigure({ type, color }) {
  switch (type) {
    case 'hound': return <HoundFigure color={color} />;
    case 'titan': return <TitanFigure color={color} />;
    case 'ghost': return <GhostFigure color={color} />;
    case 'spider': return <SpiderFigure color={color} />;
    case 'wolf': return <HoundFigure color={color} wolf />;
    case 'phoenix': return <PhoenixFigure color={color} />;
    case 'fox': return <FoxFigure color={color} />;
    case 'reaper': return <ReaperFigure color={color} />;
    default: return <PhoenixFigure color={color} guardian />;
  }
}

function AbidanScene({ abidan }) {
  const figureRef = useRef(null);
  const accent = getAccent(abidan.color);

  useFrame(({ clock }) => {
    if (!figureRef.current) return;
    figureRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.35) * 0.18;
  });

  return (
    <>
      <color attach="background" args={['#020617']} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 5, 4]} intensity={1.5} color="#f8fafc" />
      <pointLight position={[-3, 1, 3]} intensity={4} distance={8} color={accent} />
      <Stars radius={12} depth={8} count={70} factor={2} saturation={0} fade speed={0.35} />
      <Sparkles count={28} scale={[5, 4, 4]} size={1.5} speed={0.25} color={accent} />
      <Float speed={1.4} rotationIntensity={0.15} floatIntensity={0.35}>
        <group ref={figureRef} position={[0, -0.55, 0]}>
          <Halo color={accent} />
          <AbidanFigure type={abidan.geometryType} color={accent} />
        </group>
      </Float>
      <OrbitControls enablePan={false} minDistance={3.3} maxDistance={6.5} autoRotate autoRotateSpeed={0.65} />
    </>
  );
}

export function AbidanGeometryBadge({ abidan, size = 'md' }) {
  const sizeClass = size === 'sm' ? 'h-12 w-12 text-lg' : 'h-20 w-20 text-3xl';
  const color = getAccent(abidan.color);

  return (
    <div
      className={`relative shrink-0 rounded-full border-2 bg-slate-950/90 ${sizeClass}`}
      aria-label={`${abidan.name} 3D ${abidan.geometryType} model`}
      role="img"
      style={{ borderColor: color, boxShadow: `0 0 22px ${color}66` }}
    >
      <div className="absolute inset-1 flex items-center justify-center rounded-full border border-dashed border-white/30 text-white/90">
        {BADGE_MARKS[abidan.geometryType] || '✦'}
      </div>
      <span className="absolute -right-0.5 top-0 h-2 w-2 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }} />
    </div>
  );
}

export default function AbidanModelViewer({ abidan, className = '' }) {
  const color = getAccent(abidan.color);

  return (
    <div
      className={`relative h-40 w-40 shrink-0 overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl ${className}`}
      role="img"
      aria-label={`${abidan.name} interactive 3D angelic model`}
      style={{ boxShadow: `0 0 32px ${color}44` }}
    >
      <Canvas camera={{ position: [0, 0.7, 4.8], fov: 38 }} dpr={[1, 1.5]}>
        <AbidanScene abidan={abidan} />
      </Canvas>
      <div className="pointer-events-none absolute bottom-2 left-2 rounded-full border border-white/10 bg-black/50 px-2 py-1 text-[8px] font-mono uppercase tracking-[0.2em] text-slate-300">
        3D model
      </div>
    </div>
  );
}

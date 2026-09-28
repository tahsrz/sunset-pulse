'use client';

import { Canvas } from '@react-three/fiber';
import { Grid, OrbitControls, Sparkles } from '@react-three/drei';

export default function PropertyScanPreview({ roomCount }: { roomCount: number }) {
  return (
    <div className="relative h-[520px] overflow-hidden rounded-3xl border border-teal-200/20 bg-slate-950 shadow-2xl">
      <Canvas camera={{ position: [8, 6, 10], fov: 42 }} dpr={[1, 1.5]}>
        <color attach="background" args={['#020617']} />
        <ambientLight intensity={0.65} />
        <directionalLight position={[4, 8, 5]} intensity={1.8} color="#e0f2fe" />
        <pointLight position={[-4, 3, 2]} intensity={5} distance={14} color="#5eead4" />
        <Grid args={[24, 24]} cellSize={0.5} cellThickness={0.45} cellColor="#155e75" sectionSize={3} sectionThickness={0.8} sectionColor="#0f766e" fadeDistance={24} infiniteGrid />
        <Sparkles count={70} scale={[12, 6, 12]} size={1.4} speed={0.2} color="#99f6e4" />
        {Array.from({ length: Math.max(1, Math.min(roomCount, 12)) }, (_, index) => <RoomShell key={index} index={index} />)}
        <OrbitControls enablePan={false} minDistance={5} maxDistance={20} target={[0, 0, 0]} />
      </Canvas>
      <div className="pointer-events-none absolute left-5 top-5 rounded-full border border-teal-200/30 bg-slate-950/70 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-teal-100 backdrop-blur">3D preview active</div>
      <div className="pointer-events-none absolute bottom-5 left-5 max-w-sm text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Manifest preview // room shell // not professionally measured</div>
    </div>
  );
}

function RoomShell({ index }: { index: number }) {
  const width = 2.8;
  const depth = 2.3;
  const gap = 0.55;
  const columns = 4;
  const x = (index % columns) * (width + gap) - ((Math.min(columns, 12) - 1) * (width + gap)) / 2;
  const z = Math.floor(index / columns) * (depth + gap) - 1.5;
  const color = index % 3 === 0 ? '#2dd4bf' : index % 3 === 1 ? '#38bdf8' : '#a78bfa';
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, -0.85, 0]}>
        <boxGeometry args={[width, 0.1, depth]} />
        <meshStandardMaterial color="#0f172a" emissive={color} emissiveIntensity={0.12} metalness={0.45} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.2, -depth / 2]}>
        <boxGeometry args={[width, 2, 0.08]} />
        <meshStandardMaterial color={color} transparent opacity={0.48} emissive={color} emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[-width / 2, 0.2, 0]}>
        <boxGeometry args={[0.08, 2, depth]} />
        <meshStandardMaterial color={color} transparent opacity={0.32} emissive={color} emissiveIntensity={0.22} />
      </mesh>
      <mesh position={[width / 2, 0.2, 0]}>
        <boxGeometry args={[0.08, 2, depth]} />
        <meshStandardMaterial color={color} transparent opacity={0.32} emissive={color} emissiveIntensity={0.22} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <sphereGeometry args={[0.16, 16, 12]} />
        <meshBasicMaterial color="#f8fafc" />
      </mesh>
    </group>
  );
}


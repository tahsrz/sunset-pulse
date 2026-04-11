'use client';

import React, { Suspense, useMemo } from 'react';
import { useParams, notFound } from 'next/navigation';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';
import { TacticalBriefingEngine } from '@/components/BriefingEngine';
import TacticalStarfield from '@/components/hero/TacticalStarfield';
import SunLight from '@/components/hero/SunLight';
import { BRIEFING_REGISTRY } from '@/constants/briefings';
import Spinner from '@/components/Spinner';

const BriefingPage = () => {
  const params = useParams();
  const slug = params.slug as string;

  // Retrieve slide data from registry
  const slides = useMemo(() => {
    return BRIEFING_REGISTRY[slug as keyof typeof BRIEFING_REGISTRY];
  }, [slug]);

  if (!slides) {
    return notFound();
  }

  return (
    <main className="h-screen w-full bg-slate-950 relative overflow-hidden">
      {/* Background UI */}
      <div className="absolute top-8 left-8 z-10 pointer-events-none">
        <h1 className="text-2xl font-black italic tracking-tighter text-white/80 uppercase">
          System_Briefing // {slug.toUpperCase()}
        </h1>
        <p className="text-[10px] font-mono text-blue-500 uppercase tracking-[0.3em] mt-1">
          Spatial Presentation Engine v1.0.4
        </p>
      </div>

      {/* System Description Overlay */}
      <div className="absolute top-8 right-8 z-10 w-80 pointer-events-none">
        <div className="bg-black/40 backdrop-blur-2xl border border-white/10 p-6 rounded-[2rem] shadow-2xl pointer-events-auto transition-all hover:bg-black/60 group">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <h2 className="text-[10px] font-black uppercase tracking-widest text-white/60 group-hover:text-blue-400 transition-colors">
              Engine_Specification
            </h2>
          </div>
          <div className="space-y-4">
            <section>
              <h3 className="text-[9px] font-bold text-white uppercase mb-1 tracking-wider">Spatial Architecture</h3>
              <p className="text-[11px] leading-relaxed text-white/40 font-medium">
                Decouples presentation content from the core rendering logic using a centralized registry. Slides are projected as interactive 3D panels within a volumetric grid environment.
              </p>
            </section>
            <section>
              <h3 className="text-[9px] font-bold text-white uppercase mb-1 tracking-wider">Rendering Pipeline</h3>
              <p className="text-[11px] leading-relaxed text-white/40 font-medium">
                Utilizes Signed Distance Field (SDF) text for resolution-independent clarity. Real-time lighting is managed through a synchronized sunlight cycle and a high-performance, multi-layered starfield.
              </p>
            </section>
            <section>
              <h3 className="text-[9px] font-bold text-white uppercase mb-1 tracking-wider">Navigational Logic</h3>
              <p className="text-[11px] leading-relaxed text-white/40 font-medium">
                Supports linear sequential paths, autonomous flight protocols, and manual discovery. Camera transitions are managed via high-precision interpolation for a smooth, cinematic experience.
              </p>
            </section>
          </div>
          <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center opacity-40">
            <span className="text-[8px] font-mono uppercase tracking-tighter text-blue-400">Core_Engine: Active</span>
            <span className="text-[8px] font-mono uppercase tracking-tighter text-white">Status: Nominal</span>
          </div>
        </div>
      </div>

      {/* 3D Viewport */}
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 5, 20]} fov={45} />
        
        <SunLight preset="CYCLE" cycleSpeed={2000} />
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#3b82f6" />
        
        <Suspense fallback={null}>
          <TacticalStarfield />
          
          <TacticalBriefingEngine slides={slides} />
          
          <ContactShadows 
            position={[0, -5, 0]} 
            opacity={0.4} 
            scale={50} 
            blur={2} 
            far={10} 
          />
          <Environment preset="city" />
        </Suspense>
      </Canvas>

      {/* Footer Branding */}
      <div className="absolute bottom-8 left-8 z-10 pointer-events-none font-mono text-[8px] text-white/20 uppercase tracking-widest">
        Property Pulse // Infrastructure Intelligence
      </div>
    </main>
  );
};

export default BriefingPage;

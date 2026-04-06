'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeProvider';
import { Search, MapPin, ChevronRight, Sparkles, Play } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, Float } from '@react-three/drei';

const Live3DScene = () => {
  return (
    <Canvas shadows dpr={[1, 2]}>
      <PerspectiveCamera makeDefault position={[0, 5, 12]} fov={45} />
      <OrbitControls 
        enablePan={false} 
        enableZoom={false} 
        autoRotate 
        autoRotateSpeed={0.5}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 2}
      />
      <ambientLight intensity={0.5} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />
      
      <Suspense fallback={null}>
        <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[4, 3, 4]} />
            <meshStandardMaterial color="#3b82f6" roughness={0.3} metalness={0.8} />
            <mesh position={[0, 2, 0]} rotation={[0, Math.PI / 4, 0]}>
              <coneGeometry args={[3.5, 2, 4]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
          </mesh>
        </Float>
        <ContactShadows position={[0, -2, 0]} opacity={0.4} scale={20} blur={2} far={4.5} />
        <Environment preset="city" />
      </Suspense>
    </Canvas>
  );
};

const CinematicHero = () => {
  const { isAdvancedMode } = useTheme();
  const [isEntered, setIsEntered] = useState(false);
  const [query, setQuery] = useState('');

  return (
    <div className="relative h-screen w-full overflow-hidden bg-slate-950">
      
      {/* LAYER 1: Bottom Layer - Live 3D Scene */}
      <div className="absolute inset-0 z-0">
        <Live3DScene />
      </div>

      {/* LAYER 2: Middle Layer - Hero Video/Image Cinematic Loop */}
      <div 
        className={`absolute inset-0 z-10 transition-all duration-[2000ms] ease-in-out ${
          isEntered ? 'opacity-0 scale-110 pointer-events-none' : 'opacity-100 scale-100'
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/20 to-slate-950 z-20" />
        <div 
          className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600585154340-be6191da95b4?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center"
        />
        <div className="absolute inset-0 z-20 opacity-20" 
             style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      </div>

      {/* LAYER 3: Top Layer - Simple Overlay UI */}
      <div 
        className={`absolute inset-0 z-30 flex flex-col items-center justify-center px-6 transition-all duration-[1500ms] ease-in-out ${
          isEntered ? 'opacity-0 pointer-events-none backdrop-blur-none' : 'opacity-100 backdrop-blur-[20px]'
        }`}
      >
        <div className="relative z-40 w-full max-w-4xl flex flex-col items-center text-center">
          
          {/* Text Container with Centered Ripples */}
          <div className="relative mb-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Ripples originating from text */}
            {!isEntered && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[-1]">
                <div className="absolute h-32 w-32 rounded-full border border-primary/30 animate-pulse-expand" />
                <div className="absolute h-32 w-32 rounded-full border border-primary/30 animate-pulse-expand [animation-delay:2s]" />
              </div>
            )}
            
            <h1 className="text-6xl md:text-8xl font-bold tracking-tight text-white mb-6">
              Sunset <span className="text-primary italic">Pulse</span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-300 max-w-2xl mx-auto font-light tracking-wide">
              The premium intelligence layer for North Texas real estate.
            </p>
          </div>

          <button 
            onClick={() => setIsEntered(true)}
            className="group relative flex items-center gap-4 px-10 py-5 bg-white text-slate-950 rounded-full font-bold text-xl transition-all hover:scale-105 hover:bg-primary hover:text-white shadow-[0_0_50px_rgba(255,255,255,0.2)]"
          >
            <Play size={24} className="fill-current" />
            <span>Start My Tour</span>
            <div className="absolute -inset-1 rounded-full bg-white/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          <div className="mt-8 text-slate-400 font-mono text-xs uppercase tracking-[0.5em] animate-pulse">
            [ System Ready // Engine Warm ]
          </div>
        </div>
      </div>

      {/* POST-ENTER UI: Appears after "Start" is clicked */}
      <div 
        className={`absolute inset-0 z-40 flex flex-col items-center justify-end pb-20 px-6 pointer-events-none transition-all duration-1000 delay-1000 ${
          isEntered ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="w-full max-w-2xl bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-2 flex items-center pointer-events-auto shadow-2xl animate-in slide-in-from-bottom-12 duration-1000">
          <div className="pl-4 pr-2 text-white/50">
            <MapPin size={24} />
          </div>
          <input 
            type="text"
            placeholder="Enter address, city, or zip code..."
            className="flex-grow py-4 px-2 text-lg text-white bg-transparent focus:outline-none placeholder:text-white/30"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="bg-primary text-white p-4 rounded-xl hover:bg-primary/80 transition-colors flex items-center gap-2 group">
            <Search size={20} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>

        <div className="mt-8 flex gap-4 pointer-events-auto">
           <Link href="/properties" className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-full text-white hover:bg-white/10 transition-all text-sm font-medium">
            Browse Listings
          </Link>
          {isAdvancedMode && (
            <Link href="/command-post" className="flex items-center gap-2 px-6 py-3 bg-primary/20 border border-primary/30 rounded-full text-primary hover:bg-primary/30 transition-all text-sm font-medium">
              <Sparkles size={16} />
              Command Post
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default CinematicHero;

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { 
  FaChevronLeft, 
  FaChevronRight, 
  FaDatabase, 
  FaLock, 
  FaMapLocationDot, 
  FaBolt, 
  FaChessRook, 
  FaCode, 
  FaMaximize, 
  FaArrowTrendUp,
  FaCircleCheck,
  FaHourglass,
  FaCompass,
  FaArrowUpRightFromSquare,
  FaTowerCell,
  FaGaugeHigh,
  FaShieldHalved
} from 'react-icons/fa6';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

export default function PitchDeck() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [activePipelineStep, setActivePipelineStep] = useState(0);
  const [activeMilestone, setActiveMilestone] = useState(0);
  const [activeFounderPillar, setActiveFounderPillar] = useState<'re' | 'se'>('re');

  // Trigger hydration flag for safe Three.js rendering
  useEffect(() => {
    setMounted(true);
    
    // Bind Arrow Keys for slide navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        prevSlide();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide]);

  const totalSlides = 4;

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  // Pipeline database schemas for Slide 2
  const pipelineSchema = [
    {
      title: 'NTREIS MLS BULK SYNC',
      description: 'Daily synchronization pipelines extracting raw properties, listing parameters, and media assets.',
      technical: 'RESO Web API V2 OAuth Standard',
      details: [
        'Stream Rate: ~400 properties / minute',
        'Payload Format: RESO standard JSON-LD schema',
        'Storage: S3 Raw JSON Buckets',
        'Retention Policy: 90 days active rollover log'
      ]
    },
    {
      title: 'SUPABASE SANITATION CONSTRAINTS',
      description: 'Automated database purification checking lead records and handling duplicate entries.',
      technical: 'Supabase PostgreSQL transactional triggers',
      details: [
        'Constraint Match: onConflict: email upsert triggers',
        'Purifier Logic: Case-insensitive character parsing',
        'State Presets: America/Chicago local timezone normalization',
        'Rollback Safety: Atomic transactional schemas'
      ]
    },
    {
      title: '3D GEOGRAPHICAL SYNTHESIS',
      description: 'Resolves raw address listings into absolute spatial coordinates mapped against localized terrain meshes.',
      technical: 'Mapbox Search API + 3D Coordinates Vectorization',
      details: [
        'Precision Latitude/Longitude geo-fencing lookup',
        'Elevation mapping using high-res DEM wireframes',
        'Response Speed: < 15ms vector computation',
        'Web Sockets payload broadcasting'
      ]
    }
  ];

  // Detailed Milestone Logs for Slide 3
  const milestoneLogs = [
    {
      title: 'Spatial Search Engine',
      milestones: [
        'Prisma scheduling structures synchronization.',
        'High-density 3D coordinate mapping layout.',
        'Responsive drag-and-drop staff calendar center.'
      ]
    },
    {
      title: 'IDX Data Aggregation',
      milestones: [
        'Raw NTREIS MLS schema normalization.',
        'Supabase Lead unique constraint conflict bounds.',
        'Automated lead re-engagement hook API.'
      ]
    },
    {
      title: 'Mobile Roster Engine',
      milestones: [
        'Touch-interactive tap-to-select mobile layouts.',
        'Horizontal weekday single-day sliding header.',
        'Active twilio SMS client-side notification streams.'
      ]
    },
    {
      title: 'Multi-State Deployment',
      milestones: [
        'Brokerage-certified real estate integration.',
        'Dockerized high-availability node clusters.',
        'Predictive machine-learning regional analytics.'
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 w-screen h-screen overflow-hidden text-white flex flex-col justify-between p-10 font-sans selection:bg-orange-500 selection:text-white">
      {/* Dynamic Solar Background Glow */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-gradient-to-br from-orange-500/10 via-pink-500/5 to-purple-600/0 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-gradient-to-tr from-purple-500/10 via-pink-500/5 to-orange-600/0 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Universal HUD Bar */}
      <div className="flex justify-between items-center z-50 border-b border-white/5 pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full animate-pulse shadow-[0_0_8px_#f97316]" />
          <div>
            <span className="text-[10px] font-mono font-black text-orange-500 uppercase tracking-widest">Sunset Pulse // Executive Presentation</span>
            <h2 className="text-xs font-black italic uppercase text-slate-400 tracking-wider">Phase 3: Spatial Real Estate Advantage</h2>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-slate-900/60 border border-white/5 px-3 py-1.5 rounded-lg text-[9px] font-mono">
            <span className="text-slate-500">SYSTEM TIME:</span>
            <span className="text-slate-300">2026-05-24 05:26 CST</span>
          </div>
          <button 
            onClick={() => window.location.href = '/admin/scheduling'}
            className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white border border-white/10 hover:border-orange-500/30 px-3 py-1.5 rounded-lg bg-black/40 transition-all hover:shadow-[0_0_12px_rgba(249,115,22,0.1)]"
          >
            ← Back to Roster
          </button>
        </div>
      </div>

      {/* Slide Container Area */}
      <div className="flex-grow flex items-center justify-center my-6 relative z-10 overflow-hidden">
        
        {/* ========================================================================= */}
        {/* SLIDE 1: THE "PULSE" VIEW */}
        {/* ========================================================================= */}
        {currentSlide === 0 && (
          <div className="w-full h-full flex flex-col justify-between animate-in fade-in zoom-in-95 duration-500 relative">
            <div className="absolute inset-0 z-0">
              {mounted ? (
                <Suspense fallback={
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-slate-950/20 rounded-3xl border border-white/5">
                    <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest animate-pulse">Initializing WebGL Engine...</span>
                  </div>
                }>
                  <Canvas camera={{ position: [14, 10, 14], fov: 42 }}>
                    <ambientLight intensity={0.4} />
                    <pointLight position={[10, 10, 10]} intensity={1.5} color="#f97316" />
                    <directionalLight position={[-10, 10, -10]} intensity={0.5} color="#8b5cf6" />
                    
                    {/* Rotating grid coordinates terrain */}
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
                      <planeGeometry args={[60, 60, 30, 30]} />
                      <meshStandardMaterial wireframe color="#1e293b" opacity={0.2} transparent />
                    </mesh>

                    {/* Central 3D Mesh Wireframe */}
                    <group>
                      <mesh position={[0, 1.5, 0]}>
                        <boxGeometry args={[4.2, 5, 4.2]} />
                        <meshStandardMaterial wireframe color="#f97316" roughness={0.1} metalness={0.9} />
                      </mesh>
                      <mesh position={[0, 4.2, 0]} rotation={[0, Math.PI / 4, 0]}>
                        <coneGeometry args={[3.6, 2.5, 4]} />
                        <meshStandardMaterial wireframe color="#ec4899" />
                      </mesh>
                    </group>
                    <OrbitControls autoRotate autoRotateSpeed={0.8} maxPolarAngle={Math.PI / 2.2} />
                  </Canvas>
                </Suspense>
              ) : (
                <div className="w-full h-full bg-slate-950/40 rounded-3xl" />
              )}
            </div>

            {/* Symmetrical Floating Overlays */}
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between">
              
              {/* Header Details */}
              <div className="flex justify-between items-start pointer-events-auto">
                <div className="bg-slate-900/60 border border-white/5 p-6 rounded-2xl backdrop-blur-md">
                  <span className="text-[9px] font-mono font-black text-orange-500 uppercase tracking-widest">Interactive Showcase // SLIDE 01</span>
                  <h1 className="text-3xl font-black italic uppercase text-white mt-1 tracking-tighter">The "Pulse" View</h1>
                  <p className="text-[10px] text-slate-400 mt-2 max-w-sm leading-relaxed">
                    A panoramic 3D spatial search dashboard representing luxury real estate assets inside high-resolution vector simulation meshes.
                  </p>
                </div>

                <div className="bg-slate-900/60 border border-white/5 px-4 py-3 rounded-xl backdrop-blur-md text-right font-mono">
                  <div className="text-[9px] font-black uppercase text-orange-400">TELEMETRY PRESET</div>
                  <div className="text-[9px] text-slate-400 mt-1">LAT: 32.7767° N // LON: -96.7970° W</div>
                  <div className="text-[8px] text-slate-600 mt-0.5">Alt: 104m MSL (Dallas County)</div>
                </div>
              </div>

              {/* Bottom Interactive Renders */}
              <div className="flex justify-between items-end pointer-events-auto">
                
                {/* Active Property Telemetry */}
                <div className="bg-slate-900/80 border border-white/5 hover:border-orange-500/20 p-5 rounded-2xl backdrop-blur-md w-[360px] transition-all group">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[8px] font-black uppercase text-orange-400 tracking-wider bg-orange-500/10 px-2.5 py-0.5 rounded-full">ACTIVE IDX SELECTION</span>
                    <span className="text-[9px] font-mono text-slate-500">MLS #102941</span>
                  </div>
                  <h3 className="text-md font-black italic text-white uppercase tracking-tight">4812 Lakeside Drive</h3>
                  <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-white/5">
                    <div>
                      <div className="text-[8px] uppercase text-slate-500 font-black">RESO Listing Cost</div>
                      <div className="text-sm font-black text-slate-200 mt-0.5">$4,250,000</div>
                    </div>
                    <div>
                      <div className="text-[8px] uppercase text-slate-500 font-black">Terrain Footprint</div>
                      <div className="text-sm font-black text-slate-200 mt-0.5">8,450 Sq Ft</div>
                    </div>
                  </div>
                </div>

                {/* Orbit Presets Controller */}
                <div className="bg-slate-900/60 border border-white/5 p-4 rounded-xl backdrop-blur-md flex items-center gap-2">
                  <FaMaximize className="text-orange-500 animate-pulse text-xs mr-1" />
                  {['3D Orbit', 'Terrain Mesh', 'Hydration Sync'].map((opt, i) => (
                    <span 
                      key={opt}
                      className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest font-mono ${
                        i === 0 
                          ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg' 
                          : 'bg-black/40 text-slate-400 border border-white/5'
                      }`}
                    >
                      {opt}
                    </span>
                  ))}
                </div>

              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SLIDE 2: MARKET INTEGRATION */}
        {/* ========================================================================= */}
        {currentSlide === 1 && (
          <div className="w-full h-full flex flex-col justify-between animate-in fade-in zoom-in-95 duration-500">
            <div>
              <span className="text-[9px] font-mono font-black text-orange-500 uppercase tracking-widest">Compliance Pipeline // SLIDE 02</span>
              <h1 className="text-3xl font-black italic uppercase text-white mt-1 tracking-tighter">Market Integration</h1>
              <p className="text-[10px] text-slate-400 mt-1 max-w-xl">
                Real-time NTREIS/MLS data pipeline. Unifies unpurified multi-region property streams, resolving coordinate overlaps, and executing high-availability lead synchronizations.
              </p>
            </div>

            {/* Pipeline Step Interactive Nodes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-auto">
              {pipelineSchema.map((step, idx) => (
                <button 
                  key={step.title}
                  onClick={() => setActivePipelineStep(idx)}
                  className={`text-left p-6 rounded-2xl flex flex-col justify-between backdrop-blur-md relative overflow-hidden transition-all duration-300 ${
                    activePipelineStep === idx 
                      ? 'bg-slate-900/60 border-orange-500/40 shadow-[0_0_15px_rgba(249,115,22,0.1)]' 
                      : 'bg-slate-900/20 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
                        activePipelineStep === idx 
                          ? 'bg-orange-500/10 border-orange-500/30' 
                          : 'bg-slate-950 border-white/10'
                      }`}>
                        {idx === 0 && <FaDatabase className={activePipelineStep === idx ? 'text-orange-500' : 'text-slate-400'} />}
                        {idx === 1 && <FaLock className={activePipelineStep === idx ? 'text-pink-500' : 'text-slate-400'} />}
                        {idx === 2 && <FaMapLocationDot className={activePipelineStep === idx ? 'text-purple-500' : 'text-slate-400'} />}
                      </div>
                      <span className="font-mono text-[9px] text-slate-500 font-extrabold">PHASE 0{idx + 1}</span>
                    </div>

                    <div>
                      <h3 className="text-sm font-black italic text-white uppercase tracking-tight">{step.title}</h3>
                      <p className="text-[10px] text-slate-400 leading-relaxed mt-1.5">{step.description}</p>
                    </div>
                  </div>

                  <div className="mt-6 pt-3 border-t border-white/5 flex justify-between items-center w-full">
                    <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Protocol API</span>
                    <span className="font-mono text-[8px] font-extrabold text-orange-400 uppercase tracking-widest">{idx === 0 ? 'RESO API' : idx === 1 ? 'Prisma Sync' : 'Cartesian'}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Live Interactive Diagnostics Terminal */}
            <div className="bg-black/50 border border-white/5 p-5 rounded-2xl backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FaBolt className="text-orange-500 animate-pulse text-[10px]" />
                  <span className="text-[9px] font-mono font-black uppercase tracking-widest text-orange-400">Pipeline Uplink Diagnostics</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  <span className="text-slate-500">Active Node:</span> {pipelineSchema[activePipelineStep].title} — <span className="text-slate-500">Method:</span> {pipelineSchema[activePipelineStep].technical}
                </p>
              </div>

              {/* Step Specifications logs */}
              <div className="flex flex-wrap gap-3">
                {pipelineSchema[activePipelineStep].details.map((detail, idx) => (
                  <span 
                    key={idx}
                    className="font-mono text-[8px] font-extrabold bg-slate-950 border border-white/10 px-2.5 py-1 rounded-md text-slate-300 uppercase tracking-wide flex items-center gap-1.5"
                  >
                    <span className="w-1 h-1 rounded-full bg-orange-500" />
                    {detail}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SLIDE 3: THE ROADMAP */}
        {/* ========================================================================= */}
        {currentSlide === 2 && (
          <div className="w-full h-full flex flex-col justify-between animate-in fade-in zoom-in-95 duration-500">
            <div>
              <span className="text-[9px] font-mono font-black text-orange-500 uppercase tracking-widest">Future Escalation // SLIDE 03</span>
              <h1 className="text-3xl font-black italic uppercase text-white mt-1 tracking-tighter">The Roadmap</h1>
              <p className="text-[10px] text-slate-400 mt-1 max-w-xl">
                Horizontal product delivery timeline tracking our transition from regional spatial IDX platforms to nation-wide enterprise brokerage scheduling operations.
              </p>
            </div>

            {/* Horizontal timeline cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 my-auto relative">
              
              {/* Central connection track line */}
              <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/5 -translate-y-1/2 pointer-events-none hidden md:block" />

              {milestoneLogs.map((m, idx) => (
                <button 
                  key={m.title}
                  onClick={() => setActiveMilestone(idx)}
                  className={`text-left p-5 rounded-2xl flex flex-col gap-4 backdrop-blur-md relative transition-all duration-300 ${
                    activeMilestone === idx 
                      ? 'bg-slate-900/60 border-orange-500/40 shadow-[0_0_15px_rgba(249,115,22,0.1)]' 
                      : 'bg-slate-900/10 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[10px] font-black text-white">Q{idx + 1} 2026</span>
                    <span className="flex items-center gap-1.5 text-[8px] font-black uppercase text-slate-400 tracking-wider bg-slate-950 border border-white/10 px-2 py-0.5 rounded-full">
                      {idx === 0 && <FaCircleCheck className="text-orange-500 text-[8px]" />}
                      {idx === 1 && <FaHourglass className="text-pink-500 text-[8px] animate-spin" />}
                      {idx === 2 && <FaCompass className="text-purple-500 text-[8px] animate-pulse" />}
                      {idx === 3 && <FaArrowUpRightFromSquare className="text-slate-600 text-[8px]" />}
                      {idx === 0 ? 'Active' : idx === 1 ? 'In Sprints' : idx === 2 ? 'Planned' : 'Scale'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-black italic text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 uppercase tracking-tight">{m.title}</h3>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[8px] font-black uppercase text-slate-500 tracking-wider">
                    <span>Task Units</span>
                    <span className="font-mono text-orange-400 font-extrabold">{m.milestones.length} Sprints</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Interactive Timeline Detail Box */}
            <div className="bg-slate-900/40 border border-white/5 p-6 rounded-2xl backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
              <div className="space-y-1">
                <span className="text-[8px] font-mono font-black uppercase text-orange-500 tracking-widest">Active Roadmap Milestone Breakdown</span>
                <h3 className="text-md font-black italic text-white uppercase tracking-tight">{milestoneLogs[activeMilestone].title} Overview</h3>
              </div>

              <div className="flex flex-col md:flex-row gap-4 flex-grow max-w-2xl justify-end">
                {milestoneLogs[activeMilestone].milestones.map((point, idx) => (
                  <div 
                    key={idx}
                    className="p-3.5 rounded-xl bg-black/40 border border-white/5 flex items-start gap-2.5 flex-1 hover:border-orange-500/10 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                    <p className="text-[10px] text-slate-300 leading-relaxed font-sans">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SLIDE 4: THE VISIONARY */}
        {/* ========================================================================= */}
        {currentSlide === 3 && (
          <div className="w-full h-full flex flex-col justify-between animate-in fade-in zoom-in-95 duration-500">
            <div>
              <span className="text-[9px] font-mono font-black text-orange-500 uppercase tracking-widest">Founding Architecture // SLIDE 04</span>
              <h1 className="text-3xl font-black italic uppercase text-white mt-1 tracking-tighter">The Visionary</h1>
              <p className="text-[10px] text-slate-400 mt-1 max-w-xl">
                Licensed domain authority meets high-integrity software engineering, eliminating operational overhead and establishing technical security.
              </p>
            </div>

            {/* Founder Synergistic Dual-Column Panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-auto max-w-5xl mx-auto w-full">
              
              {/* Real Estate Domain */}
              <div 
                onMouseEnter={() => setActiveFounderPillar('re')}
                className={`p-8 rounded-3xl flex flex-col justify-between backdrop-blur-md relative overflow-hidden transition-all duration-300 border ${
                  activeFounderPillar === 're' 
                    ? 'bg-slate-900/60 border-orange-500/40 shadow-[0_0_20px_rgba(249,115,22,0.1)]' 
                    : 'bg-slate-900/10 border-white/5 opacity-50'
                }`}
              >
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
                      <FaChessRook className="text-orange-500 text-lg" />
                    </div>
                    <span className="font-mono text-[8px] font-black text-slate-500 uppercase tracking-widest bg-slate-950 border border-white/10 px-2.5 py-1 rounded-full">Sector Domain</span>
                  </div>

                  <div>
                    <h3 className="text-xl font-black italic text-white uppercase tracking-tight">Real Estate Brokerage</h3>
                    <p className="text-[9px] font-bold text-orange-500 uppercase tracking-widest mt-1">Licensed Domain Authority & Broker Pipelines</p>
                  </div>

                  <ul className="space-y-3 pt-4 border-t border-white/5">
                    {[
                      'In-depth local expertise in the North Texas luxury real estate market.',
                      'Direct secure credential access to live RESO and NTREIS database feeds.',
                      'Built-in luxury builder relationships and investor portfolio pipelines.'
                    ].map((item, idx) => (
                      <li key={idx} className="text-[10px] text-slate-300 leading-relaxed flex items-start gap-2.5">
                        <span className="text-orange-500 font-extrabold mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Software Systems */}
              <div 
                onMouseEnter={() => setActiveFounderPillar('se')}
                className={`p-8 rounded-3xl flex flex-col justify-between backdrop-blur-md relative overflow-hidden transition-all duration-300 border ${
                  activeFounderPillar === 'se' 
                    ? 'bg-slate-900/60 border-purple-500/40 shadow-[0_0_20px_rgba(139,92,246,0.1)]' 
                    : 'bg-slate-900/10 border-white/5 opacity-50'
                }`}
              >
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
                      <FaCode className="text-purple-500 text-lg" />
                    </div>
                    <span className="font-mono text-[8px] font-black text-slate-500 uppercase tracking-widest bg-slate-950 border border-white/10 px-2.5 py-1 rounded-full">Systems Architect</span>
                  </div>

                  <div>
                    <h3 className="text-xl font-black italic text-white uppercase tracking-tight">Software Engineering</h3>
                    <p className="text-[9px] font-bold text-purple-500 uppercase tracking-widest mt-1">Modern Enterprise Architecture & Spatial Math</p>
                  </div>

                  <ul className="space-y-3 pt-4 border-t border-white/5">
                    {[
                      'Senior Security Architect & veteran Full-Stack software developer.',
                      'Scalable microservices utilizing Next.js, Supabase, TypeScript, and Docker.',
                      'Custom WebGL structures and optimized client-side React rendering.'
                    ].map((item, idx) => (
                      <li key={idx} className="text-[10px] text-slate-300 leading-relaxed flex items-start gap-2.5">
                        <span className="text-purple-500 font-extrabold mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

            </div>

            {/* Core Synergy Banner Summary */}
            <div className="bg-gradient-to-r from-orange-500/10 via-pink-500/10 to-purple-500/10 border border-white/5 p-4.5 rounded-2xl flex items-center gap-3 max-w-5xl mx-auto w-full shrink-0">
              <FaArrowTrendUp className="text-orange-500 animate-pulse text-xs shrink-0" />
              <span className="text-[9px] font-black uppercase text-slate-300 tracking-wider leading-relaxed">
                THE FOUNDING STRATEGY: Real estate startups typically collapse due to incompetent engineering execution. Technical startups fail due to zero industry access or compliance blocks. Sunset Pulse merges domain authority with full-stack execution.
              </span>
            </div>
          </div>
        )}

      </div>

      {/* Bottom Navigation and Progress Controls */}
      <div className="flex justify-between items-center z-50 border-t border-white/5 pt-4 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-mono font-black text-slate-500 uppercase tracking-widest">Widescreen Presentation Viewport</span>
          <div className="flex gap-1">
            {[...Array(totalSlides)].map((_, idx) => (
              <button 
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`w-4 h-1.5 rounded-full transition-all duration-300 ${
                  currentSlide === idx 
                    ? 'bg-gradient-to-r from-orange-500 to-pink-500 w-8 shadow-[0_0_8px_#f97316]' 
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Keyboard controller indicators */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-slate-900/60 border border-white/5 px-2.5 py-1.5 rounded-lg text-[8px] font-mono text-slate-500 uppercase tracking-widest">
            <span>Keys:</span>
            <kbd className="bg-slate-950 border border-white/10 px-1 py-0.5 rounded text-slate-300">←</kbd>
            <kbd className="bg-slate-950 border border-white/10 px-1 py-0.5 rounded text-slate-300">→</kbd>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={prevSlide}
              className="p-3 bg-slate-900/60 hover:bg-slate-900 border border-white/5 hover:border-white/10 rounded-xl transition-all text-xs"
            >
              <FaChevronLeft className="text-slate-400 hover:text-white" />
            </button>
            
            <span className="font-mono text-[10px] font-black text-slate-300 uppercase tracking-widest px-4">
              {currentSlide + 1} / {totalSlides}
            </span>

            <button 
              onClick={nextSlide}
              className="p-3 bg-slate-900/60 hover:bg-slate-900 border border-white/5 hover:border-white/10 rounded-xl transition-all text-xs"
            >
              <FaChevronRight className="text-slate-400 hover:text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

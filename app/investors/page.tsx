'use client';
import React, { useState } from 'react';
import { 
  FaArrowRight, FaArrowLeft, FaGlobe, FaDatabase, FaChartLine, 
  FaUserTie, FaCube, FaLayerGroup, FaNetworkWired, FaRocket 
} from 'react-icons/fa';
import { LucideShieldCheck, LucideZap, LucideCpu } from 'lucide-react';
import InvestorSlide from '@/components/investor/InvestorSlide';
import LiveIDXPulse from '@/components/investor/LiveIDXPulse';

const InvestorPage = () => {
  const [step, setStep] = useState(0);

  const slides = [
    {
      id: "hook",
      title: "The Industry Friction",
      subtitle: "The Hook // 05 Mins",
      icon: <LucideShieldCheck className="text-orange-500" />,
      content: "Real estate data is trapped in 2D silos. Agents are drowning in fragmented IDX feeds, while buyers struggle to visualize assets in their true spatial context. The friction isn't just data—it's immersion.",
      interactive: (
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
            <div className="text-[10px] font-black uppercase text-orange-400 mb-1 tracking-widest">Pain Point A</div>
            <div className="text-xl font-black text-white/90 uppercase tracking-tighter italic">2D Static Feeds</div>
            <p className="text-[10px] text-white/40 mt-2 font-mono">Legacy MLS systems fail to communicate architectural value.</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
            <div className="text-[10px] font-black uppercase text-orange-400 mb-1 tracking-widest">Pain Point B</div>
            <div className="text-xl font-black text-white/90 uppercase tracking-tighter italic">Lead Fragmentation</div>
            <p className="text-[10px] text-white/40 mt-2 font-mono">Disjointed CRM flows lose 40% of high-intent engagement.</p>
          </div>
        </div>
      ),
      button: "Identify the Gap",
      action: () => setStep(1)
    },
    {
      id: "gap",
      title: "Why Solutions Fail",
      subtitle: "The Gap // 10 Mins",
      icon: <FaLayerGroup className="text-blue-400" />,
      content: "Existing platforms treat 3D as a gimmick, not a core search primitive. They bolt visualization onto old databases. Data fragmentation leads to 'Intelligence Decay'—where leads go cold because the context is lost.",
      interactive: (
        <div className="space-y-3 mt-4">
          <div className="flex items-center gap-4 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">✕</div>
            <div>
              <div className="text-[10px] font-black uppercase text-red-400">Visualization Lag</div>
              <p className="text-[10px] text-white/50">3D renders are disconnected from live market pricing.</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">✕</div>
            <div>
              <div className="text-[10px] font-black uppercase text-red-400">Contextual Silos</div>
              <p className="text-[10px] text-white/50">Buyer behavior is tracked, but not translated into strategy.</p>
            </div>
          </div>
        </div>
      ),
      button: "Reveal the Bridge",
      action: () => setStep(2)
    },
    {
      id: "reveal",
      title: "Sunset Pulse: The Bridge",
      subtitle: "The Reveal // 15 Mins",
      icon: <FaCube className="text-orange-500 animate-pulse" />,
      content: "We provide 'Spatial Intelligence'. A unified platform where live IDX data, 3D architectural renders, and AI-driven behavior analysis converge. We don't just show homes; we project value.",
      interactive: (
        <div className="space-y-4 mt-6">
          <div className="bg-gradient-to-br from-blue-900/40 to-orange-900/40 border border-white/20 p-6 rounded-3xl relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">The Pulse View</span>
              </div>
              <div className="text-3xl font-black italic uppercase tracking-tighter leading-none mb-2">3D Spatial <br/>Search Engine</div>
              <p className="text-xs text-white/60 max-w-[200px]">Live IDX integrated directly into Three.js architectural meshes.</p>
            </div>
            <div className="absolute -right-8 -bottom-8 opacity-20 group-hover:scale-110 transition-transform duration-1000">
              <FaGlobe size={120} className="text-white" />
            </div>
          </div>
          <LiveIDXPulse />
        </div>
      ),
      button: "Validate the Tech",
      action: () => setStep(3)
    },
    {
      id: "tech",
      title: "Scalable Architecture",
      subtitle: "Validation // 10 Mins",
      icon: <LucideCpu className="text-blue-400" />,
      content: "Built for growth. Our stack leverages Next.js for SSR edge-delivery and Supabase for high-integrity asset management. This is not a concept; it's an operational grid.",
      interactive: (
        <div className="grid grid-cols-1 gap-2 mt-4">
          <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/10">
            <div className="flex items-center gap-3">
              <FaNetworkWired className="text-blue-500" />
              <span className="text-[10px] font-black uppercase tracking-widest">Market Integration</span>
            </div>
            <span className="text-[8px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded font-mono">LIVE_IDX_SYNC</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/10">
            <div className="flex items-center gap-3">
              <FaDatabase className="text-blue-500" />
              <span className="text-[10px] font-black uppercase tracking-widest">Asset Persistence</span>
            </div>
            <span className="text-[8px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-mono">SUPABASE_POSTGRES</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/10">
            <div className="flex items-center gap-3">
              <LucideZap className="text-blue-500" size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Edge Deployment</span>
            </div>
            <span className="text-[8px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded font-mono">VERCEL_GLOBAL</span>
          </div>
        </div>
      ),
      button: "View The Roadmap",
      action: () => setStep(4)
    },
    {
      id: "roadmap",
      title: "Strategic Rollout",
      subtitle: "The Future // 2026-2027",
      icon: <FaRocket className="text-orange-500" />,
      content: "From regional dominance in North Texas to a national spatial intelligence standard. We are scaling the data bridge.",
      interactive: (
        <div className="relative border-l border-white/10 pl-6 space-y-6 mt-6 ml-2">
          <div className="relative">
            <div className="absolute -left-[29px] top-1 w-3 h-3 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]" />
            <div className="text-[10px] font-black uppercase text-orange-400">Q3 2026</div>
            <div className="text-sm font-bold">NTREIS Grid Saturation</div>
          </div>
          <div className="relative opacity-60">
            <div className="absolute -left-[29px] top-1 w-3 h-3 rounded-full bg-white/20" />
            <div className="text-[10px] font-black uppercase text-white/40">Q1 2027</div>
            <div className="text-sm font-bold italic">Predictive Valuation Engine</div>
          </div>
          <div className="relative opacity-30">
            <div className="absolute -left-[29px] top-1 w-3 h-3 rounded-full bg-white/10" />
            <div className="text-[10px] font-black uppercase text-white/40">Q3 2027</div>
            <div className="text-sm font-bold italic">National Expansion (NAR Integration)</div>
          </div>
        </div>
      ),
      button: "The Visionary",
      action: () => setStep(5)
    },
    {
      id: "visionary",
      title: "The Visionary",
      subtitle: "Realtor + Engineer",
      icon: <FaUserTie className="text-blue-400" />,
      content: "Founded at the intersection of high-stakes real estate and full-stack engineering. We speak the language of both the grid and the ground.",
      interactive: (
        <div className="flex items-center gap-4 mt-6 p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
          <div className="w-16 h-16 rounded-xl bg-blue-600/20 border border-blue-500/30 overflow-hidden flex items-center justify-center">
             <FaUserTie className="text-blue-400 text-3xl" />
          </div>
          <div>
            <div className="text-xl font-black uppercase italic tracking-tighter">Tahsin Reza</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-blue-400">Senior Architect / Founder</div>
            <p className="text-[9px] text-white/40 mt-1">Bridging architectural intent with scalable engineering.</p>
          </div>
        </div>
      ),
      button: "Initiate Pitch Recap",
      action: () => setStep(0)
    }
  ];

  const currentSlide = slides[step];

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col items-center justify-center p-6 selection:bg-orange-500 selection:text-black">
      {/* Background Ambience */}
      <div className="fixed inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:40px_40px] opacity-20 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_50%)] pointer-events-none" />
      
      {/* HUD Elements */}
      <div className="fixed top-8 left-8 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400/80">Investor Mode</span>
        </div>
        <div className="h-4 w-px bg-white/10" />
        <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">SLIDE_OP_{step + 1}</span>
      </div>

      <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-16 items-center relative z-10">
        <div className="hidden md:flex flex-col items-center justify-center space-y-8">
           {/* Visual anchor reflecting the slide content */}
           <div className="w-full aspect-square bg-slate-900/50 rounded-[40px] border border-white/5 flex items-center justify-center relative overflow-hidden group shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/10 to-transparent opacity-50" />
              <div className={`transition-all duration-1000 transform ${step === 0 ? 'scale-110 rotate-3' : 'scale-100 rotate-0'}`}>
                {step === 0 && <FaLayerGroup size={160} className="text-orange-500/20 blur-[2px]" />}
                {step === 1 && <FaNetworkWired size={160} className="text-red-500/20 blur-[1px]" />}
                {step === 2 && <FaCube size={180} className="text-blue-500/30 animate-spin-slow" />}
                {step === 3 && <FaDatabase size={160} className="text-blue-500/20" />}
                {step === 4 && <FaChartLine size={160} className="text-orange-500/20" />}
                {step === 5 && <FaUserTie size={160} className="text-blue-500/20" />}
              </div>
              
              {/* Dynamic Data Pulse Overlay */}
              <div className="absolute bottom-12 left-12 right-12">
                 <div className="flex justify-between items-end mb-2">
                    <div className="text-[10px] font-black uppercase tracking-tighter text-blue-400">Market_Pulse_Sync</div>
                    <div className="text-[8px] font-mono text-white/30">v6.0.48</div>
                 </div>
                 <div className="h-[2px] w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${((step + 1) / slides.length) * 100}%` }} />
                 </div>
              </div>
           </div>
        </div>

        <div className="relative">
          {/* Navigation Controls */}
          <div className="absolute -top-12 left-0 flex gap-4">
             <button 
               onClick={() => setStep(Math.max(0, step - 1))}
               disabled={step === 0}
               className="text-white/20 hover:text-white transition-colors disabled:opacity-0"
             >
               <FaArrowLeft size={14} />
             </button>
             <div className="flex gap-1 items-center">
                {slides.map((_, i) => (
                  <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i === step ? 'w-4 bg-orange-500' : 'w-1 bg-white/10'}`} />
                ))}
             </div>
          </div>

          <InvestorSlide 
            slide={currentSlide as any}
            aiActive={false}
            step={step}
          />
        </div>
      </div>

      <div className="fixed bottom-8 text-[8px] uppercase tracking-[0.4em] opacity-20 text-center max-w-lg font-black italic">
        Proprietary Intelligence Grid // Powered by Jamie AI Operative // © 2026 Sunset Pulse
      </div>

      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 12s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default InvestorPage;

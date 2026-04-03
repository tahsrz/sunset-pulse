'use client';
import React, { useState, useEffect } from 'react';
import { FaBolt, FaMousePointer, FaMoneyBillWave, FaArrowRight, FaChartLine, FaGlobeAmericas, FaUsers, FaMicrochip, FaBuilding, FaTrain, FaSearch } from 'react-icons/fa';
import { LucideShieldCheck, LucideZap, LucideTarget, LucideLayers, LucideBrainCircuit } from 'lucide-react';
import { generatePredictiveQueries } from '@/lib/ai/query-generator';

const PulsarSprite = ({ intensity = 1, status = 'idle' }) => {
  const glowColor = status === 'success' ? '#4ade80' : status === 'ai' ? '#3b82f6' : status === 'active' ? '#fbbf24' : '#22c55e';
  
  return (
    <div className={`relative flex items-center justify-center transition-all duration-1000 ${status === 'active' || status === 'ai' ? 'scale-110' : 'scale-100'}`}>
      <div 
        className="absolute rounded-full blur-2xl animate-pulse"
        style={{ 
          width: `${100 * intensity}px`, 
          height: `${100 * intensity}px`, 
          backgroundColor: glowColor,
          opacity: 0.3 
        }}
      />
      <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 30C10 10 5 25 15 40" stroke="#16a34a" strokeWidth="6" strokeLinecap="round" />
        <path d="M80 30C90 10 95 25 85 40" stroke="#16a34a" strokeWidth="6" strokeLinecap="round" />
        <ellipse cx="50" cy="55" rx="35" ry="30" fill="#22c55e" />
        <circle cx="35" cy="50" r="6" fill="white" />
        <circle cx="65" cy="50" r="6" fill="white" />
        <circle cx="37" cy="48" r="2" fill="black" />
        <circle cx="67" cy="48" r="2" fill="black" />
        <path d="M25 75C35 85 65 85 75 75C70 65 30 65 25 75Z" fill="#15803d" />
      </svg>
      <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md border border-white/20 p-2 rounded-xl whitespace-nowrap text-[10px] font-mono uppercase tracking-tighter text-green-400">
        {status === 'idle' && "Lead gen, a machine it is."}
        {status === 'ai' && "Predictive queries, I generate. Ask me, you must."}
        {status === 'success' && "The Heartbeat, we capture!"}
        {status === 'processing' && "20-vector reconstruction active."}
      </div>
    </div>
  );
};

const InvestorPage = () => {
  const [step, setStep] = useState(0);
  const [stats, setStats] = useState({ views: 0, chat: 0, tour: false });
  const [apis, setApis] = useState({ attom: true, osm: true, census: false });
  const [probability, setProbability] = useState(0);
  const [aiActive, setAiActive] = useState(false);
  const [queries, setQueries] = useState([]);

  // Simplified context for query generation demo
  const mockContext = {
    property: { address: '123 Pulse Way', views: stats.views, chatMinutes: stats.chat, tourRequested: stats.tour },
    external: {
      census: apis.census ? {
        medianIncome: 72500, medianAge: 34.5, homeownershipRate: 68.2, bachelorsPlus: 42.1,
        povertyRate: 8.4, unemploymentRate: 3.2, meanCommute: 28.5, medianHomeValue: 345000,
        monthlyHousingCost: 1850, broadbandAccess: 94.2, medianYearBuilt: 1974, wfhRate: 15.4,
        transitRate: 4.2, fireDensity: 12.1, techDensity: 18.5, rentBurden: 32.1,
        migrationFlux: 5.8, medianRooms: 6.2, totalUnits: 12500, internetUbiquity: 98.1
      } : null
    }
  };

  useEffect(() => {
    setProbability(calculateScore(stats.views, stats.chat, stats.tour, apis));
    if (apis.census && stats.views > 1) {
      setAiActive(true);
      setQueries(generatePredictiveQueries(mockContext));
    } else {
      setAiActive(false);
      setQueries([]);
    }
  }, [stats, apis]);

  const calculateScore = (v, c, t, sources) => {
    let score = ((v * 10) + (c * 5)) * (t ? 3.0 : 1.0);
    if (sources.attom) score += 5;
    if (sources.osm) score += 7;
    if (sources.census) score += 25;
    return Math.min(Math.round(score), 99);
  };

  const toggleApi = (id) => setApis(prev => ({ ...prev, [id]: !prev[id] }));

  const slides = [
    {
      title: "Universal Intelligence Hub",
      subtitle: "Predictive Query Generation",
      icon: <LucideLayers className="text-blue-400" />,
      content: "Sunset Pulse now predicts the user's next question. By cross-referencing 20 socioeconomic vectors with engagement, Jamie generates 'Strategic Intercepts' to guide the conversion.",
      interactive: (
        <div className="bg-white/5 p-6 rounded-2xl border border-white/10 mt-4">
          <h3 className="text-[10px] uppercase font-black tracking-widest text-green-400 mb-4">Intelligence Cluster Layering</h3>
          <div className="grid grid-cols-1 gap-3">
            {['attom', 'osm', 'census'].map(id => (
              <label key={id} className="flex items-center gap-4 cursor-pointer">
                <input type="checkbox" checked={apis[id]} onChange={() => toggleApi(id)} className="w-5 h-5 rounded border-white/20 bg-black checked:bg-green-500 transition-all" />
                <span className={`text-sm font-bold ${apis[id] ? 'text-green-400' : 'text-white/50'}`}>{id === 'attom' ? 'ATTOM (Asset)' : id === 'osm' ? 'OSM (Gravity)' : 'Deep Census (20 Vectors)'}</span>
              </label>
            ))}
          </div>
        </div>
      ),
      action: () => setStep(1),
      button: "Initiate Decision Engine"
    },
    {
      title: "Step 1: The Spark (Engagement)",
      subtitle: "Predictive Intelligence Priming.",
      icon: <FaBolt className="text-yellow-400" />,
      content: "As you add views, Jamie analyzes the census data for 'Economic Stress' and 'Remote Resilience'. The system then predicts the best query for this lead.",
      interactive: (
        <div className="flex flex-col gap-4 mt-4">
          <div className="flex gap-4 items-center">
            <button onClick={() => setStats(s => ({...s, views: s.views + 1}))} className="bg-white/10 hover:bg-white/20 p-3 rounded-lg text-xs font-bold transition-colors">Add View (+10)</button>
            <div className="text-4xl font-black text-green-400">{probability}%</div>
          </div>
          
          {aiActive && queries.length > 0 && (
            <div className="space-y-2 mt-4">
              <div className="text-[10px] uppercase font-black text-blue-400 flex items-center gap-2">
                <FaMicrochip /> Jamie's Predicted Strategic Intercepts:
              </div>
              <div className="grid grid-cols-1 gap-2">
                {queries.map((q, i) => (
                  <div key={i} className="group bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl hover:bg-blue-500/20 cursor-pointer transition-all flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase text-blue-400">{q.intent}</span>
                      <span className="text-xs font-bold">{q.label}</span>
                    </div>
                    <FaArrowRight size={10} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ),
      action: () => setStep(2),
      button: "Trace the Path"
    },
    {
      title: "Step 2: The Path (Clicks)",
      subtitle: "Migration Recon.",
      icon: <FaMousePointer className="text-purple-400" />,
      content: "interaction is the map. With 20 signals, Jamie predicts the conversion path based on industry density and transit connectivity.",
      action: () => setStep(3),
      button: "Seal the Deal"
    },
    {
      title: "Step 3: The Heartbeat (Sales)",
      subtitle: "The 3.0x Multiplier.",
      icon: <FaMoneyBillWave className="text-green-400" />,
      content: "Final conversion. Jamie uses the generated queries to prepare the final closing argument for the agent/admin.",
      action: () => setStep(4),
      button: "Review ROI"
    },
    {
      title: "ROI: Jamie's Intelligence",
      subtitle: "Data into Decisions.",
      icon: <FaChartLine className="text-blue-500" />,
      content: "We don't just provide data; we predict the strategy. Jamie ensures that every data point becomes a strategic question that leads to a sale.",
      action: () => { setStep(0); setStats({views: 0, chat: 0, tour: false}); setApis({attom: true, osm: true, census: false}); },
      button: "Restart Protocol"
    }
  ];

  const currentSlide = slides[step];

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col items-center justify-center p-6 selection:bg-green-500 selection:text-black">
      <div className="fixed inset-0 bg-[radial-gradient(#22c55e_1px,transparent_1px)] [background-size:40px_40px] opacity-10 pointer-events-none" />
      <div className="fixed top-8 left-8 flex items-center gap-2">
        <div className={`w-4 h-4 rounded-full animate-ping ${aiActive ? 'bg-blue-500' : 'bg-green-500'}`} />
        <span className="text-xs font-black uppercase tracking-[0.2em] italic">Sunset Pulse // Predictive Intelligence v6.0</span>
      </div>

      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center relative z-10">
        <div className="flex flex-col items-center justify-center space-y-8">
          <PulsarSprite intensity={1 + (probability / 100)} status={aiActive ? 'ai' : apis.census ? 'processing' : step === 1 ? 'engagement' : step === 3 ? (stats.tour ? 'success' : 'active') : 'idle'} />
          <div className="bg-white/5 border border-white/10 p-4 rounded-2xl w-full">
            <div className="text-[10px] uppercase font-bold opacity-30 mb-2">Confidence Metric</div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono"><span>Vector Signal Depth</span><span className="text-blue-400 font-bold">{apis.census ? '20' : '3'} VECTORS</span></div>
              <div className="flex justify-between text-xs font-mono"><span>Predictive Readiness</span><span className={aiActive ? "text-blue-400 font-bold" : "opacity-30"}>{aiActive ? "ACTIVE (JAMIE)" : "LOW"}</span></div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden mt-4"><div className={`h-full transition-all duration-1000 ${aiActive ? 'bg-blue-500' : 'bg-green-500'}`} style={{ width: `${probability}%` }} /></div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2"><div className="flex items-center gap-3">{currentSlide.icon}<h1 className="text-4xl font-black uppercase italic tracking-tighter leading-none">{currentSlide.title}</h1></div><h2 className="text-lg text-green-400/80 font-medium italic">{currentSlide.subtitle}</h2></div>
          <p className="text-white/70 leading-relaxed text-sm">{currentSlide.content}</p>
          {currentSlide.interactive && <div className="py-4">{currentSlide.interactive}</div>}
          <button onClick={currentSlide.action} className={`group flex items-center gap-3 px-6 py-3 rounded-full font-black uppercase tracking-widest text-xs transition-all hover:scale-105 ${aiActive && step === 1 ? 'bg-blue-500 text-white shadow-xl shadow-blue-500/30' : 'bg-white text-black hover:bg-green-500'}`}>{currentSlide.button}<FaArrowRight className="group-hover:translate-x-1 transition-transform" /></button>
          <div className="flex gap-2 pt-8">{slides.map((_, i) => (<div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= step ? (aiActive ? 'bg-blue-500' : 'bg-green-500') : 'bg-white/10'}`} />))}</div>
        </div>
      </div>
      <div className="fixed bottom-8 text-[8px] uppercase tracking-widest opacity-20 text-center max-w-lg">Proprietary SUNSETPULSE V6.0. Predictive Strategic Intercepts via Jamie AI Operative.</div>
    </div>
  );
};

export default InvestorPage;

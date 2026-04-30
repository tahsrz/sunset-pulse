'use client';

import React, { useState, useEffect } from 'react';
import { ABIDAN_DATA } from '@/constants/abidan';
import { FaEye, FaShieldAlt, FaGhost, FaSpider, FaCrosshairs, FaDove, FaBolt, FaSkull, FaChevronDown, FaVolumeUp, FaVolumeMute } from 'react-icons/fa';
import MakielFateChart from './MakielFateChart';
import GadraelRiskShield from './GadraelRiskShield';
import TelarielSpiderNet from './TelarielSpiderNet';
import DurandielGhostRecon from './DurandielGhostRecon';
import RazaelAttackStrategy from './RazaelAttackStrategy';
import SurielRestorationCore from './SurielRestorationCore';
import ZakarielLogisticFox from './ZakarielLogisticFox';
import OzrielFinalArbiter from './OzrielFinalArbiter';
import propertiesData from '@/properties.json';
import { JamieBriefing } from '@/lib/types/jamieBriefing';
import { speak } from '@/lib/core/tts';

const JamiePulseBriefing = ({ property }: { property: any }) => {
  const [briefing, setBriefing] = useState<JamieBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    fetch('/api/jamie/briefing')
      .then(res => res.json())
      .then(data => {
        setBriefing(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load briefing:', err);
        setLoading(false);
      });
  }, []);

  const handleNarrate = () => {
    if (!briefing) return;
    
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const textToSpeak = `Intelligence Summary for ${new Date(briefing.timestamp).toLocaleDateString()}. ${briefing.executive_summary}. Top Headline: ${briefing.top_headline}. Key signal count: ${briefing.key_signal_count}.`;
      speak(textToSpeak, 'Jamie');
      setIsSpeaking(true);
      
      // Reset icon when speech end
      const checkSpeech = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          setIsSpeaking(false);
          clearInterval(checkSpeech);
        }
      }, 1000);
    }
  };

  if (loading) return <div className="p-20 text-center animate-pulse font-mono text-blue-500">INITIATING 5-HOUR DATA HARVEST...</div>;
  if (!briefing || briefing.error) return <div className="p-20 text-center font-mono text-red-500">NO BRIEFING DETECTED. RUN AUTODREAM.</div>;

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header Info */}
      <div className="grid gap-6 md:grid-cols-[1.6fr_1fr] border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-emerald-500">Regional Brief</p>
            <button 
              onClick={handleNarrate}
              className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all ${
                isSpeaking 
                ? 'bg-emerald-500 border-emerald-400 text-black animate-pulse' 
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20'
              }`}
            >
              {isSpeaking ? <FaVolumeMute /> : <FaVolumeUp />}
              {isSpeaking ? 'STOP NARRATION' : 'NARRATE BRIEF'}
            </button>
          </div>
          <h4 className="text-3xl font-black italic tracking-tighter text-emerald-500">North Texas Intelligence Summary</h4>
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-1">
            Brief Runtime: {briefing.simulated_research_hours} Hours // {new Date(briefing.timestamp).toLocaleDateString()}
          </p>
          <p className="text-sm text-slate-300 leading-relaxed mt-4 max-w-3xl">
            {briefing.executive_summary}
          </p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl max-w-md">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2">Operator Note</p>
          <p className="text-xs italic text-emerald-300">"{briefing.daily_joke}"</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
          <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-2">Top Headline</p>
          <p className="text-lg font-bold text-white leading-snug">{briefing.top_headline}</p>
        </div>
        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
          <p className="text-[9px] font-black uppercase tracking-widest text-blue-400 mb-2">Signals Reviewed</p>
          <p className="text-3xl font-black italic text-white">{briefing.key_signal_count}</p>
        </div>
        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
          <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-2">Copy Risk Flags</p>
          <p className="text-3xl font-black italic text-white">{briefing.ozriel_audit.humanized_rewrites.length}</p>
        </div>
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {briefing.news_articles.map((article, idx: number) => (
          <div key={idx} className="bg-slate-900/50 border border-white/5 rounded-3xl overflow-hidden flex flex-col">
            <div className="p-8 space-y-4">
              <span className="text-[9px] bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full font-black uppercase tracking-widest">
                Market Signal // {article.category}
              </span>
              <h6 className="text-2xl font-black tracking-tighter uppercase">{article.title}</h6>
              <p className="text-sm text-slate-400 leading-relaxed">{article.summary}</p>
            </div>
            
            {/* Visual Synthesis: Spider Net Telariel */}
            <div className="bg-black/40 border-t border-white/5 p-4 h-64">
              <span className="text-[8px] font-mono text-purple-500 uppercase tracking-widest mb-2 block">Telariel Network Mapping</span>
              <TelarielSpiderNet 
                property={property}
                customNodes={article.spider_net_data?.nodes} 
                customLinks={article.spider_net_data?.links}
                intelSummary={`Influence grid for: ${article.title}`}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Ozriel Linguistic Audit */}
      <div className="pt-12 border-t border-white/10">
        <div className="flex items-center gap-4 mb-8">
           <div className="w-12 h-12 bg-indigo-950 rounded-xl flex items-center justify-center border border-indigo-500/30">
              <FaSkull className="text-indigo-400 text-xl" />
           </div>
           <div>
              <h5 className="text-2xl font-black italic tracking-tighter uppercase">Language Quality Review</h5>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-1">Plain-language pass before release</p>
           </div>
        </div>
        <OzrielFinalArbiter auditData={briefing.ozriel_audit} />
      </div>
    </div>
  );
};

const JudgesWarRoom = () => {
  const [activeJudge, setActiveJudge] = useState(ABIDAN_DATA[0]);
  const [selectedProperty, setSelectedProperty] = useState(propertiesData[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const getIcon = (type: string) => {
    switch (type) {
      case 'hound': return <FaEye />;
      case 'titan': return <FaShieldAlt />;
      case 'ghost': return <FaGhost />;
      case 'spider': return <FaSpider />;
      case 'wolf': return <FaCrosshairs />;
      case 'phoenix': return <FaDove />;
      case 'fox': return <FaBolt />;
      case 'reaper': return <FaSkull />;
      default: return <FaShieldAlt />;
    }
  };

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100 p-6 font-sans border border-white/5 rounded-[2rem] m-4 shadow-2xl overflow-hidden relative">
      {/* Background Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[120px] -z-10 rounded-full" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/10 blur-[120px] -z-10 rounded-full" />

      {/* Header Area */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 border-b border-white/10 pb-8 gap-6">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter italic text-blue-500">
            Intelligence Command
          </h2>
          <p className="text-slate-500 font-mono text-[10px] uppercase tracking-[0.4em] mt-2">
            [ ASSET ANALYSIS GRID // LIVE ]
          </p>
        </div>

        {/* PROPERTY DROPDOWN */}
        <div className="relative w-full md:w-80">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between hover:bg-white/10 transition-all group"
          >
            <div className="text-left">
              <span className="text-[9px] text-blue-500 font-black uppercase tracking-widest block mb-1">Target Asset</span>
              <span className="text-sm font-bold uppercase truncate block">{selectedProperty.name}</span>
            </div>
            <FaChevronDown className={`text-slate-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isDropdownOpen && (
            <div className="absolute top-full left-0 w-full mt-2 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto custom-scrollbar">
              {propertiesData.map((prop, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedProperty(prop);
                    setIsDropdownOpen(false);
                  }}
                  className="w-full text-left p-4 hover:bg-blue-600/20 border-b border-white/5 last:border-0 transition-colors"
                >
                  <p className="text-xs font-bold uppercase">{prop.name}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-mono">{prop.location.city}, {prop.location.state}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <div className="text-right">
            <span className="text-[10px] text-slate-600 block uppercase font-black">Signal Integrity</span>
            <span className="text-xs font-mono text-blue-400">OPTIMAL_LINK</span>
          </div>
          <div className="w-12 h-12 border border-white/10 rounded-xl flex items-center justify-center bg-white/5">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* JUDGE SELECTIOn */}
        <div className="lg:col-span-1 space-y-3">
          {ABIDAN_DATA.map((judge) => (
            <button
              key={judge.id}
              onClick={() => setActiveJudge(judge)}
              className={`w-full group relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-500 overflow-hidden ${
                activeJudge.id === judge.id 
                ? 'bg-blue-600/10 border-blue-500/50 shadow-lg' 
                : 'bg-white/5 border-white/5 hover:border-white/20'
              }`}
            >
              <div className={`p-2 rounded-lg transition-colors ${activeJudge.id === judge.id ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-500 group-hover:text-slate-300'}`}>
                {getIcon(judge.geometryType)}
              </div>
              <div className="text-left">
                <p className="text-xs font-black uppercase tracking-tighter leading-none">{judge.name}</p>
                <p className="text-[9px] text-slate-500 uppercase font-mono mt-1 opacity-70">{judge.missionLabel}</p>
              </div>
              {activeJudge.id === judge.id && (
                <div className="absolute right-4 w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,1)]" />
              )}
            </button>
          ))}
        </div>

        {/* MAIN VISUALIZATION AREA */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 min-h-[550px] relative overflow-hidden backdrop-blur-md">
            {/* Widget Selection based on Active Judge */}
            <div className="relative z-10 h-full">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-1 h-12 bg-blue-500" />
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter">{activeJudge.name} / {activeJudge.mantle}</h3>
                  <p className="text-[10px] text-slate-500 uppercase font-mono tracking-widest mt-1">{activeJudge.missionLabel} // {activeJudge.geometryType.toUpperCase()}</p>
                  <p className="text-sm text-slate-400 mt-3 max-w-3xl">{activeJudge.description}</p>
                </div>
              </div>

              {/* Dynamic Content Rendering */}
              <div className="h-full">
                {activeJudge.id === 'makiel' && <MakielFateChart property={selectedProperty} />}
                {activeJudge.id === 'gadrael' && <GadraelRiskShield property={selectedProperty} />}
                {activeJudge.id === 'telariel' && <TelarielSpiderNet property={selectedProperty} />}
                {activeJudge.id === 'durandiel' && <DurandielGhostRecon property={selectedProperty} />}
                {activeJudge.id === 'razael' && <RazaelAttackStrategy property={selectedProperty} />}
                {activeJudge.id === 'suriel' && <SurielRestorationCore property={selectedProperty} />}
                {activeJudge.id === 'zakariel' && <ZakarielLogisticFox property={selectedProperty} />}
                {activeJudge.id === 'ozriel' && <OzrielFinalArbiter />}
                {activeJudge.id === 'daily-briefing' && <JamiePulseBriefing property={selectedProperty} />}
              </div>
            </div>

            {/* Decorative background mantle */}
            <div className="absolute -bottom-20 -right-20 text-[20rem] text-white/5 select-none pointer-events-none rotate-12">
              {getIcon(activeJudge.geometryType)}
            </div>
          </div>

          {/* Lower Data Strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
              <span className="text-[9px] text-blue-500 font-black uppercase tracking-widest block mb-1">Submarket</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black italic">{selectedProperty.location.city.toUpperCase()}</span>
                <span className="text-[10px] text-slate-500 uppercase font-mono">{selectedProperty.location.zipcode}</span>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
              <span className="text-[9px] text-purple-500 font-black uppercase tracking-widest block mb-1">Asset Class</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black italic">{selectedProperty.type.toUpperCase()}</span>
                <span className="text-[10px] text-slate-500 uppercase font-mono">{selectedProperty.square_feet} SQFT</span>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
              <span className="text-[9px] text-emerald-500 font-black uppercase tracking-widest block mb-1">Data Density</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black italic">{(selectedProperty.amenities.length * 2.4).toFixed(1)} TB</span>
                <span className="text-[10px] text-slate-500 uppercase font-mono">Verified</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JudgesWarRoom;

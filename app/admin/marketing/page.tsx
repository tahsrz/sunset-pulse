'use client';

import { useState, useEffect } from 'react';
import { FaBullhorn, FaSave, FaSync, FaEdit, FaChevronRight } from 'react-icons/fa';
import { toast } from 'react-toastify';

export default function MarketingConfigPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/marketing');
      const data = await res.json();
      setConfig(data);
    } catch (error) {
      toast.error('Failed to load marketing intelligence.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = (section: string, field: string, value: string, subSection?: string) => {
    const newConfig = { ...config };
    if (subSection) {
      newConfig[section][subSection][field] = value;
    } else {
      newConfig[section][field] = value;
    }
    setConfig(newConfig);
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        toast.success('Marketing narrative synchronized.');
      } else {
        throw new Error();
      }
    } catch (error) {
      toast.error('Narrative commit failed.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <FaSync className="text-blue-500 animate-spin text-4xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-mono pb-24">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-end mb-12 border-b border-blue-500/30 pb-6">
          <div>
            <div className="flex items-center gap-2 text-blue-500 mb-2">
              <FaBullhorn />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">Narrative Control</span>
            </div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-blue-50">Marketing Architect</h1>
          </div>
          <button 
            onClick={saveConfig}
            disabled={saving}
            className="flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] disabled:opacity-50"
          >
            {saving ? 'Transmitting...' : 'Commit Changes'} <FaSave />
          </button>
        </header>

        <div className="space-y-12">
          {/* Hero Section */}
          <section className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-blue-400 mb-8 flex items-center gap-2">
              <FaEdit /> Hero Configuration
            </h2>
            <div className="space-y-6">
              <div>
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Primary Title</label>
                <input 
                  type="text" 
                  value={config.hero.title}
                  onChange={(e) => handleUpdate('hero', 'title', e.target.value)}
                  className="w-full bg-slate-950 border border-white/5 rounded-xl px-6 py-4 text-sm font-bold uppercase tracking-tight text-blue-400 focus:outline-none focus:border-blue-500/50 transition-all"
                />
              </div>
              <div>
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Tagline</label>
                <input 
                  type="text" 
                  value={config.hero.subtitle}
                  onChange={(e) => handleUpdate('hero', 'subtitle', e.target.value)}
                  className="w-full bg-slate-950 border border-white/5 rounded-xl px-6 py-4 text-sm font-medium italic text-slate-300 focus:outline-none focus:border-blue-500/50 transition-all"
                />
              </div>
              <div>
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Description</label>
                <textarea 
                  value={config.hero.description}
                  onChange={(e) => handleUpdate('hero', 'description', e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-white/5 rounded-xl px-6 py-4 text-sm font-medium leading-relaxed text-slate-400 focus:outline-none focus:border-blue-500/50 transition-all resize-none"
                />
              </div>
            </div>
          </section>

          {/* Section Headers */}
          <section className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-blue-400 mb-8 flex items-center gap-2">
              <FaEdit /> Section Headers
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {Object.keys(config.section_headers).map((secKey) => (
                <div key={secKey} className="space-y-6 p-6 bg-black/20 rounded-2xl border border-white/5">
                  <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{secKey.replace('_', ' ')} Header</h3>
                  <div>
                    <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-2 block">Title</label>
                    <input 
                      type="text" 
                      value={config.section_headers[secKey].title}
                      onChange={(e) => handleUpdate('section_headers', 'title', e.target.value, secKey)}
                      className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-2 block">Tagline</label>
                    <input 
                      type="text" 
                      value={config.section_headers[secKey].tagline}
                      onChange={(e) => handleUpdate('section_headers', 'tagline', e.target.value, secKey)}
                      className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2 text-[10px] font-mono text-blue-400 focus:outline-none focus:border-blue-500/50 transition-all"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ Configuration */}
          <section className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-blue-400 mb-8 flex items-center gap-2">
              <FaEdit /> FAQ Configuration
            </h2>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2 block">FAQ Title</label>
                  <input 
                    type="text" 
                    value={config.faq.title}
                    onChange={(e) => handleUpdate('faq', 'title', e.target.value)}
                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500/50 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Tagline</label>
                  <input 
                    type="text" 
                    value={config.faq.tagline}
                    onChange={(e) => handleUpdate('faq', 'tagline', e.target.value)}
                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2 text-[10px] font-mono text-blue-400 focus:outline-none focus:border-blue-500/50 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-4">
                {config.faq.items.map((item: any, idx: number) => (
                  <div key={idx} className="p-6 bg-black/20 rounded-2xl border border-white/5 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Intelligence Item #{idx + 1}</h4>
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-2 block">Question</label>
                      <input 
                        type="text" 
                        value={item.question}
                        onChange={(e) => {
                          const newItems = [...config.faq.items];
                          newItems[idx].question = e.target.value;
                          setConfig({ ...config, faq: { ...config.faq, items: newItems } });
                        }}
                        className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500/50 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-2 block">Answer Briefing</label>
                      <textarea 
                        value={item.answer}
                        onChange={(e) => {
                          const newItems = [...config.faq.items];
                          newItems[idx].answer = e.target.value;
                          setConfig({ ...config, faq: { ...config.faq, items: newItems } });
                        }}
                        rows={3}
                        className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2 text-xs font-medium leading-relaxed text-slate-400 focus:outline-none focus:border-blue-500/50 transition-all resize-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Features Section */}
          <div className="grid grid-cols-1 gap-8">
            {Object.keys(config.features).map((featKey) => (
              <section key={featKey} className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8 group hover:border-blue-500/20 transition-all">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-blue-400 mb-8 flex items-center gap-2">
                  <FaChevronRight className="text-[8px] opacity-30" /> Feature: {featKey.replace('_', ' ')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Feature Title</label>
                      <input 
                        type="text" 
                        value={config.features[featKey].title}
                        onChange={(e) => handleUpdate('features', 'title', e.target.value, featKey)}
                        className="w-full bg-slate-950 border border-white/5 rounded-xl px-6 py-3 text-sm font-bold uppercase tracking-tight text-white focus:outline-none focus:border-blue-500/50 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Tagline</label>
                      <input 
                        type="text" 
                        value={config.features[featKey].tagline}
                        onChange={(e) => handleUpdate('features', 'tagline', e.target.value, featKey)}
                        className="w-full bg-slate-950 border border-white/5 rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-widest text-blue-500/80 focus:outline-none focus:border-blue-500/50 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Narrative Description</label>
                    <textarea 
                      value={config.features[featKey].description}
                      onChange={(e) => handleUpdate('features', 'description', e.target.value, featKey)}
                      rows={5}
                      className="w-full h-full bg-slate-950 border border-white/5 rounded-xl px-6 py-4 text-sm font-medium leading-relaxed text-slate-400 focus:outline-none focus:border-blue-500/50 transition-all resize-none"
                    />
                  </div>
                </div>
              </section>
            ))}
          </div>

          <div className="p-8 bg-blue-600/5 border border-blue-500/10 rounded-[2.5rem] flex items-center justify-between opacity-50 italic">
            <span className="text-[10px] uppercase tracking-[0.4em]">Grid Memory Protocol v1.2</span>
            <span className="text-[10px] uppercase tracking-[0.4em]">System: Stable</span>
          </div>
        </div>
      </div>
    </div>
  );
}

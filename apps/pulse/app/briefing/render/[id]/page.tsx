'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { FaCalendarAlt, FaChartLine, FaMapMarkerAlt, FaFileContract } from 'react-icons/fa';

const PropertyBriefing = () => {
  const { id } = useParams();
  const [briefingData, setBriefingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mocking the fetch of the briefing/render job data
    // In production, this would fetch from the RenderJob model via an API
    const fetchBriefing = async () => {
      try {
        const res = await fetch(`/api/admin/render/queue`);
        const data = await res.json();
        const job = data.data?.find((j: any) => j.jobId === id || j._id === id);
        if (job) setBriefingData(job);
      } catch (err) {
        console.error("Failed to load briefing:", err);
      }
      setLoading(false);
    };
    fetchBriefing();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-slate-200">
      {/* Premium Header */}
      <header className="border-b border-slate-100 py-8 px-8">
        <div className="max-w-6xl mx-auto flex justify-between items-end">
          <div className="space-y-1">
            <h1 className="text-sm font-bold uppercase tracking-[0.3em] text-slate-400">Executive Summary</h1>
            <p className="text-3xl font-light tracking-tight text-slate-900">
              Property Analysis <span className="font-semibold">Report</span>
            </p>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Prepared for</p>
            <p className="text-sm font-medium text-slate-600">Private Client</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto py-16 px-8 grid grid-cols-1 lg:grid-cols-12 gap-16">
        {/* Video Analysis View */}
        <div className="lg:col-span-8 space-y-8">
          <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden shadow-2xl shadow-slate-200">
            {briefingData?.outputUrl ? (
              <video 
                src={briefingData.outputUrl} 
                controls 
                autoPlay 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 font-medium italic">
                Video report is being finalized...
              </div>
            )}
          </div>
          
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">Market Analysis & Overview</h2>
            <p className="text-slate-600 leading-relaxed text-lg font-light">
              This property has been identified as a strong opportunity within the current North Texas market cycle.
              Our analysis focuses on structural integrity, lifestyle integration, and long-term equity growth potential.
            </p>
          </div>
        </div>

        {/* Action & Data Sidebar */}
        <div className="lg:col-span-4 space-y-12">
          <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 space-y-8">
            <div className="space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Property Highlights</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-600 shadow-sm border border-slate-100">
                    <FaChartLine size={14} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">Equity Potential</p>
                    <p className="text-sm font-medium">Strong Growth Curve</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-600 shadow-sm border border-slate-100">
                    <FaMapMarkerAlt size={14} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">Location Value</p>
                    <p className="text-sm font-medium">Prime Sub-Market</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-200 space-y-4">
              <button className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-sm tracking-tight hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
                Schedule Private Viewing
              </button>
              <button className="w-full py-4 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm tracking-tight hover:bg-slate-50 transition-all">
                Download Full Property PDF
              </button>
            </div>
          </div>

          <div className="px-4 space-y-4">
            <div className="flex items-center gap-2 text-slate-400">
              <FaFileContract size={12} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Confidential Report</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              This report is prepared exclusively for the intended recipient. Data is sourced from NTREIS and proprietary market models. 
              Market values are subject to change.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-100 py-12 px-8 mt-24">
        <div className="max-w-6xl mx-auto flex justify-between items-center opacity-40">
          <p className="text-[10px] font-bold uppercase tracking-widest">Sunset Pulse // Property Research</p>
          <p className="text-[10px] font-medium">(c) 2026 Tahsin Reza</p>
        </div>
      </footer>
    </div>
  );
};

export default PropertyBriefing;

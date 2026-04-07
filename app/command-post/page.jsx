'use client';

import { useState, useEffect } from 'react';
import Spinner from '@/components/Spinner';
import { toast } from 'react-toastify';
import { supabase } from '@/lib/supabase';
import LeadPipelineBoard from '@/components/LeadPipelineBoard';
import StrategicOverview from '@/components/admin/StrategicOverview';
import TopPriorityIntercept from '@/components/admin/TopPriorityIntercept';
import IntelligenceGrid from '@/components/admin/IntelligenceGrid';
import LeadIntelligenceGrid from '@/components/admin/LeadIntelligenceGrid';
import IntelligenceRecap from '@/components/IntelligenceRecap';

const CommandPostPage = () => {
  const [leads, setLeads] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState(null);
  const [bottomLeftMode, setBottomLeftMode] = useState('clusters'); 
  const [activeSprintId, setActiveSprintId] = useState(null);
  const [showPipeline, setShowPipeline] = useState(false);
  const [valuations, setValuations] = useState([]);
  const [dreams, setDreams] = useState([]);
  const [reengagingId, setReengagingId] = useState(null);

  const fetchAgentProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setAgent(profile);
    }
  };

  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/leads');
      if (res.status === 200) {
        const data = await res.json();
        setLeads(data);
      }
    } catch (error) {
      console.error('Lead fetch failed:', error);
    }
  };

  const fetchBookings = async () => {
    try {
      const res = await fetch('/api/bookings?role=agent');
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings);
      }
    } catch (error) {
      console.error('Bookings fetch failed:', error);
    }
  };

  const fetchValuations = async () => {
    try {
      const res = await fetch('/api/valuation');
      if (res.ok) {
        const data = await res.json();
        setValuations(data);
      }
    } catch (error) {
      console.error('Valuation fetch failed:', error);
    }
  };

  const fetchDreams = async () => {
    try {
      const res = await fetch('/api/jamie/dreams');
      if (res.ok) {
        const data = await res.json();
        setDreams(data);
      }
    } catch (error) {
      console.error('Dreams fetch failed:', error);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      await Promise.all([fetchAgentProfile(), fetchLeads(), fetchBookings(), fetchValuations(), fetchDreams()]);
      setLoading(false);
    };
    loadAll();
  }, []);

  const handleReengage = async (leadId) => {
    setReengagingId(leadId);
    try {
      const res = await fetch('/api/leads/reengage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId })
      });
      if (res.ok) {
        toast.success("Intel Hooks Generated.");
        fetchLeads();
      }
    } catch (error) {
      toast.error("Re-engagement protocol failed.");
    } finally {
      setReengagingId(null);
    }
  };

  const topPriority = leads.length > 0 ? leads.reduce((prev, current) => 
    (prev.probability > current.probability) ? prev : current, leads[0]) : null;

  const groupedLeads = leads.reduce((acc, lead) => {
    const propId = lead.property?._id || 'unknown';
    if (!acc[propId]) {
      acc[propId] = {
        name: lead.property?.name || 'Unknown Property',
        monthlyRate: lead.property?.rates?.monthly || lead.property?.rates?.nightly * 30 || 0,
        leads: []
      };
    }
    acc[propId].leads.push(lead);
    return acc;
  }, {});

  if (loading) return <Spinner loading={loading} />;

  return (
    <div className='min-h-screen bg-slate-950 text-white relative overflow-hidden font-sans selection:bg-blue-600 selection:text-white'>
      
      <IntelligenceRecap />

      {/* Global Pipeline Overlay */}
      {showPipeline && (
        <div className='absolute inset-0 z-[100] bg-slate-950 p-8 overflow-y-auto animate-in fade-in zoom-in duration-300'>
          <div className='flex justify-between items-center mb-10'>
            <div>
              <h1 className='text-5xl font-black italic tracking-tighter text-blue-400'>Asset Pipeline</h1>
              <p className='text-[10px] font-mono text-slate-500 uppercase tracking-[0.5em] mt-2'>Grid State: Synchronized</p>
            </div>
            <button 
              onClick={() => setShowPipeline(false)}
              className='bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95'
            >
              Close Grid
            </button>
          </div>
          <LeadPipelineBoard />
        </div>
      )}

      <div className={`h-screen grid grid-cols-1 md:grid-cols-2 grid-rows-2 transition-all duration-500 ${showPipeline ? 'blur-2xl scale-110 pointer-events-none' : ''}`}>
        
        <StrategicOverview 
          agent={agent}
          leadsCount={leads.length}
          residentialCount={leads.filter(l => l.leadCategory === 'Residential').length}
          rvCount={leads.filter(l => l.leadCategory === 'RV').length}
          onShowPipeline={() => setShowPipeline(true)}
          onSprintCreated={(id) => {
            setActiveSprintId(id);
            setBottomLeftMode('sprints');
          }}
        />

        <TopPriorityIntercept 
          topPriority={topPriority}
          onReengage={handleReengage}
        />

        <IntelligenceGrid 
          bottomLeftMode={bottomLeftMode}
          setBottomLeftMode={setBottomLeftMode}
          groupedLeads={groupedLeads}
          valuations={valuations}
          dreams={dreams}
          bookings={bookings}
          activeSprintId={activeSprintId}
        />

        <div className='p-8 bg-[var(--br-bg)] transition-all duration-500 overflow-y-auto'>
          <LeadIntelligenceGrid 
            leads={leads}
            onReengage={handleReengage}
            reengagingId={reengagingId}
          />
        </div>

      </div>
    </div>
  );
};

export default CommandPostPage;

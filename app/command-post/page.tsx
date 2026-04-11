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

// --- Interfaces for Type Safety ---
interface Lead {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  probability: number;
  status: string;
  leadCategory: 'Residential' | 'RV' | string;
  property?: {
    _id: string;
    name: string;
    rates?: {
      monthly?: number;
      nightly?: number;
    };
  };
  tags?: string[];
}

interface Booking {
  _id: string;
  lead: string;
  property: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  status: string;
}

interface Valuation {
  _id: string;
  property_id: string;
  value: number;
  confidence: number;
  timestamp: string;
}

interface Dream {
  _id: string;
  title: string;
  insight: string;
  priority: number;
}

interface AgentProfile {
  id: string;
  full_name: string;
  avatar_url?: string;
  role: string;
  is_subscribed: boolean;
}

type BottomLeftMode = 'clusters' | 'recon' | 'dreams' | 'sprints' | 'timeline' | 'deployments';

const CommandPostPage: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [bottomLeftMode, setBottomLeftMode] = useState<BottomLeftMode>('clusters');
  const [activeSprintId, setActiveSprintId] = useState<string | null>(null);
  const [showPipeline, setShowPipeline] = useState<boolean>(false);
  const [valuations, setValuations] = useState<Valuation[]>([]);
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [reengagingId, setReengagingId] = useState<string | null>(null);

  const fetchAgentProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setAgent(profile as AgentProfile);
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

  const handleReengage = async (leadId: string) => {
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

  const groupedLeads = leads.reduce<Record<string, { name: string; monthlyRate: number; leads: Lead[] }>>((acc, lead) => {
    const propId = lead.property?._id || 'unknown';
    if (!acc[propId]) {
      acc[propId] = {
        name: lead.property?.name || 'Unknown Property',
        monthlyRate: lead.property?.rates?.monthly || (lead.property?.rates?.nightly ? lead.property.rates.nightly * 30 : 0),
        leads: []
      };
    }
    acc[propId].leads.push(lead);
    return acc;
  }, {});

  const [demoLocation, setDemoLocation] = useState<string>('Decatur');
  const [demoChange, setDemoChange] = useState<string>('+18%');

  const triggerDemo = async (action: 'seed' | 'anomaly') => {
    const id = toast.loading(`Executing ${action.toUpperCase()} protocol...`);
    try {
      const body: { action: string; location?: string; change?: string } = { action };
      if (action === 'anomaly') {
        body.location = demoLocation;
        body.change = demoChange;
      }

      const res = await fetch('/api/demo/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        toast.update(id, { render: `${action.toUpperCase()} SUCCESS`, type: "success", isLoading: false, autoClose: 3000 });
        setTimeout(fetchLeads, 2000);
      }
    } catch (error) {
      toast.update(id, { render: "PROTOCOL FAILED", type: "error", isLoading: false, autoClose: 3000 });
    }
  };

  if (loading) return <Spinner loading={loading} />;

  return (
    <div className='min-h-screen bg-slate-950 text-white relative overflow-hidden font-sans selection:bg-blue-600 selection:text-white'>
      
      <IntelligenceRecap />

      {/* Tactical Demo Controller (Configurable) */}
      <div className='fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 bg-black/80 backdrop-blur-3xl p-4 rounded-3xl border border-white/10 shadow-2xl scale-90 hover:scale-100 transition-all group'>
        <div className='flex items-center gap-3 mb-2 px-1'>
          <div className='flex flex-col'>
            <span className='text-[7px] font-black text-slate-500 uppercase tracking-widest'>Target Location</span>
            <input 
              type="text" 
              value={demoLocation}
              onChange={(e) => setDemoLocation(e.target.value)}
              className='bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-[10px] font-bold focus:outline-none focus:border-blue-500 transition-all w-24'
              placeholder="e.g. Decatur"
            />
          </div>
          <div className='flex flex-col'>
            <span className='text-[7px] font-black text-slate-500 uppercase tracking-widest'>Delta %</span>
            <input 
              type="text" 
              value={demoChange}
              onChange={(e) => setDemoChange(e.target.value)}
              className='bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-[10px] font-bold focus:outline-none focus:border-blue-500 transition-all w-16'
              placeholder="+10%"
            />
          </div>
        </div>
        
        <div className='flex gap-2'>
          <button 
            onClick={() => triggerDemo('seed')}
            className='flex-grow px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/5 transition-all'
          >
            Sync Grid
          </button>
          <button 
            onClick={() => triggerDemo('anomaly')}
            className='flex-grow px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-400 transition-all shadow-lg shadow-blue-900/40'
          >
            Trigger Anomaly
          </button>
        </div>
      </div>

      {/* Global Pipeline Overlay */}
      {showPipeline && (
        <div className='absolute inset-0 z-[100] bg-slate-950 p-8 overflow-y-auto animate-in fade-in zoom-in duration-300'>
          <div className='flex justify-between items-center mb-10'>
            <div>
              <h1 className='text-5xl font-black italic tracking-tighter text-blue-400'>Property Pipeline</h1>
              <p className='text-[10px] font-mono text-slate-500 uppercase tracking-[0.5em] mt-2'>System: Synchronized</p>
            </div>
            <button 
              onClick={() => setShowPipeline(false)}
              className='bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95'
            >
              Close Pipeline
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
          onSprintCreated={(id: string) => {
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
          setBottomLeftMode={setBottomLeftMode as (mode: string) => void}
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

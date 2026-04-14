'use client';

import { useState, useEffect } from 'react';
import Spinner from '@/components/Spinner';
import { supabase } from '@/lib/supabase';
import StrategicOverview from '@/components/admin/StrategicOverview';
import PriorityEngagement from '@/components/admin/PriorityEngagement';
import DataInsightsGrid from '@/components/admin/DataInsightsGrid';
import LeadInsightsGrid from '@/components/admin/LeadInsightsGrid';
import JamieActivityRecap from '@/components/JamieActivityRecap';
import DemoController from '@/components/admin/DemoController';
import PipelineOverlay from '@/components/admin/PipelineOverlay';

//  Type Safety 
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
  reengagementHook?: any;
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

interface Insight {
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

type BottomLeftMode = 'clusters' | 'valuations' | 'insights' | 'jamie-sprints' | 'timeline' | 'activity';

const DashboardPage: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [bottomLeftMode, setBottomLeftMode] = useState<BottomLeftMode>('clusters');
  const [activeSprintId, setActiveSprintId] = useState<string | null>(null);
  const [showPipeline, setShowPipeline] = useState<boolean>(false);
  const [valuations, setValuations] = useState<Valuation[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);

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

  const fetchInsights = async () => {
    try {
      const res = await fetch('/api/jamie/dreams');
      if (res.ok) {
        const data = await res.json();
        setInsights(data);
      }
    } catch (error) {
      console.error('Insights fetch failed:', error);
    }
  };

  const loadAll = async () => {
    await Promise.all([fetchAgentProfile(), fetchLeads(), fetchBookings(), fetchValuations(), fetchInsights()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

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

  if (loading) return <Spinner loading={loading} />;

  return (
    <div className='min-h-screen bg-slate-950 text-white relative overflow-hidden font-sans selection:bg-blue-600 selection:text-white'>
      
      <JamieActivityRecap />

      <DemoController onRefreshLeads={fetchLeads} />

      <PipelineOverlay isOpen={showPipeline} onClose={() => setShowPipeline(false)} />

      <div className={`h-screen grid grid-cols-1 md:grid-cols-2 grid-rows-2 transition-all duration-500 ${showPipeline ? 'blur-2xl scale-110 pointer-events-none' : ''}`}>
        
        <StrategicOverview 
          agent={agent}
          leadsCount={leads.length}
          residentialCount={leads.filter(l => l.leadCategory === 'Residential').length}
          rvCount={leads.filter(l => l.leadCategory === 'RV').length}
          onShowPipeline={() => setShowPipeline(true)}
          onSprintCreated={(id: string) => {
            setActiveSprintId(id);
            setBottomLeftMode('jamie-sprints');
          }}
        />

        <PriorityEngagement 
          topPriority={topPriority}
          onRefreshLeads={fetchLeads}
        />

        <DataInsightsGrid 
          bottomLeftMode={bottomLeftMode}
          setBottomLeftMode={setBottomLeftMode as (mode: string) => void}
          groupedLeads={groupedLeads}
          valuations={valuations}
          insights={insights}
          bookings={bookings}
          activeSprintId={activeSprintId}
        />

        <div className='p-8 bg-[var(--br-bg)] transition-all duration-500 overflow-y-auto'>
          <LeadInsightsGrid 
            leads={leads}
            onRefreshLeads={fetchLeads}
          />
        </div>

      </div>
    </div>
  );
};

export default DashboardPage;

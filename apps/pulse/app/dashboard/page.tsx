'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowUpRight, CreditCard, Loader2 } from 'lucide-react';
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

interface MySiteSummary {
  setupUrl: string;
  reviewStatus: string;
  billingStatus: string;
  trialEndsAt?: string;
  gracePeriodEndsAt?: string;
  billingStatusChangedAt?: string;
  publicUrl: string;
  readyToPublish: boolean;
  kit: {
    status: string;
    branding: {
      siteName: string;
    };
  };
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
  const [mySite, setMySite] = useState<MySiteSummary | null>(null);
  const [billingLoading, setBillingLoading] = useState<boolean>(false);

  const fetchAgentProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setAgent(profile as AgentProfile);
    }
  }, []);

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch('/api/leads');
      if (res.status === 200) {
        const data = await res.json();
        setLeads(data);
      }
    } catch (error) {
      console.error('Lead fetch failed:', error);
    }
  }, []);

  const fetchBookings = useCallback(async () => {
    try {
      const res = await fetch('/api/bookings?role=agent');
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings);
      }
    } catch (error) {
      console.error('Bookings fetch failed:', error);
    }
  }, []);

  const fetchValuations = useCallback(async () => {
    try {
      const res = await fetch('/api/valuation');
      if (res.ok) {
        const data = await res.json();
        setValuations(data);
      }
    } catch (error) {
      console.error('Valuation fetch failed:', error);
    }
  }, []);

  const fetchInsights = useCallback(async () => {
    try {
      const res = await fetch('/api/jamie/dreams');
      if (res.ok) {
        const data = await res.json();
        setInsights(data);
      }
    } catch (error) {
      console.error('Insights fetch failed:', error);
    }
  }, []);

  const fetchMySite = useCallback(async () => {
    try {
      const res = await fetch('/api/onboarding/my-site');
      if (res.ok) {
        const body = await res.json();
        setMySite(body.data?.site || null);
      }
    } catch (error) {
      console.error('Site summary fetch failed:', error);
    }
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([fetchAgentProfile(), fetchLeads(), fetchBookings(), fetchValuations(), fetchInsights(), fetchMySite()]);
    setLoading(false);
  }, [fetchAgentProfile, fetchLeads, fetchBookings, fetchValuations, fetchInsights, fetchMySite]);

  const openBillingPortal = useCallback(async () => {
    setBillingLoading(true);

    try {
      const response = await fetch('/api/billing/site-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const body = await response.json();

      if (!response.ok || body.error) {
        throw new Error(body.message || 'Billing portal is unavailable.');
      }

      window.location.href = body.data.url;
    } catch (error) {
      console.error('Billing portal failed:', error);
      setBillingLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const topPriority = leads.length > 0 ? leads.reduce((prev, current) => 
    (prev.probability > current.probability) ? prev : current, leads[0]) : null;
  const billingNeedsAttention = mySite ? needsBillingAttention(mySite.billingStatus) : false;

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

      {mySite ? (
        <aside className="absolute right-4 top-20 z-20 w-[min(360px,calc(100vw-2rem))] border border-cyan-300/20 bg-slate-950/90 p-4 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">My Site</p>
              <h2 className="mt-2 text-lg font-black text-white">{mySite.kit.branding.siteName}</h2>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                {mySite.kit.status} · {formatBillingStatus(mySite.billingStatus)} · {mySite.reviewStatus}
              </p>
            </div>
            <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-black uppercase text-slate-300">
              {mySite.readyToPublish ? 'Ready' : 'Setup'}
            </span>
          </div>
          <div className={`mt-4 border p-3 text-xs leading-5 ${billingNeedsAttention ? 'border-amber-300/25 bg-amber-300/10 text-amber-100' : 'border-white/10 bg-slate-900/60 text-slate-300'}`}>
            <p className="font-black uppercase tracking-[0.14em]">
              Billing: {formatBillingStatus(mySite.billingStatus)}
            </p>
            <p className="mt-1">{billingStatusMessage(mySite)}</p>
            {mySite.trialEndsAt ? (
              <p className="mt-2 text-slate-400">Trial ends: {formatShortDate(mySite.trialEndsAt)}</p>
            ) : null}
            {mySite.gracePeriodEndsAt ? (
              <p className="mt-1 text-slate-400">Grace ends: {formatShortDate(mySite.gracePeriodEndsAt)}</p>
            ) : null}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={mySite.setupUrl} className="inline-flex items-center gap-2 bg-cyan-300 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-950">
              Setup
              <ArrowUpRight size={13} />
            </Link>
            {mySite.kit.status === 'active' ? (
              <Link href={mySite.publicUrl} className="inline-flex items-center gap-2 border border-white/15 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white">
                View
                <ArrowUpRight size={13} />
              </Link>
            ) : null}
            <button
              type="button"
              onClick={openBillingPortal}
              disabled={billingLoading}
              className={`inline-flex items-center gap-2 border px-3 py-2 text-xs font-black uppercase tracking-[0.12em] disabled:opacity-50 ${
                billingNeedsAttention
                  ? 'border-amber-200 bg-amber-200 text-slate-950'
                  : 'border-white/15 text-white'
              }`}
            >
              {billingLoading ? <Loader2 className="animate-spin" size={13} /> : <CreditCard size={13} />}
              {billingNeedsAttention ? 'Fix Billing' : 'Billing'}
            </button>
          </div>
        </aside>
      ) : null}

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

function needsBillingAttention(status: string) {
  return status === 'past_due' || status === 'unpaid' || status === 'canceled' || status === 'incomplete';
}

function formatBillingStatus(status: string) {
  return (status || 'unknown').replace(/_/g, ' ');
}

function billingStatusMessage(site: MySiteSummary) {
  if (site.billingStatus === 'trialing') return 'Your 90-day trial is active. Keep setup moving while review checks finish.';
  if (site.billingStatus === 'active') return 'Billing is current. Publishing depends on buyer-safe setup and operator approval.';
  if (site.billingStatus === 'past_due') return site.gracePeriodEndsAt
    ? 'Payment needs attention. Your site may stay live during grace, but publishing stays locked.'
    : 'Payment needs attention. Publishing is locked until billing recovers.';
  if (site.billingStatus === 'unpaid') return 'Billing is unpaid and the site is suspended until payment recovers.';
  if (site.billingStatus === 'canceled') return 'The subscription ended. Restart billing to restore site access.';
  if (site.billingStatus === 'incomplete') return 'Checkout is incomplete. Finish billing before launch.';
  return 'Billing is being reviewed by Sunset Pulse.';
}

function formatShortDate(value?: string) {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Not set';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

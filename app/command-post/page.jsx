'use client';
import { useState, useEffect } from 'react';
import { FaUser, FaEnvelope, FaPhone, FaHome, FaGripLines, FaCrosshairs, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import Spinner from '@/components/Spinner';
import { toast } from 'react-toastify';

const CommandPostPage = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const res = await fetch('/api/leads');
        if (res.status === 200) {
          const data = await res.json();
          setLeads(data);
        } else {
          setLeads(getMockLeads());
        }
      } catch (error) {
        console.error(error);
        setLeads(getMockLeads());
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, []);

  const getMockLeads = () => [
    {
      _id: 'l1',
      name: 'Agent Maverick',
      email: 'maverick@recon.io',
      phone: '214-555-0199',
      idxViewed: true,
      probability: 95,
      jamieNotes: 'High-intent buyer. Spent 15 mins on the Rhome listing. Mentioned the Grill burger in chat.',
      property: { _id: 'p1', name: 'Rhome Commuter Cottage', rates: { monthly: 1200 } },
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'l2',
      name: 'Sarah Connor',
      email: 'sarah@skynet.com',
      phone: '817-555-0101',
      idxViewed: false,
      probability: 45,
      jamieNotes: 'Browsing multiple areas. Looking for security features.',
      property: { _id: 'p2', name: 'Bowie Highway Ranch Estate', rates: { monthly: 2500 } },
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'l3',
      name: 'John Wick',
      email: 'pencil@continental.com',
      phone: '940-555-7777',
      idxViewed: true,
      probability: 80,
      jamieNotes: 'Focused on the shop space. Needs room for "equipment".',
      property: { _id: 'p1', name: 'Rhome Commuter Cottage', rates: { monthly: 1200 } },
      createdAt: new Date().toISOString(),
    }
  ];

  const topPriority = leads.reduce((prev, current) => 
    (prev.probability > current.probability) ? prev : current, leads[0] || {});

  const groupedLeads = leads.reduce((acc, lead) => {
    const propId = lead.property?._id || 'unknown';
    if (!acc[propId]) {
      acc[propId] = {
        name: lead.property?.name || 'Unknown Property',
        monthlyRate: lead.property?.rates?.monthly || 0,
        leads: []
      };
    }
    acc[propId].leads.push(lead);
    return acc;
  }, {});

  if (loading) return <Spinner loading={loading} />;

  return (
    <div className='min-h-screen grid grid-cols-1 md:grid-cols-2 grid-rows-2 transition-all duration-500'>
      
      {/* TOP LEFT QUADRANT (Strategic Overview) */}
      <div className='p-8 border-r border-b border-white/5 bg-[var(--tl-bg)] text-[var(--tl-color)] transition-all duration-500 overflow-y-auto'>
        <header className='mb-8'>
          <h1 className='text-4xl font-black tracking-tighter uppercase italic text-[var(--primary-color)]'>
            Command Post
          </h1>
          <p className='opacity-50 font-mono text-xs mt-1'>[ STRATEGIC OVERVIEW ]</p>
        </header>
        
        <div className='bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10'>
          <div className='text-xs uppercase tracking-widest opacity-50 mb-4 font-bold'>Captured Intel Assets</div>
          <div className='text-6xl font-mono'>{leads.length}</div>
          <div className='mt-4 flex gap-2'>
            <span className='bg-green-500/20 text-green-400 text-[10px] px-2 py-1 rounded-full font-bold uppercase'>Grid: Active</span>
            <span className='bg-blue-500/20 text-blue-400 text-[10px] px-2 py-1 rounded-full font-bold uppercase'>Agent: Jamie</span>
          </div>
        </div>
      </div>

      {/* TOP RIGHT QUADRANT (Jamie's Top Priority) */}
      <div className='p-8 border-b border-white/5 bg-[var(--tr-bg)] text-[var(--tr-color)] transition-all duration-500 overflow-y-auto'>
        <div className='flex items-center gap-2 mb-6'>
          <FaExclamationCircle className='text-[var(--primary-color)]' />
          <h2 className='text-xs font-black uppercase tracking-widest opacity-50'>Top Priority Intercept</h2>
        </div>

        {topPriority && (
          <div className='space-y-4'>
            <h3 className='text-3xl font-black leading-tight'>{topPriority.name}</h3>
            <div className='flex gap-4 opacity-70'>
              <span className='flex items-center gap-2 text-xs'><FaEnvelope size={10} /> {topPriority.email}</span>
              <span className='flex items-center gap-2 text-xs'><FaPhone size={10} /> {topPriority.phone}</span>
            </div>
            <div className='bg-[var(--primary-color)] text-white p-4 rounded-xl shadow-lg'>
              <p className='text-sm italic font-serif'>"{topPriority.jamieNotes}"</p>
            </div>
            <div className='pt-2'>
              <div className='text-[10px] uppercase font-bold opacity-50 mb-1'>Closing Probability</div>
              <div className='text-4xl font-black text-green-400'>{topPriority.probability}%</div>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM LEFT QUADRANT (Property Clusters) */}
      <div className='p-8 border-r border-white/5 bg-[var(--bl-bg)] text-[var(--bl-color)] transition-all duration-500 overflow-y-auto'>
        <div className='flex items-center gap-2 mb-6'>
          <FaHome className='opacity-50' />
          <h2 className='text-xs font-black uppercase tracking-widest opacity-50'>Intelligence Clusters</h2>
        </div>
        
        <div className='space-y-6'>
          {Object.values(groupedLeads).map((group, idx) => (
            <div key={idx} className='group cursor-pointer'>
              <div className='flex justify-between items-end mb-2'>
                <h4 className='text-sm font-bold uppercase tracking-tight'>{group.name}</h4>
                <span className='text-[10px] font-mono text-green-400'>${(group.monthlyRate * 0.1).toFixed(0)} PROJ. FEE</span>
              </div>
              <div className='w-full bg-white/5 h-1 rounded-full overflow-hidden'>
                <div className='bg-[var(--primary-color)] h-full w-2/3 opacity-50 group-hover:opacity-100 transition-all' />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BOTTOM RIGHT QUADRANT (Lead Recon Detail) */}
      <div className='p-8 bg-[var(--br-bg)] text-[var(--br-color)] transition-all duration-500 overflow-y-auto'>
        <div className='flex items-center gap-2 mb-6'>
          <FaCrosshairs className='opacity-50' />
          <h2 className='text-xs font-black uppercase tracking-widest opacity-50'>Lead Recon Feed</h2>
        </div>

        <div className='grid grid-cols-1 gap-4'>
          {leads.map((lead) => (
            <div key={lead._id} className='bg-white/5 border border-white/10 p-4 rounded-xl flex justify-between items-center hover:bg-white/10 transition-colors'>
              <div>
                <div className='text-sm font-bold'>{lead.name}</div>
                <div className='text-[10px] opacity-50'>{lead.email}</div>
              </div>
              {lead.idxViewed && (
                <span className='text-[8px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-black uppercase'>IDX</span>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default CommandPostPage;

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
          // If unauthorized or error, we'll use mock data for the demo
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

  // Logic for Jamie's Top Priority
  const topPriority = leads.reduce((prev, current) => 
    (prev.probability > current.probability) ? prev : current, leads[0] || {});

  // Group leads by property
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
    <div className='min-h-screen bg-[#020617] text-slate-100 p-8 font-sans'>
      <header className='mb-12 border-b border-slate-800/50 pb-6 flex justify-between items-end'>
        <div>
          <h1 
            className='text-5xl font-black tracking-tighter uppercase italic'
            style={{ color: 'var(--primary-color)' }}
          >
            Command Post
          </h1>
          <p className='text-slate-500 font-mono text-xs mt-2 tracking-widest'>
            [ SYSTEM STATUS: <span className='text-green-500 animate-pulse'>OPERATIONAL</span> // AGENT: JAMIE ]
          </p>
        </div>
        <div className='text-right'>
          <div className='text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1 font-bold'>Total Leads Captured</div>
          <div className='text-4xl font-mono text-white leading-none'>{leads.length}</div>
        </div>
      </header>

      {/* JAMIE'S TOP PRIORITY */}
      {topPriority && (
        <section 
          className='mb-12 rounded-3xl p-[1px] shadow-2xl transform hover:scale-[1.005] transition-transform duration-500'
          style={{ background: 'linear-gradient(to right, var(--primary-color), transparent)' }}
        >
          <div className='bg-slate-950/90 backdrop-blur-xl rounded-[23px] p-8 relative overflow-hidden'>
            <div className='absolute top-0 right-0 p-4 opacity-5'>
              <FaCrosshairs size={150} />
            </div>
            
            <div className='flex items-center gap-3 mb-8'>
              <div 
                className='p-2 rounded-lg shadow-lg'
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                <FaExclamationCircle className='text-white' />
              </div>
              <h2 
                className='text-sm font-bold uppercase tracking-[0.3em]'
                style={{ color: 'var(--primary-color)' }}
              >
                Jamie's Top Priority
              </h2>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10'>
              <div>
                <h3 className='text-5xl font-black mb-4 tracking-tight'>{topPriority.name}</h3>
                <div className='flex flex-wrap gap-6 mb-8'>
                  <span className='flex items-center gap-2 text-slate-400 text-xs font-mono'>
                    <FaEnvelope className='text-slate-600' size={14} /> {topPriority.email}
                  </span>
                  <span className='flex items-center gap-2 text-slate-400 text-xs font-mono'>
                    <FaPhone className='text-slate-600' size={14} /> {topPriority.phone}
                  </span>
                </div>
                <div className='bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/10 italic font-serif text-lg text-slate-300'>
                  "{topPriority.jamieNotes}"
                </div>
              </div>
              
              <div className='flex flex-col justify-center items-end'>
                <div className='text-right mb-8'>
                  <div className='text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-2'>Probability to Close</div>
                  <div className='text-8xl font-black text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.3)]'>{topPriority.probability}<span className='text-4xl'>%</span></div>
                </div>
                <button 
                  className='hover:opacity-90 text-white px-10 py-4 rounded-full font-black uppercase tracking-[0.2em] shadow-2xl transition-all hover:translate-y-[-2px] active:translate-y-[0px]'
                  style={{ backgroundColor: 'var(--primary-color)' }}
                >
                  Intercept Lead Now
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* LEAD GRID BY PROPERTY */}
      <div className='grid grid-cols-1 gap-12'>
        {Object.values(groupedLeads).map((group, idx) => (
          <div key={idx} className='bg-slate-900/40 rounded-[2rem] p-10 border border-slate-800/50 backdrop-blur-sm'>
            <div className='flex justify-between items-center mb-10'>
              <div className='flex items-center gap-5'>
                <div className='bg-slate-800/80 p-4 rounded-2xl border border-slate-700/50'>
                  <FaHome style={{ color: 'var(--primary-color)' }} size={28} />
                </div>
                <div>
                  <h3 className='text-3xl font-bold text-white tracking-tight'>{group.name}</h3>
                  <p className='text-slate-500 text-[10px] uppercase tracking-[0.2em] font-black mt-1'>Property Intelligence Cluster</p>
                </div>
              </div>
              <div className='text-right'>
                <div className='text-[10px] uppercase text-slate-500 font-bold mb-2 tracking-widest'>Projected Compensation</div>
                <div className='text-3xl font-mono text-green-400 font-bold'>
                  ${(group.monthlyRate * 0.1).toFixed(2)} <span className='text-xs text-slate-600 ml-1'>(10% FEE)</span>
                </div>
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
              {group.leads.map((lead) => (
                <div key={lead._id} className='glassmorphism-card p-8 rounded-3xl relative group hover:border-white/20 transition-all duration-300'>
                  <div className='flex justify-between items-start mb-6'>
                    <h4 className='text-xl font-bold tracking-tight'>{lead.name}</h4>
                    {lead.idxViewed ? (
                      <span className='bg-green-500/10 text-green-400 text-[9px] px-3 py-1 rounded-full font-black uppercase border border-green-500/20 tracking-tighter'>
                        IDX Viewed
                      </span>
                    ) : (
                      <span className='bg-slate-800 text-slate-500 text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-tighter'>
                        New Recon
                      </span>
                    )}
                  </div>
                  
                  <div className='space-y-3 mb-8'>
                    <div className='text-xs text-slate-400 flex items-center gap-3 font-mono'>
                      <FaEnvelope className='text-slate-600' /> {lead.email}
                    </div>
                    <div className='text-xs text-slate-400 flex items-center gap-3 font-mono'>
                      <FaPhone className='text-slate-600' /> {lead.phone}
                    </div>
                  </div>

                  <div className='w-full bg-slate-800/50 h-2 rounded-full overflow-hidden mb-3'>
                    <div 
                      className='h-full transition-all duration-1000 ease-out' 
                      style={{ 
                        width: `${lead.probability}%`,
                        backgroundColor: 'var(--primary-color)',
                        boxShadow: '0 0 10px var(--primary-color)'
                      }}
                    />
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-[9px] uppercase text-slate-500 font-black tracking-widest'>Conversion Odds</span>
                    <span className='text-[10px] font-bold text-white'>{lead.probability}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CommandPostPage;

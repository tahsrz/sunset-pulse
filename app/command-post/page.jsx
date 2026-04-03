'use client';
import { useState, useEffect } from 'react';
import { 
  FaUser, FaEnvelope, FaPhone, FaHome, FaGripLines, 
  FaCrosshairs, FaCheckCircle, FaExclamationCircle, 
  FaBolt, FaUndo, FaClock, FaTag, FaRv, FaBuilding
} from 'react-icons/fa';
import Spinner from '@/components/Spinner';
import { toast } from 'react-toastify';

const CommandPostPage = () => {
  const [leads, setLeads] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [bottomLeftMode, setBottomLeftMode] = useState('clusters'); // 'clusters', 'recon', 'dreams', or 'deployments'
  const [valuations, setValuations] = useState([]);
  const [dreams, setDreams] = useState([]);

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
    }
  };

  const fetchBookings = async () => {
    try {
      const res = await fetch('/api/bookings?role=agent');
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings);
      } else {
        setBookings(getMockBookings());
      }
    } catch (error) {
      console.error(error);
      setBookings(getMockBookings());
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
      await Promise.all([fetchLeads(), fetchBookings(), fetchValuations(), fetchDreams()]);
      setLoading(false);
    };
    loadAll();
  }, []);

  const [reengagingId, setReengagingId] = useState(null);

  const handleReengage = async (leadId) => {
    setReengagingId(leadId);
    try {
      const res = await fetch('/api/leads/reengage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId })
      });
      if (res.ok) {
        const data = await res.json();
        toast.success("Intel Hooks Generated.");
        // Refresh leads
        fetchLeads();
      }
    } catch (error) {
      toast.error("Re-engagement protocol failed.");
    } finally {
      setReengagingId(null);
    }
  };

  const sendHook = (lead, type) => {
    const hook = lead.reengagementHook[type.toLowerCase()];
    if (hook) {
      toast.success(`Protocol ${type} Engaged: ${hook}`);
      // Here you would trigger actual email/SMS via API
    } else {
      toast.error(`Protocol ${type} not found for this lead.`);
    }
  };

  const AlphabetGrid = ({ lead }) => (
    <div className='flex flex-wrap gap-1 mt-2 max-w-[180px]'>
      {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(char => (
        <button
          key={char}
          onClick={() => sendHook(lead, char)}
          className={`w-5 h-5 flex items-center justify-center text-[7px] font-black rounded border transition-all ${
            lead.reengagementHook?.[char.toLowerCase()] 
              ? 'bg-blue-600 border-blue-400 text-white hover:bg-blue-500' 
              : 'bg-white/5 border-white/10 text-white/20 cursor-not-allowed'
          }`}
          title={lead.reengagementHook?.[char.toLowerCase()] || `Protocol ${char} Offline`}
          disabled={!lead.reengagementHook?.[char.toLowerCase()]}
        >
          {char}
        </button>
      ))}
    </div>
  );

  const getMockLeads = () => [
  ];

  const getMockBookings = () => [
    {
      _id: 'b1',
      property: { name: 'Class A Luxury - Thor Windsport' },
      user: { username: 'RoadWarrior', email: 'travel@rv.com' },
      checkIn: new Date().toISOString(),
      checkOut: new Date(Date.now() + 86400000 * 5).toISOString(),
      totalPrice: 1125,
      status: 'Confirmed'
    },
    {
      _id: 'b2',
      property: { name: 'Bowie Highway Ranch' },
      user: { username: 'EstateSeeker', email: 'john@estates.com' },
      checkIn: new Date(Date.now() + 86400000 * 10).toISOString(),
      checkOut: new Date(Date.now() + 86400000 * 15).toISOString(),
      totalPrice: 2500,
      status: 'Pending'
    }
  ];

  const filteredLeads = leads.filter(l => {
    const statusMatch = filter === 'all' || l.status === filter;
    const categoryMatch = categoryFilter === 'all' || l.leadCategory === categoryFilter;
    return statusMatch && categoryMatch;
  });

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

  const [interestInput, setInterestInput] = useState('');

  const syncInterests = async () => {
    try {
      const res = await fetch('/api/user/interests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interests: interestInput })
      });
      if(res.ok) {
        toast.success("JAMIE_GRID: Intelligence Synchronized.");
        setInterestInput('');
      }
    } catch (error) {
      toast.error("Failed to sync intelligence grid.");
    }
  };

  if (loading) return <Spinner loading={loading} />;

  return (
    <div className='min-h-screen grid grid-cols-1 md:grid-cols-2 grid-rows-2 transition-all duration-500'>
      
      {/* TOP LEFT QUADRANT (Strategic Overview) WIP */}
      <div className='p-8 border-r border-b border-white/5 bg-[var(--tl-bg)] text-[var(--tl-color)] transition-all duration-500 overflow-y-auto'>
        <header className='mb-8 flex justify-between items-start'>
          <div>
            <h1 className='text-4xl font-black tracking-tighter uppercase italic text-[var(--primary-color)]'>
              Command Post
            </h1>
            <p className='opacity-50 font-mono text-xs mt-1'>[ STRATEGIC OVERVIEW ]</p>
          </div>
          <div className='flex gap-2'>
            <div className='bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-lg'>
              <div className='text-[8px] font-black uppercase text-blue-400'>Residential</div>
              <div className='text-lg font-mono font-bold'>{leads.filter(l => l.leadCategory === 'Residential').length}</div>
            </div>
            <div className='bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-lg'>
              <div className='text-[8px] font-black uppercase text-green-400'>RV Assets</div>
              <div className='text-lg font-mono font-bold'>{leads.filter(l => l.leadCategory === 'RV').length}</div>
            </div>
          </div>
        </header>
        
        <div className='bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10'>
          <div className='flex justify-between items-center mb-4'>
            <div className='text-xs uppercase tracking-widest opacity-50 font-bold'>Captured Intel Assets</div>
            <div className='flex gap-2'>
              <button onClick={() => setCategoryFilter('all')} className={`text-[8px] px-2 py-0.5 rounded-full font-black transition-all ${categoryFilter === 'all' ? 'bg-white text-slate-900' : 'bg-white/5 text-white/40'}`}>ALL</button>
              <button onClick={() => setCategoryFilter('Residential')} className={`text-[8px] px-2 py-0.5 rounded-full font-black transition-all ${categoryFilter === 'Residential' ? 'bg-blue-500 text-white' : 'bg-white/5 text-white/40'}`}>RES</button>
              <button onClick={() => setCategoryFilter('RV')} className={`text-[8px] px-2 py-0.5 rounded-full font-black transition-all ${categoryFilter === 'RV' ? 'bg-green-500 text-white' : 'bg-white/5 text-white/40'}`}>RV</button>
            </div>
          </div>
          <div className='text-6xl font-mono'>{leads.length}</div>
          <div className='mt-4 flex gap-4'>
            <button onClick={() => setFilter('all')} className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase transition-colors ${filter === 'all' ? 'bg-[var(--primary-color)] text-white' : 'bg-white/5 text-white/50'}`}>STATUS: ALL</button>
            <button onClick={() => setFilter('new')} className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase transition-colors ${filter === 'new' ? 'bg-green-500 text-white' : 'bg-white/5 text-white/50'}`}>NEW</button>
            <button onClick={() => setFilter('contacted')} className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase transition-colors ${filter === 'contacted' ? 'bg-blue-500 text-white' : 'bg-white/5 text-white/50'}`}>ENGAGED</button>
          </div>
        </div>

        {/* SUNSET PULSE OVERRIDE */}
        <div className='mt-8 bg-black/40 border border-[var(--primary-color)]/30 p-6 rounded-2xl relative overflow-hidden group'>
          <div className='absolute inset-0 bg-[var(--primary-color)]/5 opacity-0 group-hover:opacity-100 transition-opacity' />
          <div className='relative z-10'>
            <div className='flex items-center gap-2 mb-4'>
              <FaBolt className='text-[var(--primary-color)] animate-pulse' />
              <h2 className='text-xs font-black uppercase tracking-[0.2em] text-white'>Sunset Pulse Override</h2>
            </div>
            <textarea
              value={interestInput}
              onChange={(e) => setInterestInput(e.target.value)}
              placeholder="Inject new strategic interests into Jamie's spatial dream engine..."
              className='w-full bg-slate-950/50 border border-white/10 rounded-xl p-4 text-xs font-mono text-blue-400 placeholder:text-slate-600 focus:outline-none focus:border-[var(--primary-color)]/50 transition-all resize-none h-24 mb-4'
            />
            <button
              onClick={syncInterests}
              className='w-full bg-[var(--primary-color)] hover:bg-[var(--primary-color)]/80 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-lg shadow-[var(--primary-color)]/20 active:scale-95'
            >
              Sync Intel Grid
            </button>
          </div>
        </div>

        {/* SYSTEM INTELLIGENCE NOTE */}
        <div className='mt-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 backdrop-blur-sm relative overflow-hidden group hover:border-blue-500/30 transition-all'>
          <div className='absolute -right-2 -bottom-2 opacity-10 group-hover:scale-110 transition-transform'>
            <FaBrain size={40} className='text-blue-400' />
          </div>
          <p className='text-[9px] font-mono leading-relaxed text-blue-300/80 uppercase tracking-wider italic'>
            <span className='text-blue-400 font-black'>[ LOGIC_CORE_UPDATE ]</span> : Spatial dreams autonomously refine Jamie's logic gates and contextual interpretation of the current grid state.
          </p>
        </div>
      </div>

      {/* TOP RIGHT QUADRANT (Jamie's Top Priority) */}
      <div className='p-8 border-b border-white/5 bg-[var(--tr-bg)] text-[var(--tr-color)] transition-all duration-500 overflow-y-auto'>
        <div className='flex items-center justify-between mb-6'>
          <div className='flex items-center gap-2'>
            <FaExclamationCircle className='text-[var(--primary-color)]' />
            <h2 className='text-xs font-black uppercase tracking-widest opacity-50'>Top Priority Intercept</h2>
          </div>
          {topPriority && (
            <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase flex items-center gap-1 ${topPriority.leadCategory === 'RV' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
              {topPriority.leadCategory === 'RV' ? <FaRv size={8} /> : <FaBuilding size={8} />}
              {topPriority.leadCategory}
            </span>
          )}
        </div>

        {topPriority && topPriority.name && (
          <div className='space-y-4'>
            <div className='flex justify-between items-start'>
              <div>
                <h3 className='text-3xl font-black leading-tight'>{topPriority.name}</h3>
                <div className='flex gap-4 opacity-70 mt-2'>
                  <span className='flex items-center gap-2 text-xs'><FaEnvelope size={10} /> {topPriority.email}</span>
                  <span className='flex items-center gap-2 text-xs'><FaPhone size={10} /> {topPriority.phone}</span>
                </div>
              </div>
              <div className='text-right'>
                <div className='text-[10px] uppercase font-bold opacity-50 mb-1'>Velocity</div>
                <div className='text-2xl font-black text-[var(--primary-color)] flex items-center gap-1 justify-end'><FaBolt size={14} /> {topPriority.engagementVelocity || 0}</div>
              </div>
            </div>
            
            <div className='bg-[var(--primary-color)] text-white p-4 rounded-xl shadow-lg relative overflow-hidden'>
              <div className='absolute -right-4 -bottom-4 opacity-10 rotate-12'><FaBolt size={80} /></div>
              <p className='text-sm italic font-serif relative z-10'>"{topPriority.jamieNotes}"</p>
            </div>

            {topPriority.reengagementHook && (
              <div className='bg-white/10 border border-white/20 p-4 rounded-xl'>
                <div className='text-[10px] uppercase font-bold opacity-50 mb-2 flex items-center gap-2'><FaUndo size={8} /> Active Reactivation Hook</div>
                <p className='text-xs font-mono text-[var(--primary-color)]'>{topPriority.reengagementHook}</p>
              </div>
            )}

            <div className='flex justify-between items-end pt-2'>
              <div>
                <div className='text-[10px] uppercase font-bold opacity-50 mb-1'>Closing Probability</div>
                <div className='text-4xl font-black text-green-400'>{topPriority.probability}%</div>
              </div>
              {topPriority.probability < 60 && (
                <button 
                  onClick={() => handleReengage(topPriority._id)}
                  className='bg-white/10 hover:bg-white/20 text-white text-[10px] px-4 py-2 rounded-lg font-bold uppercase transition-all flex items-center gap-2'
                >
                  <FaUndo /> Trigger Re-engagement
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM LEFT QUADRANT (Property Clusters / Recent Deployments) */}
      <div className='p-8 border-r border-white/5 bg-[var(--bl-bg)] text-[var(--bl-color)] transition-all duration-500 overflow-y-auto'>
        <div className='flex items-center justify-between mb-6'>
          <div className='flex items-center gap-2'>
            {bottomLeftMode === 'clusters' ? <FaHome className='opacity-50' /> : <FaCheckCircle className='opacity-50' />}
            <h2 className='text-xs font-black uppercase tracking-widest opacity-50'>
              {bottomLeftMode === 'clusters' ? 'Intelligence Clusters' : 'Recent Deployments'}
            </h2>
          </div>
          <div className='flex bg-white/5 p-1 rounded-lg border border-white/10'>
            <button onClick={() => setBottomLeftMode('clusters')} className={`text-[8px] px-2 py-1 rounded font-black transition-all ${bottomLeftMode === 'clusters' ? 'bg-[var(--primary-color)] text-white' : 'text-white/30 hover:text-white/60'}`}>CLUSTERS</button>
            <button onClick={() => setBottomLeftMode('recon')} className={`text-[8px] px-2 py-1 rounded font-black transition-all ${bottomLeftMode === 'recon' ? 'bg-blue-600 text-white' : 'text-white/30 hover:text-white/60'}`}>MARKET RECON</button>
            <button onClick={() => setBottomLeftMode('dreams')} className={`text-[8px] px-2 py-1 rounded font-black transition-all ${bottomLeftMode === 'dreams' ? 'bg-amber-500 text-white' : 'text-white/30 hover:text-white/60'}`}>DREAM STREAM</button>
            <button onClick={() => setBottomLeftMode('deployments')} className={`text-[8px] px-2 py-1 rounded font-black transition-all ${bottomLeftMode === 'deployments' ? 'bg-green-600 text-white' : 'text-white/30 hover:text-white/60'}`}>DEPLOYMENTS</button>
          </div>
        </div>
        
        <div className='space-y-6'>
          {bottomLeftMode === 'clusters' ? (
            Object.values(groupedLeads).map((group, idx) => (
              <div key={idx} className='group cursor-pointer'>
                <div className='flex justify-between items-end mb-2'>
                  <h4 className='text-sm font-bold uppercase tracking-tight truncate max-w-[200px]'>{group.name}</h4>
                  <div className='flex items-center gap-3'>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.info(`Generating tactical vibe for ${group.name}...`);
                      }}
                      className='text-[8px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30 hover:bg-blue-500 hover:text-white transition-all'
                    >
                      GENERATE VIBE
                    </button>
                    <span className='text-[10px] font-mono text-green-400'>${(group.monthlyRate * 0.1).toFixed(0)} PROJ. FEE</span>
                  </div>
                </div>
                <div className='w-full bg-white/5 h-1 rounded-full overflow-hidden'>
                  <div className='bg-[var(--primary-color)] h-full w-2/3 opacity-50 group-hover:opacity-100 transition-all' />
                </div>
              </div>
            ))
          ) : bottomLeftMode === 'recon' ? (
            <div className='space-y-4'>
              {valuations.map((v) => (
                <div key={v._id} className='bg-white/5 border border-white/10 p-4 rounded-xl hover:bg-white/10 transition-all'>
                  <div className='flex justify-between items-start mb-2'>
                    <div className='text-[10px] font-black uppercase text-blue-400 truncate max-w-[150px]'>{v.address}</div>
                    <div className='text-xs font-black text-white'>${v.estimate?.toLocaleString()}</div>
                  </div>
                  <div className='flex gap-2 mb-3'>
                    {v.features?.map((f, i) => (
                      <span key={i} className='text-[8px] bg-white/5 px-1.5 py-0.5 rounded text-white/40 border border-white/5'>{f}</span>
                    ))}
                  </div>
                  <div className='grid grid-cols-2 gap-2'>
                    <div className='bg-black/40 p-2 rounded-lg border border-white/5'>
                      <div className='text-[8px] opacity-40 uppercase font-bold'>ML Confidence</div>
                      <div className='text-[10px] font-mono text-green-400'>{(v.ml_adjustments?.confidence_score * 100).toFixed(0)}%</div>
                    </div>
                    <div className='bg-black/40 p-2 rounded-lg border border-white/5'>
                      <div className='text-[8px] opacity-40 uppercase font-bold'>Trend Index</div>
                      <div className='text-[10px] font-mono text-blue-400'>{v.ml_adjustments?.price_trend_index}x</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : bottomLeftMode === 'dreams' ? (
            <div className='space-y-4'>
              {dreams.map((dream, idx) => (
                <div key={idx} className='bg-white/5 border border-white/10 p-4 rounded-xl hover:bg-white/10 transition-all group'>
                  <div className='flex items-center gap-2 mb-2'>
                    <div className='p-1.5 bg-amber-500/20 rounded-lg text-amber-400'>
                      <FaBolt size={10} />
                    </div>
                    <h4 className='text-[10px] font-black uppercase tracking-widest text-amber-400'>{dream.properties?.category || 'Insight'}</h4>
                  </div>
                  <h3 className='text-sm font-bold text-white mb-1'>{dream.properties?.title}</h3>
                  <p className='text-[10px] text-slate-400 leading-relaxed line-clamp-2'>{dream.properties?.description}</p>
                  <div className='mt-3 flex justify-between items-center'>
                    <div className='text-[8px] font-black text-slate-500 uppercase'>Intelligence: {dream.properties?.intelligence_score}%</div>
                    <div className='text-[8px] font-mono text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity uppercase'>JAMIE_SPATIAL_MEM</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className='space-y-4'>
              {bookings.length > 0 ? bookings.map((booking) => (
                <div key={booking._id} className='bg-white/5 border border-white/10 p-4 rounded-xl flex flex-col gap-2 hover:bg-white/10 transition-all'>
                  <div className='flex justify-between items-start'>
                    <div className='text-[10px] font-black uppercase text-blue-400'>{booking.property?.name}</div>
                    <div className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase ${booking.status === 'Confirmed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {booking.status}
                    </div>
                  </div>
                  <div className='flex justify-between items-center'>
                    <div className='flex items-center gap-2'>
                      <div className='w-6 h-6 rounded-full bg-slate-800 border border-white/10 overflow-hidden'>
                        {booking.user?.image ? <img src={booking.user.image} alt='' /> : <div className='w-full h-full flex items-center justify-center text-[8px] font-bold'>{booking.user?.username?.charAt(0)}</div>}
                      </div>
                      <div className='text-xs font-bold text-white'>{booking.user?.username}</div>
                    </div>
                    <div className='text-xs font-mono text-green-400 font-bold'>${booking.totalPrice?.toLocaleString()}</div>
                  </div>
                  <div className='text-[10px] opacity-50 font-mono flex gap-2'>
                    <FaClock size={8} className='mt-0.5' /> 
                    {new Date(booking.checkIn).toLocaleDateString()} — {new Date(booking.checkOut).toLocaleDateString()}
                  </div>
                </div>
              )) : (
                <div className='text-center py-10 opacity-30 text-xs font-black uppercase tracking-widest'>No Active Deployments</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM RIGHT QUADRANT (Lead Detail) */}
      <div className='p-8 bg-[var(--br-bg)] text-[var(--br-color)] transition-all duration-500 overflow-y-auto'>
        <div className='flex items-center justify-between mb-6'>
          <div className='flex items-center gap-2'>
            <FaCrosshairs className='opacity-50' />
            <h2 className='text-xs font-black uppercase tracking-widest opacity-50'>Lead Recon Feed</h2>
          </div>
          <div className='text-[10px] opacity-30 font-mono'>REAL-TIME SYNC ACTIVE</div>
        </div>

        <div className='space-y-8'>
          {Object.entries(
            filteredLeads.reduce((acc, lead) => {
              const propId = lead.property?._id || 'unknown';
              if (!acc[propId]) acc[propId] = { name: lead.property?.name || 'Unknown Property', leads: [] };
              acc[propId].leads.push(lead);
              return acc;
            }, {})
          ).map(([propId, group]) => (
            <div key={propId} className='space-y-3'>
              <div className='flex items-center gap-2 border-b border-white/5 pb-1 mb-2'>
                <FaHome className='text-[var(--primary-color)] text-[10px]' />
                <h3 className='text-[10px] font-black uppercase tracking-[0.2em] text-white/50'>{group.name}</h3>
                <span className='text-[8px] bg-white/5 px-2 py-0.5 rounded-full text-white/30 font-mono'>{group.leads.length} LEADS</span>
              </div>
              <div className='grid grid-cols-1 gap-4'>
                {group.leads.map((lead) => {
                  const isGoldenWindow = (new Date() - new Date(lead.createdAt)) < 5 * 60 * 1000;
                  return (
                    <div key={lead._id} className={`bg-white/5 border ${isGoldenWindow ? 'border-amber-500 animate-pulse' : 'border-white/10'} p-4 rounded-xl flex justify-between items-center hover:bg-white/10 transition-colors group relative overflow-hidden`}>
                      {isGoldenWindow && (
                        <div className='absolute top-0 left-0 bg-amber-500 text-black text-[7px] font-black px-2 py-0.5 uppercase tracking-tighter'>
                          Golden Window
                        </div>
                      )}
                      <div className='flex-1'>
                        <div className='flex items-center gap-2'>
                          <div className='text-sm font-bold text-white'>{lead.name}</div>
                          <span className={`text-[7px] px-1.5 py-0.5 rounded font-black uppercase border ${lead.leadCategory === 'RV' ? 'border-green-500/30 text-green-400 bg-green-500/5' : 'border-blue-500/30 text-blue-400 bg-blue-500/5'}`}>
                            {lead.leadCategory === 'RV' ? 'RV' : 'RES'}
                          </span>
                          {lead.idxViewed && (
                            <span className='text-[8px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-black uppercase'>IDX</span>
                          )}
                          {lead.status === 'contacted' && (
                            <span className='text-[8px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-black uppercase'>ENGAGED</span>
                          )}
                        </div>
                        <div className='flex gap-3 mt-1'>
                          <div className='text-[10px] opacity-50 flex items-center gap-1'><FaEnvelope size={8} /> {lead.email}</div>
                          <div className='text-[10px] opacity-50 flex items-center gap-1'><FaClock size={8} /> {new Date(lead.lastActivity || lead.updatedAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className='flex items-center gap-2'>
                        <div className='text-right mr-2'>
                          <div className='text-[10px] font-black text-green-400'>{lead.probability}%</div>
                          <div className='text-[8px] opacity-30 uppercase font-bold'>Probability</div>
                        </div>
                        {reengagingId === lead._id ? (
                          <div className='animate-spin text-[var(--primary-color)]'><FaUndo size={14} /></div>
                        ) : lead.reengagementHook && typeof lead.reengagementHook === 'object' ? (
                          <AlphabetGrid lead={lead} />
                        ) : lead.probability < 70 && lead.status !== 'contacted' && (
                          <button 
                            onClick={() => handleReengage(lead._id)}
                            className='opacity-0 group-hover:opacity-100 bg-white/10 p-2 rounded-lg hover:bg-[var(--primary-color)] transition-all'
                            title='Trigger Re-engagement'
                          >
                            <FaUndo size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default CommandPostPage;

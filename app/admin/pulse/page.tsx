'use client';

import { useState, useEffect } from 'react';
import { 
  FaHeartbeat, 
  FaCalendarCheck, 
  FaClock, 
  FaUser, 
  FaLocationDot, 
  FaVideo, 
  FaRobot, 
  FaCheck, 
  FaXmark, 
  FaUpRightFromSquare, 
  FaCircleExclamation,
  FaRoute,
  FaSatellite
} from 'react-icons/fa6';
import { toast } from 'react-toastify';
import Link from 'next/link';

interface TourRequest {
  _id: string;
  property: {
    _id: string;
    name: string;
    location: { street: string; city: string };
    location_geo?: { coordinates: [number, number] };
    images: string[];
  };
  userName: string;
  userEmail: string;
  preferredDate: string;
  preferredTime: string;
  tourType: string;
  status: 'Pending' | 'Confirmed' | 'Rescheduled' | 'Cancelled' | 'Completed';
  message?: string;
}

export default function PulseCommandCenter() {
  const [tours, setTours] = useState<TourRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Active');

  const fetchTours = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/tours');
      if (res.ok) {
        const data = await res.json();
        setTours(data.data || data);
      }
    } catch (error) {
      toast.error('Grid synchronization failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTours();
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch('/api/admin/tours', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      });

      if (res.ok) {
        toast.success(`Mission status updated: ${newStatus}`);
        fetchTours();
      }
    } catch (error) {
      toast.error('Neural uplink failure during status update.');
    }
  };

  const getTourIcon = (type: string) => {
    switch (type) {
      case 'Virtual': return <FaVideo />;
      case 'Drone-Stream': return <FaDrone />;
      case 'Jamie-Guided': return <FaRobot />;
      default: return <FaLocationDot />;
    }
  };

  const openRouting = (tour: TourRequest) => {
    const { property } = tour;
    let url = '';
    
    if (property.location_geo?.coordinates) {
      const [lng, lat] = property.location_geo.coordinates;
      url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    } else {
      const address = `${property.location.street}, ${property.location.city}`;
      url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    }
    
    window.open(url, '_blank');
  };

  const filteredTours = tours.filter(t => {
    if (filter === 'Active') return ['Pending', 'Confirmed', 'Rescheduled'].includes(t.status);
    if (filter === 'History') return ['Completed', 'Cancelled'].includes(t.status);
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 pb-24 font-mono">
      <div className="max-w-7xl mx-auto">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 border-b border-blue-500/20 pb-8 gap-6">
          <div>
            <div className="flex items-center gap-3 text-blue-500 mb-2">
              <FaHeartbeat className="animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">Grid Deployment</span>
            </div>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter text-white">Pulse Center</h1>
            <p className="text-slate-500 text-xs mt-2 uppercase tracking-widest font-black">Recon Mission Orchestration & Logistics</p>
          </div>

          <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
            {['Active', 'History', 'All'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  filter === f ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-500 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </header>

        {loading ? (
          <div className="py-24 text-center">
            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] animate-pulse">Scanning Grid for Missions...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTours.map((tour) => (
              <div 
                key={tour._id} 
                className={`group bg-slate-900/50 border rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-2xl ${
                  tour.status === 'Pending' ? 'border-orange-500/30 hover:border-orange-500/50' : 
                  tour.status === 'Confirmed' ? 'border-green-500/30 hover:border-green-500/50' : 
                  'border-white/5 hover:border-blue-500/30'
                }`}
              >
                {/* Header: Property Intel */}
                <div className="relative h-32 overflow-hidden">
                  <img 
                    src={tour.property?.images[0] || '/images/placeholder.jpg'} 
                    alt="Asset"
                    className="w-full h-full object-cover opacity-40 group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
                  <div className="absolute bottom-4 left-6">
                    <div className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1">Target Asset</div>
                    <h3 className="text-sm font-black text-white uppercase truncate w-[250px]">{tour.property?.name || 'Unknown Unit'}</h3>
                  </div>
                  <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                    tour.status === 'Pending' ? 'bg-orange-500/20 border-orange-500 text-orange-400' :
                    tour.status === 'Confirmed' ? 'bg-green-500/20 border-green-500 text-green-400' :
                    'bg-slate-800 border-white/10 text-slate-400'
                  }`}>
                    {tour.status}
                  </div>
                </div>

                {/* Body: Mission Data */}
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Schedule</div>
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <FaCalendarCheck size={10} className="text-blue-500" />
                        {new Date(tour.preferredDate).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                        <FaClock size={10} className="text-slate-600" />
                        {tour.preferredTime}
                      </div>
                    </div>
                    <div>
                      <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Recon Type</div>
                      <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-tighter italic">
                        <span className="text-blue-500">{getTourIcon(tour.tourType)}</span>
                        {tour.tourType}
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/5">
                    <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Client Intelligence</div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                        <FaUser size={12} />
                      </div>
                      <div>
                        <div className="text-xs font-black text-white">{tour.userName}</div>
                        <div className="text-[9px] text-slate-500 truncate w-[150px]">{tour.userEmail}</div>
                      </div>
                    </div>
                  </div>

                  {tour.message && (
                    <div className="bg-black/40 border border-white/5 p-3 rounded-xl">
                      <div className="text-[7px] font-black text-slate-600 uppercase tracking-widest mb-1 italic">Tactical Brief</div>
                      <p className="text-[10px] text-slate-400 italic line-clamp-2 leading-relaxed">"{tour.message}"</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
                    {tour.tourType === 'In-Person' && tour.status === 'Confirmed' && (
                      <button 
                        onClick={() => openRouting(tour)}
                        className="col-span-2 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all mb-2"
                      >
                        <FaRoute size={10} /> Route to Target
                      </button>
                    )}
                    
                    {tour.status === 'Pending' && (
                      <>
                        <button 
                          onClick={() => updateStatus(tour._id, 'Confirmed')}
                          className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                        >
                          <FaCheck size={8} /> Confirm
                        </button>
                        <button 
                          onClick={() => updateStatus(tour._id, 'Cancelled')}
                          className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-red-500 text-white py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                        >
                          <FaXmark size={8} /> Purge
                        </button>
                      </>
                    )}
                    {tour.status === 'Confirmed' && (
                      <>
                        <button 
                          onClick={() => updateStatus(tour._id, 'Completed')}
                          className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                        >
                          <FaCheck size={8} /> Complete
                        </button>
                        <button 
                          onClick={() => updateStatus(tour._id, 'Rescheduled')}
                          className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                        >
                          Reschedule
                        </button>
                      </>
                    )}
                    {['Completed', 'Cancelled', 'Rescheduled'].includes(tour.status) && (
                      <button 
                        onClick={() => updateStatus(tour._id, 'Pending')}
                        className="col-span-2 flex items-center justify-center gap-2 bg-slate-800 hover:bg-blue-600 text-white py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                      >
                        Reset To Pending
                      </button>
                    )}
                  </div>
                  
                  <Link 
                    href={`/properties/${tour.property?._id}`}
                    className="flex items-center justify-center gap-2 text-[8px] text-slate-500 hover:text-blue-400 transition-colors uppercase font-black tracking-[0.2em] mt-2"
                  >
                    View Asset in Grid <FaUpRightFromSquare size={8} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredTours.length === 0 && !loading && (
          <div className="py-32 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
            <FaCircleExclamation className="mx-auto text-slate-800 mb-6" size={48} />
            <h3 className="text-xl font-black text-slate-700 uppercase tracking-widest italic">No Recon Missions Identified</h3>
            <p className="text-[10px] text-slate-800 mt-2 uppercase font-bold tracking-[0.3em]">Sector Clear • Waiting for Infiltration Signals</p>
          </div>
        )}

      </div>
    </div>
  );
}

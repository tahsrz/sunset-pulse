'use client';
import { useState, useEffect } from 'react';
import { FaBell, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';

const SavedSearchAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [anomalyAlerts, setAnomalyAlerts] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch('/api/search/alerts/list');
        if (res.ok) {
          const data = await res.json();
          setAlerts(data);
        }
      } catch (error) {
        console.error('Fetch alerts error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, []);

  return (
    <div className='bg-slate-900/50 p-6 rounded-3xl border border-white/5 backdrop-blur-xl'>
      <div className='flex items-center justify-between mb-6'>
        <h3 className='text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2'>
          <FaBell className='text-blue-500' /> Recon Surveillance
        </h3>
        <div className='flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/10'>
          <span className='text-[8px] font-black uppercase tracking-widest text-slate-500'>Market Anomaly Ping</span>
          <button 
            onClick={() => setAnomalyAlerts(!anomalyAlerts)}
            className={`w-8 h-4 rounded-full transition-all relative ${anomalyAlerts ? 'bg-blue-600' : 'bg-slate-800'}`}
          >
            <div className={`absolute top-1 w-2 h-2 rounded-full bg-white transition-all ${anomalyAlerts ? 'left-5' : 'left-1'}`} />
          </button>
        </div>
      </div>

      <div className='space-y-4'>
        {anomalyAlerts && (
          <div className='p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl animate-pulse-subtle'>
            <div className='flex items-start gap-3'>
              <FaExclamationTriangle className='text-blue-400 mt-1' size={14} />
              <div>
                <p className='text-[11px] font-bold text-blue-100'>Market Anomaly Protocol Active</p>
                <p className='text-[9px] text-blue-300/60 uppercase tracking-tighter'>Monitoring RentCast & MLS for volatility pings.</p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <p className='text-slate-500 text-[10px] font-mono italic animate-pulse'>ACCESSING ENCRYPTED ALERTS...</p>
        ) : alerts.length === 0 ? (
          <div className='py-8 text-center border border-dashed border-white/5 rounded-2xl'>
            <p className='text-slate-500 text-[10px] uppercase font-black tracking-widest'>No Active Target Alerts</p>
            <p className='text-[9px] text-slate-600 italic mt-1'>Deploy reconnaissance from the search grid.</p>
          </div>
        ) : (
          <div className='space-y-2'>
            {alerts.map((alert: any, index: number) => (
              <div key={index} className='group flex items-center justify-between p-4 bg-black/20 hover:bg-white/5 rounded-2xl border border-white/5 transition-all'>
                <div>
                  <p className='font-bold text-white text-[12px]'>
                    {alert.query.location || 'GLOBAL_SEARCH'}
                  </p>
                  <div className='flex items-center gap-2 mt-1'>
                    <span className='text-[8px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded uppercase font-black tracking-tighter'>
                      {alert.query.propertyType || 'ALL_TYPES'}
                    </span>
                    <span className='text-[8px] text-slate-500 uppercase font-mono'>{alert.alertFrequency}</span>
                  </div>
                </div>
                <div className='flex items-center gap-3'>
                  <div className='flex flex-col items-end'>
                    <span className='text-[7px] text-green-500 font-black uppercase tracking-widest flex items-center gap-1'>
                      <FaCheckCircle size={6} /> Active
                    </span>
                  </div>
                  <button className='text-slate-600 hover:text-red-500 transition-colors'>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedSearchAlerts;

'use client';
import { useState, useEffect } from 'react';

const SavedSearchAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch('/api/search/alerts/list'); // To be implemented if needed, or check existing
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
    <div className='bg-white p-6 rounded-2xl shadow-sm border border-slate-100'>
      <h3 className='text-lg font-black text-slate-900 uppercase tracking-tighter mb-4'>Saved Recon Alerts</h3>
      {loading ? (
        <p className='text-slate-500 text-sm'>Accessing encrypted alerts...</p>
      ) : alerts.length === 0 ? (
        <p className='text-slate-400 text-sm italic'>No active search alerts. Deploy one from the search bar.</p>
      ) : (
        <div className='space-y-3'>
          {alerts.map((alert, index) => (
            <div key={index} className='flex items-center justify-between p-3 bg-slate-50 rounded-lg'>
              <div>
                <p className='font-bold text-slate-800 text-sm'>
                  {alert.query.location || 'Anywhere'} - {alert.query.propertyType || 'All Types'}
                </p>
                <p className='text-[10px] text-slate-400 uppercase font-black tracking-widest'>{alert.alertFrequency} Updates</p>
              </div>
              <button className='text-red-500 hover:text-red-600 text-xs font-bold'>OFFLINE</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedSearchAlerts;

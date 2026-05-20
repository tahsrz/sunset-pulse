'use client';
import { useState, useEffect } from 'react';
import { FaMicroscope, FaExclamationTriangle, FaTrash, FaPlus, FaSatellite, FaSpinner, FaEdit, FaCheck, FaTimes } from 'react-icons/fa';
import { speak } from '@/lib/core/tts';

const ComplexObservationsManager = () => {
  const [observations, setObservations] = useState([]);
  const [newObs, setNewObs] = useState({ region: '', data: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ region: '', data: '' });

  const fetchObservations = async (shouldSpeak = false) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/jamie/observations/log');
      if (res.ok) {
        const data = await res.json();
        setObservations(data);
        
        if (shouldSpeak && data.length > 0) {
          const latest = data[0];
          speak(`Observation in ${latest.region}: ${latest.data}`);
        }
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchObservations(true); // Speak latest on mount
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (observations.length >= 5) {
      alert("Limit reached: only 5 active observations are allowed.");
      return;
    }

    // Duplicate Validation
    const isDuplicate = observations.some(
      o => o.region.toLowerCase() === newObs.region.toLowerCase() && 
           o.data.toLowerCase() === newObs.data.toLowerCase()
    );
    if (isDuplicate) {
      alert("This observation already exists in the log.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/jamie/observations/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newObs),
      });

      if (res.ok) {
        speak(`New observation logged for ${newObs.region}.`);
        await fetchObservations(); // Refresh from backend
        setNewObs({ region: '', data: '' });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (obs) => {
    if (!window.confirm("Remove this observation from the log?")) return;

    try {
      const res = await fetch('/api/jamie/observations/log', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawLine: obs.raw }),
      });

      if (res.ok) {
        setObservations(observations.filter(o => o.id !== obs.id));
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const startEdit = (obs) => {
    setEditingId(obs.id);
    setEditForm({ region: obs.region, data: obs.data });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ region: '', data: '' });
  };

  const handleUpdate = async (originalObs) => {
    // Edit logic: Delete original and add new
    try {
      // 1. Remove original
      await fetch('/api/jamie/observations/log', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawLine: originalObs.raw }),
      });

      // 2. Add updated
      await fetch('/api/jamie/observations/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      setEditingId(null);
      await fetchObservations();
    } catch (err) {
      console.error('Update error:', err);
    }
  };

  return (
    <div className='bg-slate-900 rounded-3xl p-8 border border-white/5 shadow-2xl'>
      <div className='flex items-center justify-between mb-8'>
        <div className='flex items-center gap-3'>
          <div className='w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center'>
            <FaMicroscope className='text-white' />
          </div>
          <div>
            <h3 className='text-xl font-black text-white uppercase tracking-tighter'>Complex Observations</h3>
            <p className='text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]'>Region-Specific Notes</p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <div className='flex gap-1'>
            {[1, 2, 3, 4, 5].map((slot) => (
              <div 
                key={slot} 
                className={`w-3 h-1.5 rounded-full ${slot <= observations.length ? 'bg-amber-500 shadow-lg shadow-amber-500/20' : 'bg-white/10'}`}
              ></div>
            ))}
          </div>
          <span className='text-[10px] font-black text-slate-500 uppercase ml-2'>{observations.length}/5 SLOTS</span>
        </div>
      </div>

      {/* Entry Form */}
      <form onSubmit={handleAdd} className='mb-8 p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <input
            type='text'
            placeholder='Region'
            required
            className='md:col-span-1 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-amber-500 transition-all'
            value={newObs.region}
            onChange={(e) => setNewObs({ ...newObs, region: e.target.value })}
          />
          <input
            type='text'
            placeholder='Observation...'
            required
            className='md:col-span-2 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-amber-500 transition-all'
            value={newObs.data}
            onChange={(e) => setNewObs({ ...newObs, data: e.target.value })}
          />
        </div>
        <button
          type='submit'
          disabled={isSubmitting || observations.length >= 5}
          className='w-full bg-amber-600 hover:bg-amber-500 text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 disabled:opacity-50'
        >
          {isSubmitting ? <FaSpinner className='animate-spin' /> : <FaPlus />} Log Observation
        </button>
      </form>

      {/* List */}
      <div className='space-y-3 min-h-[200px]'>
        {isLoading ? (
          <div className='flex flex-col items-center justify-center py-12 gap-4'>
            <FaSpinner className='text-amber-500 text-3xl animate-spin' />
            <p className='text-slate-500 text-[10px] font-black uppercase tracking-widest'>Loading Observations...</p>
          </div>
        ) : observations.length === 0 ? (
          <div className='py-12 text-center border-2 border-dashed border-white/5 rounded-2xl'>
            <FaSatellite className='text-slate-700 text-3xl mx-auto mb-4' />
            <p className='text-slate-500 text-xs font-bold uppercase tracking-widest'>No active observations</p>
          </div>
        ) : (
          observations.map((obs) => (
            <div key={obs.id} className='group p-4 bg-white/5 rounded-xl border border-white/5 hover:border-amber-500/30 transition-all'>
              {editingId === obs.id ? (
                <div className='space-y-3'>
                  <div className='grid grid-cols-1 md:grid-cols-3 gap-2'>
                    <input 
                      className='bg-black/50 border border-white/10 rounded p-2 text-white text-xs'
                      value={editForm.region}
                      onChange={e => setEditForm({...editForm, region: e.target.value})}
                    />
                    <input 
                      className='md:col-span-2 bg-black/50 border border-white/10 rounded p-2 text-white text-xs'
                      value={editForm.data}
                      onChange={e => setEditForm({...editForm, data: e.target.value})}
                    />
                  </div>
                  <div className='flex gap-2 justify-end'>
                    <button onClick={cancelEdit} className='text-slate-500 hover:text-white p-1'><FaTimes /></button>
                    <button onClick={() => handleUpdate(obs)} className='text-green-500 hover:text-green-400 p-1'><FaCheck /></button>
                  </div>
                </div>
              ) : (
                <div className='flex items-center justify-between'>
                  <div className='flex gap-4 items-start'>
                    <div className='mt-1'>
                      <FaExclamationTriangle className='text-amber-500 text-xs animate-pulse' />
                    </div>
                    <div>
                      <p className='text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1'>{obs.region}</p>
                      <p className='text-xs text-slate-300 font-medium leading-relaxed'>{obs.data}</p>
                    </div>
                  </div>
                  <div className='flex gap-2 opacity-0 group-hover:opacity-100 transition-all'>
                    <button onClick={() => startEdit(obs)} className='p-2 text-slate-500 hover:text-blue-400'><FaEdit /></button>
                    <button onClick={() => handleDelete(obs)} className='p-2 text-slate-500 hover:text-red-500'><FaTrash /></button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ComplexObservationsManager;

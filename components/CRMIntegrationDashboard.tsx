'use client';
import { useState } from 'react';
import { FaCog, FaChartLine, FaRobot, FaDatabase } from 'react-icons/fa';

const CRMIntegrationDashboard = ({ user }) => {
  const [status, setStatus] = useState(user?.crmStatus || 'Lead');
  const [notes, setNotes] = useState(user?.crmNotes || []);
  const [newNote, setNewNote] = useState('');

  const handleUpdateStatus = async (newStatus) => {
    setStatus(newStatus);
    // API call to update CRM status would go here
  };

  const handleAddNote = () => {
    if (!newNote) return;
    const noteObj = { note: newNote, date: new Date().toISOString() };
    setNotes([noteObj, ...notes]);
    setNewNote('');
    // API call to save note would go here
  };

  return (
    <div className='bg-slate-900 rounded-3xl p-8 border border-white/5 shadow-2xl'>
      <div className='flex items-center justify-between mb-8'>
        <div className='flex items-center gap-3'>
          <div className='w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center'>
            <FaDatabase className='text-white' />
          </div>
          <div>
            <h3 className='text-xl font-black text-white uppercase tracking-tighter'>CRM Dashboard</h3>
            <p className='text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]'>Integrated Lead Management</p>
          </div>
        </div>
        <div className='px-4 py-2 bg-white/5 rounded-full border border-white/10'>
          <span className='text-[10px] font-black uppercase tracking-widest text-blue-400'>Live Connection: Active</span>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
        {/* Status Control */}
        <div className='space-y-4'>
          <h4 className='text-[10px] font-black uppercase tracking-widest text-slate-500'>Lead lifecycle Status</h4>
          <div className='grid grid-cols-2 gap-2'>
            {['Lead', 'Active', 'Closed', 'Archived'].map(s => (
              <button
                key={s}
                onClick={() => handleUpdateStatus(s)}
                className={`py-3 rounded-xl text-xs font-bold transition-all border ${
                  status === s 
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' 
                    : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/10'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Rapid Notes */}
        <div className='space-y-4'>
          <h4 className='text-[10px] font-black uppercase tracking-widest text-slate-500'>Lead Notes</h4>
          <div className='flex gap-2'>
            <input
              type='text'
              placeholder='Log new observation...'
              className='flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500 transition-all'
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
            />
            <button
              onClick={handleAddNote}
              className='bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-xl transition-all'
            >
              Log
            </button>
          </div>
          <div className='space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar'>
            {notes.map((n, i) => (
              <div key={i} className='p-3 bg-white/5 rounded-lg border border-white/5'>
                <p className='text-xs text-slate-300'>{n.note}</p>
                <p className='text-[8px] text-slate-600 font-black uppercase mt-1'>{new Date(n.date).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className='mt-8 pt-8 border-t border-white/5 grid grid-cols-3 gap-4'>
        <div className='bg-white/5 p-4 rounded-2xl text-center'>
          <FaChartLine className='text-blue-500 mx-auto mb-2' />
          <p className='text-white font-black text-lg'>92%</p>
          <p className='text-[8px] text-slate-500 uppercase font-black tracking-widest'>Engagement</p>
        </div>
        <div className='bg-white/5 p-4 rounded-2xl text-center'>
          <FaRobot className='text-amber-500 mx-auto mb-2' />
          <p className='text-white font-black text-lg'>Jamie</p>
          <p className='text-[8px] text-slate-500 uppercase font-black tracking-widest'>Lead Agent</p>
        </div>
        <div className='bg-white/5 p-4 rounded-2xl text-center'>
          <FaCog className='text-slate-500 mx-auto mb-2' />
          <p className='text-white font-black text-lg'>REST</p>
          <p className='text-[8px] text-slate-500 uppercase font-black tracking-widest'>API Bridge</p>
        </div>
      </div>
    </div>
  );
};

export default CRMIntegrationDashboard;

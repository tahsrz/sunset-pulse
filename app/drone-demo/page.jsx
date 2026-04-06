'use client';
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';
import DroneDemoViewer from '@/components/DroneDemoViewer';

const DroneDemoPage = () => {
  // Mock property for the demo
  const mockProperty = {
    _id: 'demo-drone',
    name: 'Drone Training Facility',
    type: 'Training Grounds',
    location: {
      street: 'Sector 7G',
      city: 'Neo-Tokyo',
      state: 'JP'
    },
    rates: {
      monthly: 0
    },
    square_feet: 50000
  };

  return (
    <div className='min-h-screen bg-slate-950 text-white p-6'>
      <div className='container m-auto'>
        <Link
          href='/'
          className='text-blue-500 hover:text-blue-600 flex items-center mb-8 transition-all hover:-translate-x-1'
        >
          <FaArrowLeft className='mr-2' /> Back to Home
        </Link>

        <header className='mb-12'>
          <h1 className='text-6xl font-black italic uppercase tracking-tighter mb-4'>
            Drone <span className='text-blue-500'>Flight</span> Academy
          </h1>
          <p className='text-slate-400 max-w-2xl text-lg font-medium leading-relaxed'>
            Master the Sunset Pulse drone reconnaissance system. Navigate through the long-range sensory hallway and clear all checkpoints to achieve Elite status.
          </p>
        </header>

        <div className='bg-slate-900 border border-white/10 p-2 rounded-[2.5rem] shadow-2xl overflow-hidden'>
          <DroneDemoViewer property={mockProperty} userId="demo-user" userName="Recruit" />
        </div>

        <section className='grid grid-cols-1 md:grid-cols-3 gap-8 mt-12'>
          <div className='bg-slate-900/50 border border-white/5 p-8 rounded-3xl'>
            <h3 className='text-blue-400 font-black uppercase tracking-widest text-xs mb-4'>Controls</h3>
            <ul className='space-y-3 text-slate-400 text-sm font-bold'>
              <li className='flex justify-between'><span className='text-white'>W / S</span> <span>Forward / Back</span></li>
              <li className='flex justify-between'><span className='text-white'>A / D</span> <span>Strafe Left / Right</span></li>
              <li className='flex justify-between'><span className='text-white'>SPACE / L-SHIFT</span> <span>Up / Down</span></li>
              <li className='flex justify-between'><span className='text-white'>MOUSE</span> <span>Look around</span></li>
            </ul>
          </div>
          
          <div className='bg-slate-900/50 border border-white/5 p-8 rounded-3xl'>
            <h3 className='text-blue-400 font-black uppercase tracking-widest text-xs mb-4'>Objective</h3>
            <p className='text-slate-400 text-sm font-medium leading-relaxed'>
              Navigate through the generated ring structures. Each ring passed increases your synchronization with the Pulse Neural Link.
            </p>
          </div>

          <div className='bg-slate-900/50 border border-white/5 p-8 rounded-3xl'>
            <h3 className='text-blue-400 font-black uppercase tracking-widest text-xs mb-4'>Status</h3>
            <div className='flex items-center gap-4 mt-2'>
              <div className='w-3 h-3 rounded-full bg-green-500 animate-pulse' />
              <span className='text-white font-black italic uppercase text-sm'>System Online</span>
            </div>
            <p className='text-slate-500 text-[10px] uppercase tracking-widest mt-4'>Neural Latency: 4ms</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DroneDemoPage;

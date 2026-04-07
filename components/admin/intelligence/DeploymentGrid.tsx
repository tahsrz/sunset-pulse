import React from 'react';
import { FaClock } from 'react-icons/fa';

interface DeploymentGridProps {
  bookings: any[];
}

const DeploymentGrid: React.FC<DeploymentGridProps> = ({ bookings }) => {
  return (
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
                {booking.user?.image ? (
                  <img src={booking.user.image} alt='' />
                ) : (
                  <div className='w-full h-full flex items-center justify-center text-[8px] font-bold text-white'>
                    {booking.user?.username?.charAt(0)}
                  </div>
                )}
              </div>
              <div className='text-xs font-bold text-white'>{booking.user?.username}</div>
            </div>
            <div className='text-xs font-mono text-green-400 font-bold'>${booking.totalPrice?.toLocaleString()}</div>
          </div>
          <div className='text-[10px] opacity-50 font-mono flex gap-2 text-slate-400'>
            <FaClock size={8} className='mt-0.5' /> 
            {new Date(booking.checkIn).toLocaleDateString()} — {new Date(booking.checkOut).toLocaleDateString()}
          </div>
        </div>
      )) : (
        <div className='text-center py-10 opacity-30 text-xs font-black uppercase tracking-widest text-slate-500'>No Active Deployments</div>
      )}
    </div>
  );
};

export default DeploymentGrid;

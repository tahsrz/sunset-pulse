'use client';

import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaCreditCard, FaCheckCircle, FaExclamationTriangle, FaUsers, FaBed, FaBath } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { Property } from '@/lib/types';

interface BookingFormProps {
  property: Property;
}

const BookingForm: React.FC<BookingFormProps> = ({ property }) => {
  const [checkIn, setCheckIn] = useState<string>('');
  const [checkOut, setCheckOut] = useState<string>('');
  const [guests, setGuests] = useState<number>(1);
  const [numNights, setNumNights] = useState<number>(0);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [isBooking, setIsBooking] = useState<boolean>(false);
  const [booked, setBooked] = useState<boolean>(false);

  const isRV = property.type === 'RV' || property.type === 'RV Park';

  useEffect(() => {
    if (checkIn && checkOut) {
      const d1 = new Date(checkIn);
      const d2 = new Date(checkOut);
      const diff = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diff > 0) {
        setNumNights(diff);
        const nightlyRate = property.rates.nightly || 
                           (property.rates.weekly ? property.rates.weekly / 7 : 0) || 
                           (property.rates.monthly ? property.rates.monthly / 30 : 0);
        setTotalPrice(Math.round(diff * nightlyRate));
      } else {
        setNumNights(0);
        setTotalPrice(0);
      }
    }
  }, [checkIn, checkOut, property]);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkIn || !checkOut) return toast.error('Check-in/out dates required.');
    if (numNights <= 0) return toast.error('Invalid date range.');

    setIsBooking(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: property._id,
          checkIn,
          checkOut,
          guests,
          totalPrice,
          rvType: property.rv_type,
          rvLength: property.rv_length,
          beds: property.beds,
          baths: property.baths,
        }),
      });

      if (res.ok) {
        setBooked(true);
        toast.success('Reservation submitted successfully.');
      } else {
        const error = await res.json();
        toast.error(error.message || 'Booking failed.');
      }
    } catch (err) {
      toast.error('Network error while submitting the reservation.');
    } finally {
      setIsBooking(false);
    }
  };

  if (booked) {
    return (
      <div className="bg-green-500/10 border border-green-500/30 p-8 rounded-2xl text-center animate-in zoom-in-95 duration-500">
        <FaCheckCircle size={48} className="text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-black text-white uppercase tracking-widest italic">Reservation Confirmed</h3>
        <p className="text-slate-400 text-sm mt-2 font-medium">Check your email for reservation details.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-white/10 p-8 rounded-2xl shadow-2xl transition-all duration-500 hover:border-blue-500/30">
      <div className="flex items-center gap-3 mb-8 text-blue-400">
        <FaCalendarAlt size={20} />
        <h3 className="text-xl font-black uppercase tracking-[0.2em] italic border-l-4 border-blue-500 pl-4">Reservation Details</h3>
      </div>

      <form onSubmit={handleBooking} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2 italic">Check-In</label>
            <input 
              type="date" 
              className="w-full bg-slate-950 border border-white/5 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2 italic">Check-Out</label>
            <input 
              type="date" 
              className="w-full bg-slate-950 border border-white/5 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2 italic">Guests</label>
          <div className="relative">
            <FaUsers className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="number" 
              min="1"
              className="w-full bg-slate-950 border border-white/5 rounded-xl p-3 pl-10 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              value={guests}
              onChange={(e) => setGuests(parseInt(e.target.value))}
              required
            />
          </div>
        </div>

        {!isRV && (
          <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest italic border-y border-white/5 py-3">
            <span className="flex items-center gap-2"><FaBed /> {property.beds} Beds</span>
            <span className="flex items-center gap-2"><FaBath /> {property.baths} Baths</span>
          </div>
        )}

        {numNights > 0 && (
          <div className="bg-slate-950/50 border border-white/5 p-6 rounded-2xl animate-in fade-in slide-in-from-top-2">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Duration</span>
              <span className="text-white font-bold italic">{numNights} Nights</span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest italic">Estimated Total</span>
              <span className="text-3xl font-black text-white italic tracking-tighter">${totalPrice.toLocaleString()}</span>
            </div>
          </div>
        )}

        {isRV && property.rv_length && (
          <div className="flex items-start gap-3 p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl">
            <FaExclamationTriangle className="text-orange-500 mt-1 flex-shrink-0" size={14} />
            <p className="text-[10px] text-orange-200/70 font-medium leading-relaxed uppercase tracking-wider">
              This spot accommodates rigs up to <span className="text-orange-400 font-bold">{property.rv_length}ft</span>. Please make sure your RV matches these specifications before booking.
            </p>
          </div>
        )}

        <button 
          disabled={isBooking}
          className={`w-full py-4 rounded-xl font-black uppercase tracking-[0.3em] italic text-xs transition-all duration-300 flex items-center justify-center gap-3 ${isBooking ? 'bg-slate-800 text-slate-500' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_10px_30px_rgba(37,99,235,0.3)] hover:shadow-blue-500/40 hover:-translate-y-1'}`}
        >
          {isBooking ? 'Submitting...' : (
            <>
              <FaCreditCard size={14} /> Request Reservation
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default BookingForm;

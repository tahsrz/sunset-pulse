'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { getDealByCode, normalizeCouponCode } from '@/lib/grill/deals';
import { 
  FaTrash, 
  FaArrowLeft, 
  FaCreditCard, 
  FaUtensils, 
  FaSpinner, 
  FaClock, 
  FaCalendarAlt, 
  FaBolt, 
  FaCheckCircle, 
  FaTimes,
  FaShoppingBasket,
  FaMapMarkerAlt,
  FaEnvelopeOpen,
  FaTag
} from 'react-icons/fa';
import { toast } from 'react-toastify';

const CartPage = () => {
  const {
    cart,
    removeFromCart,
    cartSubtotal,
    cartDiscount,
    cartTotal,
    couponCode,
    appliedDeal,
    applyCoupon,
    removeCoupon,
    clearCart,
    saveLastOrder
  } = useCart();

  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false); // false = ASAP, true = Scheduled
  const [selectedDate, setSelectedDate] = useState('today'); // 'today', 'tomorrow', 'day_after'
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null); // e.g. "12:30"
  const [isDelivery, setIsDelivery] = useState(false); // Local mailbox delivery fee flag
  const [couponInput, setCouponInput] = useState(couponCode || '');

  // Reset selected timeslot when changing date to prevent out-of-bounds selections
  useEffect(() => {
    setSelectedTimeSlot(null);
  }, [selectedDate, isScheduled]);

  useEffect(() => {
    setCouponInput(couponCode || '');
  }, [couponCode]);

  const deliveryFee = isDelivery ? 10.00 : 0;
  const displayTotal = cartTotal + deliveryFee;

  const applyCouponFromInput = () => {
    const normalized = normalizeCouponCode(couponInput);
    if (!normalized) {
      toast.warning('Enter a coupon code first.');
      return;
    }

    const deal = getDealByCode(normalized);
    if (!deal) {
      removeCoupon();
      toast.error('That coupon code is not active.');
      return;
    }

    applyCoupon(normalized);
    toast.success(`${deal.label} applied.`);
  };

  // Helper to generate 15-minute timeslots between 11:00 AM and 9:00 PM
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 11; hour <= 21; hour++) {
      for (const min of [0, 15, 30, 45]) {
        if (hour === 21 && min > 0) break; // Stop at 9:00 PM exactly
        const hStr = hour.toString().padStart(2, '0');
        const mStr = min.toString().padStart(2, '0');
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        slots.push({
          value: `${hStr}:${mStr}`,
          label: `${displayHour}:${mStr} ${period}`
        });
      }
    }
    return slots;
  };

  // Get available slots based on selected date (filters past times for today)
  const getTimeSlotsForSelectedDate = () => {
    const allSlots = generateTimeSlots();
    if (selectedDate !== 'today') return allSlots;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    return allSlots.filter(slot => {
      const [hStr, mStr] = slot.value.split(':');
      const slotHour = parseInt(hStr, 10);
      const slotMin = parseInt(mStr, 10);
      
      // Require slots to be at least 30 minutes in the future for preparation buffer
      const targetTimeInMins = currentHour * 60 + currentMin + 30;
      const slotTimeInMins = slotHour * 60 + slotMin;
      return slotTimeInMins > targetTimeInMins;
    });
  };

  const getDateLabel = (type) => {
    const d = new Date();
    if (type === 'tomorrow') d.setDate(d.getDate() + 1);
    if (type === 'day_after') d.setDate(d.getDate() + 2);
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getScheduledDateTime = () => {
    if (!isScheduled || !selectedTimeSlot) return null;
    const d = new Date();
    if (selectedDate === 'tomorrow') d.setDate(d.getDate() + 1);
    if (selectedDate === 'day_after') d.setDate(d.getDate() + 2);

    const [hour, min] = selectedTimeSlot.split(':');
    d.setHours(parseInt(hour, 10), parseInt(min, 10), 0, 0);
    return d.toISOString();
  };

  const handleStripeCheckout = async () => {
    if (isScheduled && !selectedTimeSlot) {
      toast.warning('Please select a pickup time slot first.');
      return;
    }

    setIsCheckoutLoading(true);
    const scheduledTime = getScheduledDateTime();
    const checkoutItems = isDelivery 
      ? [...cart, { id: 'delivery-fee', name: 'Mailbox Delivery Fee', price: 10.00, quantity: 1, discountEligible: false }]
      : cart;

    try {
      // 1. Create the order first in Pending state
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          items: checkoutItems, 
          couponCode,
          scheduledTime,
          checkoutIntent: 'stripe'
        }),
      });
      
      const orderResult = await orderRes.json();
      if (!orderRes.ok) throw new Error('Failed to create order.');
      const orderId = orderResult.data.id;

      // 2. Initialize Stripe with the order ID
      const res = await fetch('/api/checkout/grill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderId 
        }),
      });

      const data = await res.json();
      const checkoutUrl = data?.data?.url || data?.url;
      if (!res.ok) {
        throw new Error(data?.message || 'Stripe initialization failed.');
      }

      if (checkoutUrl) {
        if (saveLastOrder) saveLastOrder(checkoutItems, couponCode);
        if (clearCart) clearCart(); // Flush client cart
        window.location.href = checkoutUrl;
      } else {
        toast.error('Stripe initialization failed.');
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'Network error during checkout.');
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  const availableSlots = getTimeSlotsForSelectedDate();

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-white font-sans selection:bg-orange-500 selection:text-white pb-24 pt-12">
      
      {/* Background Glowing Ambient Orbs */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.05),transparent_60%)] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.04),transparent_60%)] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto px-4 relative z-10">
        
        {/* Header Back Button & Title */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <Link 
            href="/grill" 
            className="flex items-center gap-2.5 text-slate-400 hover:text-white font-mono text-xs uppercase tracking-widest transition-all group"
          >
            <FaArrowLeft className="group-hover:-translate-x-1 transition-transform" /> Back to Grill Menu
          </Link>

          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-orange-400 via-rose-500 to-amber-400 bg-clip-text text-transparent uppercase tracking-tight font-sans">
              Tray Review & Checkout
            </h1>
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-[0.3em] mt-1 text-right md:text-right">Gas & Grill Scheduling Hub</p>
          </div>
        </div>

        {cart.length === 0 ? (
          <div className="bg-white/5 border border-white/10 backdrop-blur-md p-16 rounded-[2.5rem] text-center shadow-2xl space-y-6">
            <div className="w-20 h-20 bg-orange-500/10 border border-orange-500/20 rounded-full flex items-center justify-center mx-auto text-orange-500 animate-pulse">
              <FaShoppingBasket size={32} />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-300">Your Tray is Empty</h2>
            <p className="text-slate-500 max-w-sm mx-auto font-serif italic text-sm">
              Our grates are hot and the flame is high. Head back to the menu to add some fresh sizzling burgers to your order tray!
            </p>
            <Link
              href="/grill"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-rose-600 hover:opacity-90 text-white font-black uppercase tracking-widest text-xs px-8 py-4 rounded-xl shadow-lg shadow-orange-500/10 transition-all active:scale-95"
            >
              <FaUtensils /> View Grill Menu
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Tray Items Review */}
            <div className="lg:col-span-7 space-y-8">
              <div className="bg-white/5 border border-white/10 backdrop-blur-md p-6 md:p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                <div className="flex items-center gap-3 pb-5 border-b border-white/5 mb-6">
                  <FaShoppingBasket className="text-orange-500" size={16} />
                  <h3 className="font-black uppercase tracking-widest text-xs font-sans text-slate-300">My Tray Items ({cart.reduce((s,i) => s+i.quantity, 0)})</h3>
                </div>

                <div className="divide-y divide-white/5">
                  {cart.map((item) => {
                    const itemId = item._id || item.id;
                    return (
                      <div
                        key={itemId}
                        className="flex items-center justify-between py-5 group relative"
                      >
                        <div className="flex-1 pr-4">
                          <h4 className="text-lg font-bold text-slate-100 group-hover:text-orange-400 transition-colors">
                            {item.name}
                          </h4>
                          <p className="text-xs text-slate-500 mt-1 font-serif italic">
                            ${item.price.toFixed(2)} x {item.quantity}
                          </p>
                          {item.instructions && (
                            <span className="inline-block bg-white/[0.02] border border-white/5 text-[9px] font-mono text-slate-400 rounded px-2 py-0.5 mt-2 max-w-full truncate">
                              Note: "{item.instructions}"
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="font-mono font-bold text-slate-300 text-sm">
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                          <button
                            onClick={() => removeFromCart(itemId)}
                            className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 hover:bg-red-500 hover:text-white transition-all transform hover:scale-105 active:scale-95"
                            title="Remove item"
                            aria-label="Remove item"
                          >
                            <FaTrash size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-6 border-t border-white/5 mt-6 flex justify-between items-baseline">
                  <span className="text-xs font-mono uppercase tracking-widest text-slate-500">Items Subtotal</span>
                  <span className="text-xl font-bold font-mono text-white">${cartSubtotal.toFixed(2)}</span>
                </div>

                {appliedDeal && (
                  <div className="pt-3 border-t border-white/5 mt-3 flex justify-between items-start gap-4 text-emerald-400 animate-fadeIn">
                    <div>
                      <span className="block text-xs font-mono uppercase tracking-widest text-emerald-500">Deal Applied</span>
                      <span className="block text-[10px] text-emerald-300/80 mt-1">{appliedDeal.label}</span>
                    </div>
                    <span className="text-lg font-bold font-mono">
                      {cartDiscount > 0 ? `-$${cartDiscount.toFixed(2)}` : 'Reward'}
                    </span>
                  </div>
                )}

                {isDelivery && (
                  <div className="pt-3 border-t border-white/5 mt-3 flex justify-between items-baseline text-slate-400 animate-fadeIn">
                    <span className="text-xs font-mono uppercase tracking-widest text-slate-500">Mailbox Delivery Surcharge</span>
                    <span className="text-lg font-bold font-mono text-orange-400">+$10.00</span>
                  </div>
                )}
                
                <div className="pt-6 border-t border-white/10 mt-6 flex justify-between items-baseline">
                  <span className="text-xs font-mono uppercase tracking-widest text-slate-500">
                    {isDelivery ? 'Total Surcharge Price' : 'Total Amount'}
                  </span>
                  <span className="text-3xl font-black text-white tracking-tight">
                    ${displayTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Calendly-Style Slot Picker & Checkout Button */}
            <div className="lg:col-span-5 space-y-8">
              
              {/* Scheduling Widget */}
              <div className="bg-white/5 border border-white/10 backdrop-blur-md p-6 md:p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                <div className="flex items-center gap-3 pb-5 border-b border-white/5 mb-6">
                  <FaClock className="text-rose-500" size={16} />
                  <h3 className="font-black uppercase tracking-widest text-xs font-sans text-slate-300">Pickup Dispatch</h3>
                </div>

                {/* ASAP vs Scheduled Pickup Toggle */}
                <div className="grid grid-cols-2 gap-2 bg-black/40 border border-white/5 rounded-2xl p-1 mb-6">
                  <button
                    onClick={() => setIsScheduled(false)}
                    className={`py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                      !isScheduled 
                        ? 'bg-gradient-to-r from-orange-500 to-rose-600 text-white shadow-md' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FaBolt size={10} className={!isScheduled ? 'animate-pulse' : ''} />
                    ⚡ ASAP
                  </button>
                  <button
                    onClick={() => setIsScheduled(true)}
                    className={`py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                      isScheduled 
                        ? 'bg-gradient-to-r from-orange-500 to-rose-600 text-white shadow-md' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                    id="schedule-pickup-toggle"
                  >
                    <FaCalendarAlt size={10} />
                    📅 Schedule
                  </button>
                </div>

                {/* Interactive Calendly Slot Picker Panel */}
                {isScheduled ? (
                  <div className="space-y-6 animate-fadeIn">
                    
                    {/* Date Selector Chips */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Choose Date</label>
                      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {['today', 'tomorrow', 'day_after'].map((day) => (
                          <button
                            key={day}
                            onClick={() => setSelectedDate(day)}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase whitespace-nowrap border transition-all ${
                              selectedDate === day
                                ? 'bg-orange-500/10 border-orange-500/30 text-orange-400 shadow-md'
                                : 'bg-white/[0.02] border-white/5 text-slate-400 hover:text-white hover:bg-white/[0.05]'
                            }`}
                          >
                            <span className="block text-[8px] opacity-60 font-mono tracking-widest">{day.toUpperCase()}</span>
                            {getDateLabel(day)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Time Slot Grid */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-baseline">
                        <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Select Available Slot</label>
                        <span className="text-[9px] text-slate-600 font-mono">11AM - 9PM • 15M Intervals</span>
                      </div>

                      {availableSlots.length > 0 ? (
                        <div className="grid grid-cols-3 gap-1.5 max-h-[200px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                          {availableSlots.map((slot) => (
                            <button
                              key={slot.value}
                              onClick={() => setSelectedTimeSlot(slot.value)}
                              className={`py-2 px-1 text-[10px] font-bold tracking-tight rounded-lg border text-center transition-all ${
                                selectedTimeSlot === slot.value
                                  ? 'bg-gradient-to-tr from-orange-600 to-rose-600 border-transparent text-white shadow-md'
                                  : 'bg-white/[0.02] border-white/5 text-slate-400 hover:text-white hover:border-orange-500/20'
                              }`}
                              id={`time-slot-${slot.value.replace(':', '-')}`}
                            >
                              {slot.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 bg-red-500/5 border border-dashed border-red-500/10 rounded-xl text-xs text-red-400 font-serif italic">
                          No remaining pickup slots available for today. Please schedule for tomorrow!
                        </div>
                      )}
                    </div>

                    {/* Selected Time Confirmation Badge */}
                    {selectedTimeSlot && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3 text-emerald-400 animate-slideUp">
                        <FaCheckCircle className="shrink-0 text-lg" />
                        <div className="text-left font-mono">
                          <span className="block text-[8px] text-emerald-500/60 uppercase tracking-wider leading-none">Roster Lock-in Scheduled</span>
                          <span className="text-xs font-bold leading-tight mt-1 inline-block">
                            {selectedDate.toUpperCase()} @ {selectedTimeSlot}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ASAP Banner */
                  <div className="p-6 bg-orange-500/5 border border-orange-500/10 rounded-3xl text-slate-400 space-y-3 animate-fadeIn">
                    <div className="flex items-center gap-3 text-orange-400">
                      <FaBolt size={18} className="animate-bounce" />
                      <h4 className="font-black uppercase text-xs tracking-wider">Immediate Preparation</h4>
                    </div>
                    <p className="text-xs leading-relaxed font-serif italic">
                      Burgers will be loaded onto the high-heat grill instantly. Preparation takes 10 to 15 minutes depending on queue velocity. Rushes are managed on a FIFO basis.
                    </p>
                  </div>
                )}
              </div>

              {/* Mailbox Delivery Option */}
              <div className="bg-white/5 border border-white/10 backdrop-blur-md p-6 md:p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                <div className="flex items-center gap-3 pb-5 border-b border-white/5 mb-6">
                  <FaMapMarkerAlt className="text-orange-500" size={16} />
                  <h3 className="font-black uppercase tracking-widest text-xs font-sans text-slate-300">Sunset Mailbox Delivery</h3>
                </div>

                <div className="space-y-4">
                  <p className="text-xs text-slate-400 font-light leading-relaxed">
                    Live in the Sunset community? We can deliver this hot order straight to your mailbox for a flat delivery fee.
                  </p>
                  
                  <button
                    onClick={() => setIsDelivery(!isDelivery)}
                    className={`w-full py-4 px-5 rounded-2xl border flex items-center justify-between transition-all duration-300 ${
                      isDelivery 
                        ? 'bg-orange-500/10 border-orange-500/30 text-orange-400 border-orange-500/40 shadow-lg shadow-orange-500/5' 
                        : 'bg-white/[0.02] border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 text-left">
                      <FaEnvelopeOpen className={isDelivery ? 'animate-bounce text-orange-400' : 'text-slate-500'} size={16} />
                      <div>
                        <span className="block text-xs font-bold uppercase tracking-wide">Deliver to Mailbox</span>
                        <span className="block text-[10px] opacity-60 font-mono mt-0.5">Flat Delivery Surcharge</span>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-sm">
                      {isDelivery ? 'SELECTED • +$10.00' : '+$10.00'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Coupon / Deal Option */}
              <div className="bg-white/5 border border-white/10 backdrop-blur-md p-6 md:p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                <div className="flex items-center gap-3 pb-5 border-b border-white/5 mb-6">
                  <FaTag className="text-emerald-400" size={16} />
                  <h3 className="font-black uppercase tracking-widest text-xs font-sans text-slate-300">Deal Code</h3>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      value={couponInput}
                      onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
                      placeholder="FREEDRINK"
                      className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-mono uppercase text-white outline-none placeholder:text-slate-600 focus:border-emerald-400/40"
                      maxLength={24}
                    />
                    <button
                      onClick={applyCouponFromInput}
                      className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 text-xs font-black uppercase tracking-widest text-emerald-300 hover:bg-emerald-500 hover:text-white transition-all"
                    >
                      Apply
                    </button>
                  </div>

                  {appliedDeal ? (
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">{appliedDeal.code}</div>
                          <div className="mt-1 text-xs font-bold">{appliedDeal.description}</div>
                        </div>
                        <button
                          onClick={removeCoupon}
                          className="rounded-lg p-2 text-emerald-300 hover:bg-black/20 hover:text-white transition-colors"
                          aria-label="Remove coupon"
                          title="Remove coupon"
                        >
                          <FaTimes size={12} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 font-serif italic">
                      One deal code can be used per order. Try FREEDRINK during the launch week.
                    </p>
                  )}
                </div>
              </div>

              {/* Checkout Dispatches */}
              <div className="bg-white/5 border border-white/10 backdrop-blur-md p-6 rounded-[2.5rem] shadow-2xl space-y-4">
                
                {/* Error/Notice if schedule is active but timeslot is missing */}
                {isScheduled && !selectedTimeSlot && (
                  <div className="text-center py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] text-amber-400 font-mono uppercase tracking-wider leading-relaxed">
                    ⚠️ PLEASE SELECT A TIME SLOT TO LOCK CHEF ROSTER
                  </div>
                )}

                {/* Stripe Pay button */}
                <button
                  onClick={handleStripeCheckout}
                  disabled={isCheckoutLoading || (isScheduled && !selectedTimeSlot)}
                  className="w-full bg-gradient-to-r from-orange-500 via-rose-500 to-purple-600 hover:opacity-90 disabled:opacity-30 text-white font-black uppercase tracking-widest text-xs py-4 px-6 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-3 shadow-lg shadow-orange-500/10 disabled:pointer-events-none"
                  id="checkout-stripe-button"
                >
                  {isCheckoutLoading ? <FaSpinner className="animate-spin" /> : <FaCreditCard />}
                  Pay Now with Card • ${(cartTotal + (isDelivery ? 10.00 : 0)).toFixed(2)}
                </button>

                <p className="text-center text-[10px] font-mono uppercase tracking-widest text-slate-500">
                  Secure online payment is required before the grill receives the order.
                </p>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default CartPage;

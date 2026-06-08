'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FaFire, 
  FaCheck, 
  FaClock, 
  FaArrowLeft, 
  FaVolumeUp, 
  FaVolumeMute, 
  FaReceipt, 
  FaSpinner, 
  FaExclamationTriangle,
  FaHourglassHalf,
  FaChevronRight,
  FaUtensils
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { PickupClaimCard } from '@/components/orders';

const TrackerPage = ({ params }) => {
  const router = useRouter();
  const { orderId } = params;

  const [order, setOrder] = useState(null);
  const [grillEmployee, setGrillEmployee] = useState('Shaikh');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  // Track status changes to play sound/toasts
  const prevStatusRef = useRef(null);

  // Helper to play notification ping
  const playAlertSound = () => {
    try {
      const audio = new Audio('/intro.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => console.log('Audio playback postponed until user interaction:', e));
    } catch (err) {
      console.error('Audio initialization error:', err);
    }
  };

  useEffect(() => {
    let intervalId = null;

    const fetchOrderDetails = async (isInitial = false) => {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('Order not found in the grid.');
          }
          throw new Error('Failed to retrieve order details.');
        }

        const json = await res.json();
        const { order: fetchedOrder, grillEmployee: fetchedEmployee } = json.data || {};

        if (!fetchedOrder) {
          throw new Error('Empty order details returned.');
        }

        setOrder(fetchedOrder);
        if (fetchedEmployee) {
          setGrillEmployee(fetchedEmployee);
        }

        // Check for state updates
        const currentStatus = fetchedOrder.status;
        if (prevStatusRef.current !== null && prevStatusRef.current !== currentStatus) {
          toast.success(`Order updated: ${currentStatus.toUpperCase()}`);
          if (audioEnabled) {
            playAlertSound();
          }
        }
        prevStatusRef.current = currentStatus;

        // If completed or cancelled, stop polling
        if (currentStatus === 'completed' || currentStatus === 'cancelled') {
          if (intervalId) {
            clearInterval(intervalId);
          }
        }

        setError(null);
      } catch (err) {
        console.error('[TRACKER_FETCH_ERROR]:', err);
        if (isInitial) {
          setError(err.message || 'Could not fetch order tracker details.');
        }
      } finally {
        if (isInitial) {
          setLoading(false);
        }
      }
    };

    // Run first fetch
    fetchOrderDetails(true);

    // Run polling every 5 seconds
    intervalId = setInterval(() => {
      fetchOrderDetails(false);
    }, 5000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [orderId, audioEnabled]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="relative flex items-center justify-center mb-6">
          <div className="w-24 h-24 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
          <FaFire className="absolute text-orange-500 animate-pulse" size={32} />
        </div>
        <h2 className="text-xl font-black uppercase tracking-[0.3em] text-orange-500 animate-pulse">Syncing Tracker...</h2>
        <p className="text-slate-500 font-mono text-xs mt-2 uppercase">Interrogating Grill Server Roster</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6">
        <div className="max-w-md w-full bg-white/5 border border-white/10 backdrop-blur-md p-10 rounded-[2.5rem] text-center shadow-2xl">
          <div className="inline-flex p-6 bg-red-500/10 border border-red-500/20 rounded-full text-red-500 mb-6">
            <FaExclamationTriangle size={48} className="animate-bounce" />
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tight text-red-500 mb-4">Signal Lost</h2>
          <p className="text-slate-400 mb-8 font-serif italic">{error || 'This order could not be located in the grid database.'}</p>
          <Link 
            href="/grill"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white font-black uppercase tracking-widest text-xs px-8 py-4 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <FaArrowLeft /> Return to Grill Menu
          </Link>
        </div>
      </div>
    );
  }

  // Calculate tracking state index
  const statusStages = ['pending', 'cooking', 'completed'];
  const currentStageIndex = statusStages.indexOf(order.status);
  const isCancelled = order.status === 'cancelled';

  // Format order date
  const orderTime = order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  const estimatedReadyTime = order.estimatedReadyAt
    ? new Date(order.estimatedReadyAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;
  const orderIdShort = order._id ? order._id.slice(-6).toUpperCase() : '';
  const pickupCode = order.pickupCode || orderIdShort;
  const mapPaymentState = (sourceOrder) => {
    switch (sourceOrder.paymentState) {
      case 'PAID_STRIPE':
        return 'paid_online';
      case 'PAID_POS':
        return 'paid_pos';
      case 'PENDING_POS_TENDER':
        return 'pending_pos';
      case 'PAYMENT_FAILED':
        return 'partial_issue';
      case 'REFUNDED':
        return 'refunded';
      case 'VOIDED':
        return 'voided';
      case 'MANUAL_REVIEW':
        return 'manual_review';
      default:
        return sourceOrder.isPaid ? 'paid_online' : 'unpaid_counter';
    }
  };
  const paymentState = mapPaymentState(order);
  const paymentBadge = {
    paid_online: { label: 'PAID // ONLINE', className: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' },
    paid_pos: { label: 'PAID // REGISTER', className: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' },
    pending_pos: { label: 'AWAITING REGISTER', className: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' },
    unpaid_counter: { label: 'PAY AT COUNTER', className: 'bg-amber-500/10 border-amber-500/30 text-amber-400' },
    partial_issue: { label: 'PAYMENT REVIEW', className: 'bg-amber-500/10 border-amber-500/30 text-amber-400' },
    refunded: { label: 'REFUNDED', className: 'bg-rose-500/10 border-rose-500/30 text-rose-400' },
    voided: { label: 'VOIDED', className: 'bg-rose-500/10 border-rose-500/30 text-rose-400' },
    manual_review: { label: 'MANUAL REVIEW', className: 'bg-amber-500/10 border-amber-500/30 text-amber-400' },
  }[paymentState];
  const claimOrder = {
    id: order._id,
    pickupCode,
    customerName: order.customerName,
    paymentState,
    paymentReference: order.paymentReference
      || (order.paymentSessionId ? `Stripe ${order.paymentSessionId.slice(-8)}` : undefined)
      || (order.posProperties?.authCode ? `Verifone ${order.posProperties.authCode}` : undefined),
    totalAmount: order.totalAmount || 0,
    items: (order.items || []).map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      ageRestricted: item.ageRestricted,
      minimumAge: item.minimumAge,
      restrictedCategory: item.restrictedCategory || 'none',
    })),
    releasedAt: order.releasedAt,
    idVerifiedAt: order.idVerifiedAt,
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-white font-sans selection:bg-orange-500 selection:text-white pb-20">
      
      {/* Custom keyframes & styles self-contained */}
      <style>{`
        @keyframes fireRise {
          0% { transform: translateY(10px) scale(0.9); opacity: 0; }
          50% { opacity: 0.9; }
          100% { transform: translateY(-75px) scale(0.4); opacity: 0; }
        }
        @keyframes fireSway {
          0%, 100% { margin-left: -5px; }
          50% { margin-left: 5px; }
        }
        @keyframes sparkleFloat {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-120px) rotate(360deg); opacity: 0; }
        }
        .sparkle {
          position: absolute;
          bottom: 24px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(251, 146, 60, 0.7);
          animation: sparkleFloat 2s infinite linear;
        }
        .sparkle-1 { left: 20%; animation-delay: 0.2s; animation-duration: 2.2s; }
        .sparkle-2 { left: 42%; animation-delay: 0.5s; animation-duration: 1.8s; }
        .sparkle-3 { left: 65%; animation-delay: 0.8s; animation-duration: 2.5s; }
        .sparkle-4 { left: 81%; animation-delay: 1.1s; animation-duration: 2s; }
        
        .flame-particle {
          position: absolute;
          bottom: 12px;
          width: 16px;
          height: 16px;
          border-radius: 50% 0 50% 50%;
          transform: rotate(-45deg);
          animation: fireRise 1.3s infinite ease-in, fireSway 1.2s infinite ease-in-out;
        }
        .flame-1 { left: 33%; background: linear-gradient(135deg, #ef4444, #f97316); animation-delay: 0s; }
        .flame-2 { left: 45%; background: linear-gradient(135deg, #f97316, #eab308); animation-delay: 0.25s; width: 22px; height: 22px; }
        .flame-3 { left: 56%; background: linear-gradient(135deg, #f97316, #ef4444); animation-delay: 0.55s; }
        .flame-4 { left: 22%; background: linear-gradient(135deg, #eab308, #f97316); animation-delay: 0.8s; width: 14px; height: 14px; }
        .flame-5 { left: 68%; background: linear-gradient(135deg, #ef4444, #eab308); animation-delay: 1.05s; }

        @keyframes confettiFloat {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-140px) rotate(720deg); opacity: 0; }
        }
        .confetti {
          position: absolute;
          bottom: 10px;
          width: 8px;
          height: 8px;
          animation: confettiFloat 3s infinite linear;
        }
        .confetti-1 { left: 15%; background: #10b981; animation-delay: 0.1s; animation-duration: 2.8s; }
        .confetti-2 { left: 32%; background: #3b82f6; animation-delay: 0.4s; animation-duration: 3.2s; }
        .confetti-3 { left: 50%; background: #eab308; animation-delay: 0.8s; animation-duration: 2.4s; }
        .confetti-4 { left: 68%; background: #ec4899; animation-delay: 1.2s; animation-duration: 3s; }
        .confetti-5 { left: 85%; background: #ef4444; animation-delay: 1.6s; animation-duration: 2.6s; }

        @keyframes subtlePulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        .pulse-ring-glow {
          animation: subtlePulse 3s infinite ease-in-out;
        }
      `}</style>

      {/* Header Bar */}
      <header className="px-6 py-8 border-b border-white/5 backdrop-blur-md bg-black/20 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link 
            href="/grill" 
            className="flex items-center gap-3 text-slate-400 hover:text-white font-mono text-xs uppercase tracking-widest transition-all group"
          >
            <FaArrowLeft className="group-hover:-translate-x-1 transition-transform" /> Menu
          </Link>

          <div className="text-center">
            <h1 className="text-xl font-black italic tracking-tighter bg-gradient-to-r from-red-500 via-orange-500 to-amber-400 bg-clip-text text-transparent uppercase">
              Sunset Pulse Grill
            </h1>
            <p className="text-[9px] text-slate-500 font-mono uppercase tracking-[0.4em] mt-1">Live Order Radar // Cal.com Shift Engine</p>
          </div>

          <button 
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`p-3 rounded-xl border transition-all ${
              audioEnabled ? 'bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20' : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10'
            }`}
            title={audioEnabled ? "Mute audio alerts" : "Enable audio alerts"}
          >
            {audioEnabled ? <FaVolumeUp size={16} /> : <FaVolumeMute size={16} />}
          </button>
        </div>
      </header>

      {/* Main Track Section */}
      <main className="max-w-6xl mx-auto px-4 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Pizza Tracker Timeline & Sizzling Canvas */}
        <div className="lg:col-span-8 space-y-8">
          <PickupClaimCard
            order={claimOrder}
            pickupWindow={order.status === 'completed' ? 'Ready now. Show this card at the counter.' : 'Show this card at the counter when your order is ready.'}
          />
          
          {/* Tracker Card */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-md p-8 md:p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
            
            {/* Top Details */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 pb-6 border-b border-white/5">
              <div>
                <span className="text-[10px] text-orange-500 font-mono uppercase tracking-[0.3em] font-black">Order Tracker</span>
                <h2 className="text-2xl font-black font-mono tracking-tight mt-1">
                  #{orderIdShort} <span className="text-sm font-normal text-slate-500">({orderTime})</span>
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-500 font-mono text-xs uppercase">Payment:</span>
                <span className={`${paymentBadge.className} border text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full`}>
                  {paymentBadge.label}
                </span>
              </div>
            </div>

            <div className="mb-10 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4">
                <span className="block text-[9px] font-mono uppercase tracking-[0.25em] text-orange-300">Estimated Wait</span>
                <span className="mt-1 block text-2xl font-black text-white">{order.estimatedWaitMinutes || 15} min</span>
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <span className="block text-[9px] font-mono uppercase tracking-[0.25em] text-emerald-300">Estimated Ready</span>
                <span className="mt-1 block text-2xl font-black text-white">{estimatedReadyTime || 'Calculating'}</span>
              </div>
            </div>

            {/* Stepper Timeline (Reminiscent of Domino's Tracker) */}
            {!isCancelled ? (
              <div className="mb-14">
                <div className="relative flex justify-between items-center w-full">
                  
                  {/* Background Track Line */}
                  <div className="absolute top-1/2 left-0 right-0 h-1 bg-white/5 -translate-y-1/2 rounded-full z-0"></div>
                  
                  {/* Progress Line Glow */}
                  <div 
                    className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-500 -translate-y-1/2 rounded-full transition-all duration-1000 z-0"
                    style={{ 
                      width: currentStageIndex === 0 ? '12%' : 
                             currentStageIndex === 1 ? '50%' : 
                             currentStageIndex === 2 ? '100%' : '0%' 
                    }}
                  ></div>

                  {/* Step 1: Received */}
                  <div className="relative z-10 flex flex-col items-center group">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all duration-700 shadow-xl ${
                      currentStageIndex >= 0 
                        ? 'bg-orange-500 border-orange-400 text-white shadow-orange-500/20 scale-110' 
                        : 'bg-slate-900 border-white/10 text-slate-500'
                    }`}>
                      <FaReceipt size={18} />
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-wider mt-3 transition-colors duration-700 ${
                      currentStageIndex >= 0 ? 'text-orange-500' : 'text-slate-500'
                    }`}>
                      Received
                    </span>
                  </div>

                  {/* Step 2: Sizzling */}
                  <div className="relative z-10 flex flex-col items-center group">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all duration-700 shadow-xl ${
                      currentStageIndex >= 1 
                        ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-amber-500/20 scale-110' 
                        : currentStageIndex === 0
                          ? 'bg-slate-900 border-orange-500/50 text-orange-500 animate-pulse'
                          : 'bg-slate-900 border-white/10 text-slate-500'
                    }`}>
                      <FaFire size={18} />
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-wider mt-3 transition-colors duration-700 ${
                      currentStageIndex >= 1 ? 'text-amber-400' : 'text-slate-500'
                    }`}>
                      Sizzling
                    </span>
                  </div>

                  {/* Step 3: Pickup */}
                  <div className="relative z-10 flex flex-col items-center group">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all duration-700 shadow-xl ${
                      currentStageIndex >= 2 
                        ? 'bg-emerald-500 border-emerald-400 text-white shadow-emerald-500/20 scale-110' 
                        : currentStageIndex === 1
                          ? 'bg-slate-900 border-amber-500/40 text-amber-500'
                          : 'bg-slate-900 border-white/10 text-slate-500'
                    }`}>
                      <FaCheck size={18} />
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-wider mt-3 transition-colors duration-700 ${
                      currentStageIndex >= 2 ? 'text-emerald-400' : 'text-slate-500'
                    }`}>
                      Pickup
                    </span>
                  </div>

                </div>
              </div>
            ) : (
              // Cancelled Banner
              <div className="mb-14 p-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 text-red-400">
                <FaExclamationTriangle size={24} className="animate-pulse shrink-0" />
                <div>
                  <h3 className="font-black uppercase text-xs tracking-wider">This Order Has Been Aborted</h3>
                  <p className="text-xs text-red-400/70 mt-1 font-serif">The kitchen has cancelled or voided this ticket. If this is an error, please reach out to the grill cashier immediately.</p>
                </div>
              </div>
            )}

            {/* Sizzling Canvas / Active Visualizer Panel */}
            <div className="bg-black/40 border border-white/5 rounded-3xl p-8 relative overflow-hidden flex flex-col items-center text-center min-h-[220px] justify-center shadow-inner">
              
              {order.status === 'pending' && (
                <div className="space-y-4 animate-scaleUp">
                  <div className="relative inline-flex items-center justify-center">
                    <div className="w-16 h-16 border-2 border-dashed border-orange-500/30 rounded-full animate-spin"></div>
                    <FaHourglassHalf className="absolute text-orange-400 animate-bounce" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold uppercase tracking-tight text-white">Prepping Ingredients</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-2 font-serif">
                      We've queued your ticket and are gathering your items. Hang tight, our scheduled grill master is about to fire up the burners!
                    </p>
                  </div>
                </div>
              )}

              {order.status === 'cooking' && (
                <div className="space-y-6 w-full animate-scaleUp relative z-10">
                  {/* Fire Animation Background */}
                  <div className="absolute inset-x-0 -bottom-8 h-32 flex justify-center overflow-hidden pointer-events-none opacity-40 z-0">
                    <div className="w-48 h-full relative">
                      <div className="flame-particle flame-1"></div>
                      <div className="flame-particle flame-2"></div>
                      <div className="flame-particle flame-3"></div>
                      <div className="flame-particle flame-4"></div>
                      <div className="flame-particle flame-5"></div>
                      <div className="sparkle sparkle-1"></div>
                      <div className="sparkle sparkle-2"></div>
                      <div className="sparkle sparkle-3"></div>
                      <div className="sparkle sparkle-4"></div>
                    </div>
                  </div>

                  {/* Sizzling Icon Content */}
                  <div className="relative inline-flex items-center justify-center z-10">
                    <div className="w-20 h-20 bg-gradient-to-b from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-full flex items-center justify-center animate-pulse">
                      <FaFire className="text-orange-500 animate-bounce" size={32} />
                    </div>
                  </div>

                  <div className="z-10 relative">
                    <h3 className="text-xl font-black uppercase tracking-tight text-amber-400">Sizzling on the Grill</h3>
                    <p className="text-xs text-slate-300 max-w-sm mx-auto mt-2 font-serif">
                      The fire is high and your patties are sizzling under the expert care of our rostered chef:
                    </p>

                    {/* Grill master callout */}
                    <div className="mt-5 inline-flex items-center gap-3 bg-white/5 border border-white/10 px-6 py-3 rounded-2xl shadow-xl">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center font-black text-xs text-slate-950 uppercase">
                        {grillEmployee[0]}
                      </div>
                      <div className="text-left">
                        <span className="block text-[8px] font-mono text-slate-500 uppercase tracking-widest leading-none">Rostered Grill Master</span>
                        <span className="text-sm font-black tracking-tight text-white leading-tight">{grillEmployee}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {order.status === 'completed' && (
                <div className="space-y-4 animate-scaleUp relative w-full">
                  {/* Floating celebration stars */}
                  <div className="absolute inset-x-0 -bottom-8 h-36 flex justify-center overflow-hidden pointer-events-none opacity-40 z-0">
                    <div className="w-56 h-full relative">
                      <div className="confetti confetti-1"></div>
                      <div className="confetti confetti-2"></div>
                      <div className="confetti confetti-3"></div>
                      <div className="confetti confetti-4"></div>
                      <div className="confetti confetti-5"></div>
                    </div>
                  </div>

                  <div className="relative inline-flex items-center justify-center z-10">
                    <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/10">
                      <FaCheck className="text-emerald-400 animate-pulse" size={32} />
                    </div>
                  </div>
                  <div className="z-10 relative">
                    <h3 className="text-xl font-black uppercase tracking-tight text-emerald-400">Order Hot & Ready!</h3>
                    <p className="text-xs text-slate-300 max-w-sm mx-auto mt-2 font-serif">
                      Ding! Grill Master **{grillEmployee}** has completed your order! Head directly to the counter to collect your fresh, hot meal. Let's dig in!
                    </p>
                  </div>
                </div>
              )}

              {order.status === 'cancelled' && (
                <div className="space-y-4 animate-scaleUp">
                  <div className="relative inline-flex items-center justify-center">
                    <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center">
                      <FaExclamationTriangle className="text-red-400" size={24} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold uppercase tracking-tight text-red-500">Ticket Aborted</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-2 font-serif">
                      This order was marked as cancelled. If this is an issue or you did not request a void, please contact the Sunset Grill staff.
                    </p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Right Column: Receipt Summary Card */}
        <div className="lg:col-span-4">
          <div className="bg-white/5 border border-white/10 backdrop-blur-md p-8 rounded-[2.5rem] shadow-2xl space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-white/5">
              <FaReceipt className="text-slate-400" size={16} />
              <h3 className="font-black uppercase tracking-widest text-xs">Tray Receipt</h3>
            </div>

            {/* Items list */}
            <div className="divide-y divide-white/5 font-serif text-sm italic">
              {order.items && order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between py-3">
                  <div className="text-slate-300">
                    <span className="font-sans font-black text-xs text-orange-500 not-italic mr-2">{item.quantity}x</span>
                    {item.name}
                  </div>
                  <span className="font-sans font-bold text-xs text-slate-400 not-italic">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Pricing details */}
            <div className="pt-4 border-t border-white/5 space-y-2">
              <div className="flex justify-between text-slate-500 text-xs">
                <span>Subtotal</span>
                <span>${order.totalAmount ? order.totalAmount.toFixed(2) : '0.00'}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-xs">
                <span>Tax (Included)</span>
                <span>$0.00</span>
              </div>
              <div className="flex justify-between text-white font-black text-xl pt-2 border-t border-dashed border-white/10">
                <span className="uppercase tracking-tight text-xs font-sans self-center">Total Amount</span>
                <span>${order.totalAmount ? order.totalAmount.toFixed(2) : '0.00'}</span>
              </div>
            </div>

            {/* Additional info block */}
            <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl space-y-3 font-mono text-[10px] text-slate-500 uppercase tracking-wider">
              <div className="flex justify-between">
                <span>Rostered Cook:</span>
                <span className="text-slate-300 font-bold">{grillEmployee}</span>
              </div>
              <div className="flex justify-between">
                <span>KDS Ticket ID:</span>
                <span className="text-slate-300 font-bold">#{order._id.slice(-8).toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span>Pickup Code:</span>
                <span className="text-cyan-300 font-bold">{pickupCode}</span>
              </div>
              <div className="rounded-xl border border-white/10 bg-white p-3">
                <div
                  className="h-14 w-full"
                  style={{
                    background: `repeating-linear-gradient(90deg, #020617 0 3px, #fff 3px 6px, #020617 6px 8px, #fff 8px 12px)`,
                  }}
                  aria-label={`Barcode for pickup code ${pickupCode}`}
                />
                <div className="mt-2 text-center font-mono text-sm font-black tracking-[0.35em] text-slate-950">
                  {pickupCode}
                </div>
              </div>
              <div className="flex justify-between">
                <span>Release State:</span>
                <span className={order.releasedAt ? 'text-emerald-500 font-bold' : 'text-amber-400 font-bold'}>
                  {order.releasedAt ? 'Released' : 'Counter Verify'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Status Poller:</span>
                <span className="text-emerald-500 animate-pulse font-bold">Active // 5s</span>
              </div>
            </div>

            {/* Return Link button */}
            <Link 
              href="/grill"
              className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-black uppercase tracking-widest text-xs py-4 px-6 rounded-2xl transition-all border border-white/5 shadow-inner"
            >
              <FaUtensils size={12} /> Place Another Order
            </Link>
          </div>
        </div>

      </main>

    </div>
  );
};

export default TrackerPage;

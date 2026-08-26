'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FaCashRegister, FaFire, FaCheck, FaClock, FaExclamationTriangle, FaTrash, FaVolumeUp, FaLock, FaWifi } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { StaffPickupVerificationPanel, type VerifiablePickupOrder } from '@/components/orders';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  ageRestricted?: boolean;
  minimumAge?: 18 | 21;
  restrictedCategory?: 'tobacco' | 'alcohol' | 'lotto' | 'fuel' | 'none';
}

interface Order {
  _id: string;
  items: OrderItem[];
  subtotalAmount?: number;
  discountAmount?: number;
  coupon?: {
    code?: string;
    label?: string;
    description?: string;
    type?: 'fixed_amount' | 'percent' | 'free_item' | null;
    discountAmount?: number;
    freeItemName?: string;
  };
  totalAmount: number;
  status: 'pending' | 'cooking' | 'ready' | 'completed' | 'cancelled';
  isPaid: boolean;
  paymentState?: 'UNPAID' | 'PENDING_POS_TENDER' | 'PAID_STRIPE' | 'PAID_POS' | 'PAYMENT_FAILED' | 'REFUNDED' | 'VOIDED' | 'MANUAL_REVIEW';
  createdAt: string;
  paymentSessionId?: string;
  paymentReference?: string;
  estimatedWaitMinutes?: number;
  estimatedReadyAt?: string;
  phoneRelay?: {
    status?: 'not_started' | 'not_configured' | 'pending' | 'confirmed' | 'repeat_requested' | 'needs_human' | 'no_input' | 'failed' | 'sent';
    relayId?: string;
    callSid?: string;
    attempts?: number;
    lastDigits?: string;
    lastError?: string;
    lastCalledAt?: string;
    confirmedAt?: string;
  };
  pickupCode?: string;
  customerName?: string;
  releasedAt?: string;
  idVerifiedAt?: string;
  posProperties?: {
    terminalId?: string | null;
    posTransactionId?: string | null;
    authCode?: string | null;
    posSyncStatus?: string;
  };
}

interface RestockRow {
  name: string;
  category: string;
  unitsSold: number;
  recommendedUnits: number;
  urgencyScore: number;
}

const KitchenDisplaySystem = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastOrderCount, setLastOrderCount] = useState(0);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [restockRows, setRestockRows] = useState<RestockRow[]>([]);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinEntry, setPinEntry] = useState('');
  const [lastFetchAt, setLastFetchAt] = useState<Date | null>(null);
  const [failedFetches, setFailedFetches] = useState(0);
  const [wakeLockState, setWakeLockState] = useState<'idle' | 'active' | 'blocked'>('idle');

  const getKdsHeaders = (pinOverride?: string) => {
    let deviceId = window.localStorage.getItem('sunset-kds-device-id');
    if (!deviceId) {
      deviceId = `kds-${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
      window.localStorage.setItem('sunset-kds-device-id', deviceId);
    }

    return {
      'Content-Type': 'application/json',
      'x-kds-pin': pinOverride || window.localStorage.getItem('sunset-kds-pin') || '',
      'x-kds-device-id': deviceId,
    };
  };

  useEffect(() => {
    setIsUnlocked(window.localStorage.getItem('sunset-kds-unlocked') === 'true');
  }, []);

  useEffect(() => {
    if (!isUnlocked) return;

    let lock: any = null;
    let cancelled = false;

    const requestWakeLock = async () => {
      try {
        const wakeLock = (navigator as any).wakeLock;
        if (!wakeLock?.request) {
          setWakeLockState('blocked');
          return;
        }
        lock = await wakeLock.request('screen');
        if (!cancelled) setWakeLockState('active');
        lock.addEventListener?.('release', () => {
          if (!cancelled) setWakeLockState('blocked');
        });
      } catch {
        if (!cancelled) setWakeLockState('blocked');
      }
    };

    requestWakeLock();

    return () => {
      cancelled = true;
      lock?.release?.();
    };
  }, [isUnlocked]);

  const fetchOrders = useCallback(async () => {
    if (!isUnlocked) return;

    try {
      const res = await fetch('/api/orders', {
        headers: getKdsHeaders(),
      });
      if (res.ok) {
        const result = await res.json();
        const activeOrders = result.data || [];
        setOrders(activeOrders);

        // Play sound if new order detected
        if (activeOrders.length > lastOrderCount && isAudioEnabled) {
          const audio = new Audio('/intro.mp3'); // Using existing asset as ping
          audio.play().catch(e => console.log('Audio play failed', e));
        }
        setLastOrderCount(activeOrders.length);
        setLastFetchAt(new Date());
        setFailedFetches(0);
      } else {
        setFailedFetches((current) => current + 1);
      }
      const restockRes = await fetch('/api/inventory/restock-advice');
      if (restockRes.ok) {
        const restockPayload = await restockRes.json();
        setRestockRows(restockPayload?.data?.recommendations || []);
      }
    } catch (error) {
      console.error('KDS Fetch Error:', error);
      setFailedFetches((current) => current + 1);
    } finally {
      setLoading(false);
    }
  }, [isUnlocked, lastOrderCount, isAudioEnabled]);

  useEffect(() => {
    if (!isUnlocked) return;
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [fetchOrders, isUnlocked]);

  const unlockKds = async () => {
    const submittedPin = pinEntry.trim();
    if (!submittedPin) {
      toast.error('Enter the KDS PIN.');
      return;
    }

    try {
      const res = await fetch('/api/orders', {
        headers: getKdsHeaders(submittedPin),
      });

      if (!res.ok) {
        toast.error('Invalid KDS PIN.');
        return;
      }

      window.localStorage.setItem('sunset-kds-unlocked', 'true');
      window.localStorage.setItem('sunset-kds-pin', submittedPin);
      setIsUnlocked(true);
      setLoading(false);
    } catch {
      toast.error('Could not verify KDS access.');
    }
  };

  const lockKds = () => {
    window.localStorage.removeItem('sunset-kds-unlocked');
    window.localStorage.removeItem('sunset-kds-pin');
    setIsUnlocked(false);
    setPinEntry('');
  };

  const enableAudio = () => {
    setIsAudioEnabled((current) => !current);
    try {
      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextCtor();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.frequency.value = 880;
      gain.gain.value = 0.08;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.12);
    } catch {
      // Browser may block audio until a later gesture.
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: getKdsHeaders(),
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        toast.info(`Order ${status.toUpperCase()}`);
        fetchOrders();
      } else {
        const payload = await res.json().catch(() => null);
        toast.error(payload?.message || 'Failed to update order.');
      }
    } catch (error) {
      toast.error('Failed to update order.');
    }
  };

  const purgeOrder = async (id: string) => {
    if (!window.confirm("Remove this order?")) return;
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'DELETE',
        headers: getKdsHeaders(),
      });
      if (res.ok) {
        toast.warning('Order removed.');
        fetchOrders();
      } else {
        const payload = await res.json().catch(() => null);
        toast.error(payload?.message || 'Failed to purge order.');
      }
    } catch (error) {
      toast.error('Failed to purge order.');
    }
  };

  const getTimeElapsed = (createdAt: string) => {
    const start = new Date(createdAt).getTime();
    const now = new Date().getTime();
    const diff = Math.floor((now - start) / 60000); // minutes
    return diff;
  };

  const updateOrderAction = async (id: string, action: 'verify-id' | 'release') => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: getKdsHeaders(),
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        toast.success(action === 'verify-id' ? 'ID checkpoint verified.' : 'Pickup order released.');
        fetchOrders();
      } else {
        toast.error('Order action failed.');
      }
    } catch (error) {
      toast.error('Failed to update pickup verification.');
    }
  };

  const preparePosTender = async (id: string) => {
    try {
      const res = await fetch('/api/verifone/transaction/prepare', {
        method: 'POST',
        headers: getKdsHeaders(),
        body: JSON.stringify({ orderId: id, terminalId: 'Register 1', bridgeId: 'kds-pi-01' }),
      });

      if (res.ok) {
        toast.info('Order sent to Verifone register queue.');
        fetchOrders();
      } else {
        const payload = await res.json().catch(() => null);
        toast.error(payload?.message || 'Could not send order to register.');
      }
    } catch (error) {
      toast.error('Register queue request failed.');
    }
  };

  const mapPaymentState = (order: Order): VerifiablePickupOrder['paymentState'] => {
    switch (order.paymentState) {
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
        return order.isPaid ? 'paid_online' : 'unpaid_counter';
    }
  };

  const paymentBadge = (order: Order) => {
    const paymentState = mapPaymentState(order);
    if (paymentState === 'paid_online') return { label: 'STRIPE PAID', className: 'bg-emerald-500 text-white' };
    if (paymentState === 'paid_pos') return { label: 'POS PAID', className: 'bg-emerald-500 text-white' };
    if (paymentState === 'pending_pos') return { label: 'AT REGISTER', className: 'bg-cyan-500 text-slate-950' };
    if (paymentState === 'partial_issue' || paymentState === 'manual_review') return { label: 'PAY REVIEW', className: 'bg-amber-400 text-slate-950' };
    if (paymentState === 'refunded' || paymentState === 'voided') return { label: 'VOID/REFUND', className: 'bg-rose-500 text-white' };
    return { label: 'COUNTER PAY', className: 'bg-slate-700 text-slate-100' };
  };

  const relayBadge = (order: Order) => {
    const status = order.phoneRelay?.status || 'not_started';
    if (status === 'confirmed') return { label: 'CALL CONFIRMED', className: 'bg-emerald-500 text-white' };
    if (status === 'pending') return { label: 'CALL PENDING', className: 'bg-sky-500 text-white' };
    if (status === 'repeat_requested') return { label: 'CALL REPEATED', className: 'bg-indigo-500 text-white' };
    if (status === 'sent') return { label: 'CALL SENT', className: 'bg-sky-500 text-white' };
    if (status === 'failed' || status === 'needs_human' || status === 'no_input') return { label: 'CALL REVIEW', className: 'bg-amber-400 text-slate-950' };
    if (status === 'not_configured') return { label: 'CALL NOT SET', className: 'bg-slate-600 text-white' };
    return { label: 'NO CALL YET', className: 'bg-slate-800 text-slate-300' };
  };

  const connectionOk = failedFetches === 0;

  if (!isUnlocked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black p-6 text-white">
        <section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-950 p-8 shadow-2xl shadow-red-950/30">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-600/20 text-red-200">
            <FaLock size={28} />
          </div>
          <h1 className="mt-6 text-4xl font-black uppercase tracking-tight text-white">KDS Locked</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Enter the kitchen display PIN before using this tablet at the counter or grill.
          </p>
          <input
            value={pinEntry}
            onChange={(event) => setPinEntry(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') unlockKds();
            }}
            inputMode="numeric"
            type="password"
            placeholder="KDS PIN"
            className="mt-6 w-full rounded-2xl border border-white/10 bg-black px-5 py-5 text-center text-3xl font-black tracking-[0.35em] text-white outline-none focus:border-red-300"
          />
          <button
            type="button"
            onClick={unlockKds}
            className="mt-4 w-full rounded-2xl bg-red-600 px-5 py-5 text-sm font-black uppercase tracking-[0.2em] text-white hover:bg-red-500"
          >
            Unlock Kitchen Screen
          </button>
          <p className="mt-4 text-xs text-slate-600">
            PINs are verified by the server before order data is shown.
          </p>
        </section>
      </main>
    );
  }

  const toVerifiableOrder = (order: Order): VerifiablePickupOrder => {
    const shortId = order._id.slice(-6).toUpperCase();
    return {
      id: order._id,
      pickupCode: order.pickupCode || shortId,
      customerName: order.customerName,
      paymentState: mapPaymentState(order),
      paymentReference: order.paymentReference
        || (order.paymentSessionId ? `Stripe ${order.paymentSessionId.slice(-8)}` : undefined)
        || (order.posProperties?.authCode ? `Verifone ${order.posProperties.authCode}` : undefined),
      totalAmount: order.totalAmount,
      releasedAt: order.releasedAt,
      idVerifiedAt: order.idVerifiedAt,
      items: order.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        ageRestricted: item.ageRestricted,
        minimumAge: item.minimumAge,
        restrictedCategory: item.restrictedCategory || 'none',
      })),
    };
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans select-none">
      {/* KDS Header */}
      <header className="mb-10 border-b-2 border-white/10 pb-6">
        <div className={`mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
          connectionOk ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100' : 'border-red-300/30 bg-red-500/15 text-red-100'
        }`}>
          <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.18em]">
            <FaWifi />
            {connectionOk ? 'Store Link Online' : `Connection Warning (${failedFetches})`}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">
            <span>Last Sync: {lastFetchAt ? lastFetchAt.toLocaleTimeString() : 'Not synced'}</span>
            <span>Wake Lock: {wakeLockState}</span>
            <button type="button" onClick={lockKds} className="rounded-lg border border-white/10 px-3 py-2 text-slate-200 hover:bg-white/10">
              Lock
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black italic tracking-tighter uppercase text-red-600">
            Kitchen Orders
          </h1>
          <p className="text-slate-500 font-mono text-xs uppercase tracking-[0.5em] mt-2">
            Kitchen Display System // Active Orders
          </p>
        </div>
        
        <div className="flex items-center gap-6">
          <button 
            onClick={enableAudio}
            className={`p-4 rounded-2xl border transition-all ${isAudioEnabled ? 'bg-red-600 border-red-400 text-white' : 'bg-white/5 border-white/10 text-slate-500'}`}
          >
            <FaVolumeUp size={24} />
          </button>
          <div className="text-right">
            <span className="text-[10px] text-slate-600 block uppercase font-black">Active Orders</span>
            <span className="text-4xl font-black italic">{orders.length}</span>
          </div>
        </div>
        </div>
      </header>

      <section className="mb-8 rounded-2xl border border-amber-300/20 bg-amber-950/20 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-black uppercase tracking-[0.18em] text-amber-100">Restock Radar</h2>
          <span className="text-xs font-bold text-amber-200/80">Today</span>
        </div>
        {restockRows.length === 0 ? (
          <p className="text-sm text-slate-300">No urgent restock items from paid sales yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {restockRows.slice(0, 9).map((row) => (
              <div key={`${row.name}-${row.category}`} className="rounded-xl border border-white/10 bg-black/25 p-3">
                <p className="text-sm font-black text-white">{row.name}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-slate-400">{row.category}</p>
                <p className="mt-2 text-xs text-slate-300">
                  Sold today: <span className="font-black text-amber-200">{row.unitsSold}</span>
                </p>
                <p className="text-xs text-slate-300">
                  Suggested stock-up: <span className="font-black text-emerald-200">{row.recommendedUnits}</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {loading && orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[60vh] text-slate-800">
          <FaFire size={120} className="animate-pulse mb-8" />
          <h2 className="text-2xl font-black uppercase tracking-[0.5em]">Loading Orders...</h2>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[60vh] border-4 border-dashed border-white/5 rounded-[3rem]">
          <FaClock size={80} className="text-slate-900 mb-6" />
          <h2 className="text-slate-700 text-3xl font-black uppercase tracking-widest italic">All Quiet on the Grill</h2>
          <p className="text-slate-800 font-mono mt-4 uppercase">No pending orders.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {orders.map((order) => {
            const minutesElapsed = getTimeElapsed(order.createdAt);
            const isUrgent = minutesElapsed > 15;
            const badge = paymentBadge(order);
            const phoneRelayBadge = relayBadge(order);
            const estimatedReadyTime = order.estimatedReadyAt
              ? new Date(order.estimatedReadyAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : null;

            return (
              <div 
                key={order._id} 
                className={`relative flex flex-col bg-slate-900 border-2 rounded-[2rem] overflow-hidden transition-all duration-500 ${
                  order.status === 'ready' ? 'border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.22)]' :
                  order.status === 'cooking' ? 'border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.2)]' : 
                  isUrgent ? 'border-red-600 animate-pulse' : 'border-white/10'
                }`}
              >
                {/* Order Top Strip */}
                <div className={`p-4 flex justify-between items-center ${
                  order.status === 'ready' ? 'bg-green-600' :
                  order.status === 'cooking' ? 'bg-orange-600' : 
                  isUrgent ? 'bg-red-600' : 'bg-white/5'
                }`}>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-xs uppercase tracking-widest">
                      #{order._id.slice(-4).toUpperCase()}
                    </span>
                    <span className={`${badge.className} text-[8px] font-black px-2 py-0.5 rounded-full animate-pulse`}>
                      {badge.label}
                    </span>
                    <span className={`${phoneRelayBadge.className} text-[8px] font-black px-2 py-0.5 rounded-full`}>
                      {phoneRelayBadge.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[10px] font-bold">
                    <FaClock /> {minutesElapsed}m
                  </div>
                </div>

                {/* Items List */}
                <div className="p-6 flex-grow space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-orange-300/20 bg-orange-400/10 p-3">
                      <p className="text-[8px] font-black uppercase tracking-[0.16em] text-orange-200">Est. Wait</p>
                      <p className="mt-1 text-lg font-black text-white">{order.estimatedWaitMinutes || 15}m</p>
                    </div>
                    <div className="rounded-xl border border-emerald-300/20 bg-emerald-400/10 p-3">
                      <p className="text-[8px] font-black uppercase tracking-[0.16em] text-emerald-200">Ready Around</p>
                      <p className="mt-1 text-lg font-black text-white">{estimatedReadyTime || '--'}</p>
                    </div>
                  </div>
                  {order.phoneRelay?.lastError && (
                    <div className="rounded-xl border border-amber-300/20 bg-amber-400/10 p-3 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-100">
                      Phone relay: {order.phoneRelay.lastError}
                    </div>
                  )}
                  {order.coupon?.code && (
                    <div className="rounded-xl border border-emerald-300/20 bg-emerald-400/10 p-3 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-100">
                      Deal {order.coupon.code}: {order.coupon.type === 'free_item'
                        ? `Give ${order.coupon.freeItemName || 'reward item'} at pickup`
                        : `${order.coupon.label || 'Discount'} - $${(order.discountAmount || order.coupon.discountAmount || 0).toFixed(2)} off`}
                    </div>
                  )}
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start border-b border-white/5 pb-2">
                      <div className="flex gap-4">
                        <span className="text-2xl font-black text-red-500">{item.quantity}x</span>
                        <span className="text-xl font-bold uppercase tracking-tighter leading-tight">{item.name}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Status Bar */}
                <div className="px-4 pb-4">
                  {mapPaymentState(order) === 'unpaid_counter' && (
                    <button
                      type="button"
                      onClick={() => preparePosTender(order._id)}
                      className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-cyan-100 hover:bg-cyan-400/20"
                    >
                      <FaCashRegister /> Send To Register
                    </button>
                  )}
                  {mapPaymentState(order) === 'pending_pos' && (
                    <div className="mb-3 rounded-xl border border-cyan-300/20 bg-cyan-400/10 p-3 text-xs font-bold text-cyan-100">
                      Awaiting Verifone tender from {order.posProperties?.terminalId || 'assigned register'}.
                    </div>
                  )}
                  <StaffPickupVerificationPanel
                    order={toVerifiableOrder(order)}
                    onVerifyId={() => updateOrderAction(order._id, 'verify-id')}
                    onRelease={() => updateOrderAction(order._id, 'release')}
                    onReject={() => toast.warning('Order moved to staff review.')}
                  />
                </div>

                <div className="p-4 bg-black/40 mt-auto grid grid-cols-2 gap-2">
                  {order.status === 'pending' ? (
                    <button 
                      onClick={() => updateStatus(order._id, 'cooking')}
                      className="col-span-2 bg-orange-600 hover:bg-orange-500 text-white py-6 rounded-xl font-black uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2"
                    >
                      <FaFire /> Start Cooking
                    </button>
                  ) : order.status === 'cooking' ? (
                    <button
                      onClick={() => updateStatus(order._id, 'ready')}
                      className="col-span-2 bg-green-600 hover:bg-green-500 text-white py-6 rounded-xl font-black uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2"
                    >
                      <FaCheck /> Mark Ready
                    </button>
                  ) : (
                    <button 
                      onClick={() => updateStatus(order._id, 'completed')}
                      className="col-span-2 bg-blue-600 hover:bg-blue-500 text-white py-6 rounded-xl font-black uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2"
                    >
                      <FaCheck /> Customer Picked Up
                    </button>
                  )}
                  
                  <button 
                    onClick={() => purgeOrder(order._id)}
                    className="col-span-2 mt-2 py-2 text-slate-700 hover:text-red-500 text-[10px] font-black uppercase tracking-[0.4em] transition-colors flex items-center justify-center gap-2"
                  >
                    <FaTrash size={8} /> Remove Order
                  </button>
                </div>

                {isUrgent && (
                  <div className="absolute top-2 right-2">
                    <FaExclamationTriangle className="text-white text-xl" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Info */}
      <footer className="mt-20 border-t border-white/5 pt-8 flex justify-between items-center opacity-30">
        <p className="text-[10px] font-mono uppercase tracking-[0.5em]">System Status: Online // Sunset Gas Grill</p>
        <p className="text-[10px] font-mono uppercase tracking-[0.5em]">Refreshed: {new Date().toLocaleTimeString()}</p>
      </footer>
    </div>
  );
};

export default KitchenDisplaySystem;
;

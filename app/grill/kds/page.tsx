'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FaFire, FaCheck, FaClock, FaExclamationTriangle, FaTrash, FaVolumeUp } from 'react-icons/fa';
import { toast } from 'react-toastify';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  _id: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'cooking' | 'completed' | 'cancelled';
  isPaid: boolean;
  createdAt: string;
}

const KitchenDisplaySystem = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastOrderCount, setLastOrderCount] = useState(0);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders');
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
      }
    } catch (error) {
      console.error('KDS Fetch Error:', error);
    } finally {
      setLoading(false);
    }
  }, [lastOrderCount, isAudioEnabled]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        toast.info(`Order ${status.toUpperCase()}`);
        fetchOrders();
      }
    } catch (error) {
      toast.error('Failed to update order.');
    }
  };

  const purgeOrder = async (id: string) => {
    if (!window.confirm("Remove this order?")) return;
    try {
      const res = await fetch(`/api/orders/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.warning('Order removed.');
        fetchOrders();
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

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans select-none">
      {/* KDS Header */}
      <header className="flex justify-between items-center mb-10 border-b-2 border-white/10 pb-6">
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
            onClick={() => setIsAudioEnabled(!isAudioEnabled)}
            className={`p-4 rounded-2xl border transition-all ${isAudioEnabled ? 'bg-red-600 border-red-400 text-white' : 'bg-white/5 border-white/10 text-slate-500'}`}
          >
            <FaVolumeUp size={24} />
          </button>
          <div className="text-right">
            <span className="text-[10px] text-slate-600 block uppercase font-black">Active Orders</span>
            <span className="text-4xl font-black italic">{orders.length}</span>
          </div>
        </div>
      </header>

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

            return (
              <div 
                key={order._id} 
                className={`relative flex flex-col bg-slate-900 border-2 rounded-[2rem] overflow-hidden transition-all duration-500 ${
                  order.status === 'cooking' ? 'border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.2)]' : 
                  isUrgent ? 'border-red-600 animate-pulse' : 'border-white/10'
                }`}
              >
                {/* Order Top Strip */}
                <div className={`p-4 flex justify-between items-center ${
                  order.status === 'cooking' ? 'bg-orange-600' : 
                  isUrgent ? 'bg-red-600' : 'bg-white/5'
                }`}>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-xs uppercase tracking-widest">
                      #{order._id.slice(-4).toUpperCase()}
                    </span>
                    {order.isPaid && (
                      <span className="bg-emerald-500 text-[8px] font-black px-2 py-0.5 rounded-full text-white animate-pulse">
                        PAID
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[10px] font-bold">
                    <FaClock /> {minutesElapsed}m
                  </div>
                </div>

                {/* Items List */}
                <div className="p-6 flex-grow space-y-4">
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
                <div className="p-4 bg-black/40 mt-auto grid grid-cols-2 gap-2">
                  {order.status === 'pending' ? (
                    <button 
                      onClick={() => updateStatus(order._id, 'cooking')}
                      className="col-span-2 bg-orange-600 hover:bg-orange-500 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2"
                    >
                      <FaFire /> Start Cooking
                    </button>
                  ) : (
                    <button 
                      onClick={() => updateStatus(order._id, 'completed')}
                      className="col-span-2 bg-green-600 hover:bg-green-500 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2"
                    >
                      <FaCheck /> Complete Order
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

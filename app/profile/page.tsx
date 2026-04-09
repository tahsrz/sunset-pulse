'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Spinner from '@/components/Spinner';
import IdentityCard from '@/components/profile/IdentityCard';
import SystemSettings from '@/components/profile/SystemSettings';
import PropertyAssetCard from '@/components/profile/PropertyAssetCard';
import { toast } from 'react-toastify';
import { FaFingerprint, FaHome } from 'react-icons/fa';

const ProfilePage = () => {
  const { user, loading: authLoading } = useAuth();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProperties = async (userId: string) => {
      try {
        const res = await fetch(`/api/properties/user/${userId}`);
        if (res.status === 200) {
          const data = await res.json();
          setProperties(data);
        }
      } catch (error) {
        console.error('Error fetching properties:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchUserProperties(user.id);
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const handleDeleteProperty = async (propertyId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this property?');
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/properties/${propertyId}`, { method: 'DELETE' });
      if (res.status === 200) {
        setProperties(prev => prev.filter((p) => p._id !== propertyId));
        toast.success('Property removed successfully.');
      } else {
        toast.error('Failed to remove property.');
      }
    } catch (error) {
      console.error(error);
      toast.error('An error occurred while deleting the property.');
    }
  };

  if (authLoading) return <Spinner loading={authLoading} />;

  if (!user) {
    return (
      <div className='min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center'>
        <FaFingerprint size={60} className='text-blue-500/20 mb-6' />
        <h1 className='text-3xl font-black text-white mb-4'>Access Restricted</h1>
        <p className='text-slate-500 uppercase tracking-widest text-xs mb-8'>Please sign in to access your dashboard.</p>
        <Link href='/login' className='bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-[0.3em] hover:bg-blue-500 transition-all'>
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <section className='min-h-screen bg-slate-950 text-white py-24 px-6'>
      <div className='max-w-7xl mx-auto'>
        <div className='flex flex-col lg:flex-row gap-12'>
          
          {/* Dashboard Sidebar */}
          <div className='lg:w-1/3 space-y-8'>
            <IdentityCard user={user} />
            <SystemSettings />
          </div>

          {/* Main Content: Properties */}
          <div className='lg:w-2/3 space-y-8'>
            <div className='flex items-center justify-between'>
              <div>
                <h2 className='text-2xl font-black italic tracking-tighter'>Property Dashboard</h2>
                <p className='text-[10px] text-slate-500 uppercase tracking-widest mt-1'>Manage your listed properties and assets</p>
              </div>
              <div className='bg-white/5 px-4 py-2 rounded-xl border border-white/10'>
                <span className='text-xl font-mono font-black text-blue-400'>{properties.length}</span>
                <span className='text-[8px] font-black text-white/20 uppercase tracking-widest ml-2'>Properties</span>
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              {loading ? (
                <div className='col-span-2 py-20 flex justify-center'><Spinner loading={loading} /></div>
              ) : properties.length === 0 ? (
                <div className='col-span-2 py-20 bg-white/[0.01] border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-4 text-center'>
                  <FaHome className='text-white/5' size={40} />
                  <div>
                    <p className='text-xs font-bold uppercase tracking-widest text-white/40'>No properties found.</p>
                    <p className='text-[10px] text-slate-600 mt-2 uppercase'>Start by listing your first property in the marketplace.</p>
                  </div>
                </div>
              ) : (
                properties.map((property) => (
                  <PropertyAssetCard 
                    key={property._id} 
                    property={property} 
                    onDelete={handleDeleteProperty} 
                  />
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default ProfilePage;

'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import profileDefault from '@/assets/images/profile.png';
import Spinner from '@/components/Spinner';
import ComplexObservationsManager from '@/components/ComplexObservationsManager';
import { useTheme } from '@/context/ThemeProvider';
import { toast } from 'react-toastify';
import { FaShieldAlt, FaIdCard, FaBolt, FaCheckCircle, FaUser, FaEnvelope, FaFingerprint } from 'react-icons/fa';

const ProfilePage = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdvancedMode, setAdvancedMode, customKeybind, setCustomKeybind } = useTheme();
  
  const profileImage = user?.user_metadata?.avatar_url;
  const profileName = user?.user_metadata?.full_name || user?.user_metadata?.user_name;
  const profileEmail = user?.email;
  const role = user?.user_metadata?.role || 'consumer';
  const licenseId = user?.user_metadata?.license_id;

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProperties = async (userId) => {
      if (!userId) return;

      try {
        const res = await fetch(`/api/properties/user/${userId}`);
        if (res.status === 200) {
          const data = await res.json();
          setProperties(data);
        }
      } catch (error) {
        console.error(error);
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

  const handleDeleteProperty = async (propertyId) => {
    const confirmed = window.confirm('Are you sure you want to delete this property?');
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/properties/${propertyId}`, { method: 'DELETE' });
      if (res.status === 200) {
        setProperties(properties.filter((p) => p._id !== propertyId));
        toast.success('Property Deleted');
      } else {
        toast.error('Failed to delete property');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete property');
    }
  };

  if (authLoading) return <Spinner loading={authLoading} />;

  if (!user) {
    return (
      <div className='min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center'>
        <FaFingerprint size={60} className='text-blue-500/20 mb-6' />
        <h1 className='text-3xl font-black italic text-white mb-4'>Access Denied</h1>
        <p className='text-slate-500 uppercase tracking-widest text-xs mb-8'>Identity link not established in this sector.</p>
        <Link href='/login' className='bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] hover:bg-blue-500 transition-all'>
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <section className='min-h-screen bg-slate-950 text-white py-24 px-6'>
      <div className='max-w-7xl mx-auto'>
        <div className='flex flex-col lg:flex-row gap-12'>
          
          {/* LEFT COLUMN: IDENTITY GRID */}
          <div className='lg:w-1/3 space-y-8'>
            <div className='bg-white/[0.02] border border-white/10 rounded-3xl p-8 backdrop-blur-xl relative overflow-hidden'>
              {/* Role Badge Overlay */}
              <div className='absolute top-6 right-6'>
                {role === 'realtor' ? (
                  <div className='flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 px-3 py-1.5 rounded-xl'>
                    <FaShieldAlt className='text-blue-400' size={14} />
                    <span className='text-[10px] font-black uppercase tracking-widest text-blue-400'>Verified Realtor</span>
                  </div>
                ) : (
                  <div className='flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl'>
                    <FaUser className='text-white/40' size={14} />
                    <span className='text-[10px] font-black uppercase tracking-widest text-white/40'>Consumer</span>
                  </div>
                )}
              </div>

              <div className='mb-8 relative'>
                <div className='w-40 h-40 rounded-3xl overflow-hidden border-2 border-white/10 mx-auto lg:mx-0 group'>
                  <Image
                    className='object-cover transition-transform duration-500 group-hover:scale-110'
                    src={profileImage || profileDefault}
                    fill
                    alt='Profile Identity'
                  />
                </div>
                <div className='absolute -bottom-4 -right-4 lg:right-auto lg:-left-4 bg-green-500 text-black p-3 rounded-2xl shadow-xl shadow-green-500/20'>
                  <FaCheckCircle size={20} />
                </div>
              </div>

              <div className='space-y-6'>
                <div>
                  <label className='text-[8px] font-black text-white/20 uppercase tracking-[0.3em] block mb-1'>Name</label>
                  <h1 className='text-3xl font-black italic tracking-tighter truncate'>{profileName}</h1>
                </div>
                
                <div className='flex items-center gap-3 p-4 bg-black/40 rounded-2xl border border-white/5'>
                  <FaEnvelope className='text-blue-500/40' />
                  <div className='truncate'>
                    <label className='text-[8px] font-black text-white/20 uppercase tracking-[0.3em] block'>Email Address</label>
                    <span className='text-xs font-mono text-blue-400'>{profileEmail}</span>
                  </div>
                </div>

                {role === 'realtor' && (
                  <div className='flex items-center gap-3 p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20'>
                    <FaIdCard className='text-purple-400' />
                    <div>
                      <label className='text-[8px] font-black text-purple-400/40 uppercase tracking-[0.3em] block'>License ID</label>
                      <span className='text-xs font-mono text-purple-400'>{licenseId || 'UNSET'}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className='mt-10'>
                <ComplexObservationsManager />
              </div>
            </div>

            {/* SYSTEM SETTINGS GRID */}
            <div className='bg-white/[0.02] border border-white/10 rounded-3xl p-8 backdrop-blur-xl'>
              <h3 className='text-xs font-black uppercase tracking-[0.4em] text-white/40 mb-8 flex items-center gap-3'>
                <FaBolt className='text-blue-500' /> Logic_Gates
              </h3>
              
              <div className='space-y-8'>
                <div className='flex items-center justify-between'>
                  <div>
                    <h4 className='text-sm font-bold text-white'>Advanced Mode</h4>
                    <p className='text-[10px] text-slate-500 mt-1 leading-relaxed'>Synchronize with Command Post grid state.</p>
                  </div>
                  <button 
                    onClick={() => setAdvancedMode(!isAdvancedMode)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${isAdvancedMode ? 'bg-blue-600' : 'bg-white/10'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all shadow-lg ${isAdvancedMode ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className='pt-8 border-t border-white/5'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <h4 className='text-sm font-bold text-white'>Quick Trigger</h4>
                      <p className='text-[10px] text-slate-500 mt-1 leading-relaxed'>Spatial awareness activation key.</p>
                    </div>
                    <div className='flex items-center gap-2'>
                      <span className='text-[9px] font-mono text-white/20 uppercase'>Shift +</span>
                      <input 
                        type='text' 
                        maxLength={1}
                        className='w-10 h-10 bg-black/40 text-center font-black border border-white/10 rounded-xl focus:border-blue-500 outline-none text-blue-400 transition-all uppercase'
                        value={customKeybind}
                        onChange={(e) => {
                          const val = e.target.value.slice(-1).toUpperCase();
                          if (val && /[A-Z0-9]/.test(val)) setCustomKeybind(val);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: ASSET INVENTORY */}
          <div className='lg:w-2/3 space-y-8'>
            <div className='flex items-center justify-between'>
              <div>
                <h2 className='text-2xl font-black italic tracking-tighter'>Asset Inventory</h2>
                <p className='text-[10px] text-slate-500 uppercase tracking-widest mt-1'>Managed property nodes in the sector</p>
              </div>
              <div className='bg-white/5 px-4 py-2 rounded-xl border border-white/10'>
                <span className='text-xl font-mono font-black text-blue-400'>{properties.length}</span>
                <span className='text-[8px] font-black text-white/20 uppercase tracking-widest ml-2'>Nodes</span>
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              {loading ? (
                <div className='col-span-2 py-20 flex justify-center'><Spinner loading={loading} /></div>
              ) : properties.length === 0 ? (
                <div className='col-span-2 py-20 bg-white/[0.01] border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-4'>
                  <FaBolt className='text-white/5' size={40} />
                  <p className='text-xs font-black uppercase tracking-widest text-white/20'>No nodes deployed in this sector.</p>
                </div>
              ) : (
                properties.map((property) => (
                  <div key={property._id} className='bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden group hover:border-blue-500/30 transition-all'>
                    <Link href={`/properties/${property._id}`} className='relative h-48 block overflow-hidden'>
                      <Image
                        className='object-cover transition-transform duration-700 group-hover:scale-110'
                        src={property.images[0]}
                        alt=''
                        fill
                      />
                      <div className='absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent opacity-60' />
                      <div className='absolute bottom-4 left-4 right-4'>
                        <h3 className='text-lg font-black truncate'>{property.name}</h3>
                        <p className='text-[10px] text-white/60 font-mono truncate uppercase'>
                          {property.location.city}, {property.location.state}
                        </p>
                      </div>
                    </Link>
                    <div className='p-4 flex gap-2'>
                      <Link
                        href={`/properties/${property._id}/edit`}
                        className='flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-center transition-all'
                      >
                        Recalibrate
                      </Link>
                      <button
                        onClick={() => handleDeleteProperty(property._id)}
                        className='px-6 py-3 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all'
                      >
                        Decommission
                      </button>
                    </div>
                  </div>
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

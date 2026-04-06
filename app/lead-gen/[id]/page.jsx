'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FaArrowLeft, FaMagic, FaCopy, FaCheck, FaBullhorn, FaRobot, FaEnvelopeOpenText } from 'react-icons/fa';
import Spinner from '@/components/Spinner';

const LeadGenDetailPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || (session.user.role !== 'realtor' && session.user.role !== 'admin')) {
      router.push('/');
      return;
    }

    const fetchPropertyData = async () => {
      try {
        const res = await fetch(`/api/properties/${id}`);
        if (!res.ok) throw new Error('Failed to fetch property');
        const data = await res.json();
        setProperty(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPropertyData();
  }, [id]);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) return <Spinner />;
  if (!property) return <div className="text-center p-10">Asset not found.</div>;

  const templates = [
    {
      id: 'intercept',
      name: 'Automated Intercept',
      icon: <FaRobot className="text-blue-500" />,
      description: 'Triggered when a user spends >30s in 3D orbit. Focused on urgency.',
      content: `Hey, I see you're analyzing ${property.name}. I'm Jamie, the lead agent here. This ${property.type} is seeing high intensity today. Would you like a live drone walkthrough before the next investor locks it?`
    },
    {
      id: 'social',
      name: 'Neural Social Ad',
      icon: <FaMagic className="text-purple-500" />,
      description: 'Optimized for high-clickthrough on visual platforms. Hyper-targeted.',
      content: `UNITS DETECTED: ${property.name} in ${property.location.city}. This isn't just a property; it's a yield engine. ${property.beds}B/${property.baths}B footprint with elite neural rendering available. Click to intercept this asset.`
    },
    {
      id: 'investor',
      name: 'VIP Investor Deck',
      icon: <FaEnvelopeOpenText className="text-green-500" />,
      description: 'Formal outreach for institutional or high-net-worth buyers.',
      content: `Subject: Priority Access - ${property.name} (${property.location.city}, ${property.location.state})

Dear Investor,

Our proprietary telemetry has flagged ${property.name} as a high-potential acquisition. Located in the ${property.location.city} corridor, this asset features ${property.amenities?.slice(0, 3).join(', ')}.

Full 3D digital twin and RentCast analytics are ready for your review.`
    }
  ];

  return (
    <section className="bg-slate-900 min-h-screen p-8 text-white">
      <div className="max-w-6xl mx-auto">
        <button 
          onClick={() => router.push('/lead-gen')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 uppercase text-[10px] font-black tracking-widest"
        >
          <FaArrowLeft /> Return to Command
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column: Asset Intel */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800 rounded-2xl p-6 border border-white/5 shadow-2xl sticky top-8">
              <div className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-2 italic">Selected Asset</div>
              <h1 className="text-2xl font-black italic uppercase mb-6 tracking-tighter">{property.name}</h1>
              
              <img 
                src={property.images?.[0] || '/images/property-placeholder.jpg'} 
                alt={property.name}
                className="w-full h-48 object-cover rounded-xl mb-6 grayscale hover:grayscale-0 transition-all duration-700"
              />

              <div className="space-y-4">
                <div className="flex justify-between text-xs border-b border-white/5 pb-2">
                  <span className="text-slate-500 font-bold uppercase">Status</span>
                  <span className="text-green-400 font-black">ACTIVE_INTERCEPT</span>
                </div>
                <div className="flex justify-between text-xs border-b border-white/5 pb-2">
                  <span className="text-slate-500 font-bold uppercase">Type</span>
                  <span className="text-white font-black">{property.type}</span>
                </div>
                <div className="flex justify-between text-xs border-b border-white/5 pb-2">
                  <span className="text-slate-500 font-bold uppercase">Location</span>
                  <span className="text-white font-black">{property.location.city}, {property.location.state}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Template Config */}
          <div className="lg:col-span-2 space-y-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-600 rounded-xl text-white shadow-lg">
                <FaBullhorn size={24} />
              </div>
              <div>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter">Lead Gen Templates</h2>
                <p className="text-slate-400 text-sm font-medium">Neural-optimized copy for various capture channels.</p>
              </div>
            </div>

            {templates.map((tpl) => (
              <div key={tpl.id} className="bg-slate-800/50 border border-white/5 rounded-3xl p-8 hover:border-blue-500/30 transition-all group">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-slate-900 rounded-2xl group-hover:scale-110 transition-transform">
                      {tpl.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-black italic uppercase tracking-tight">{tpl.name}</h3>
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{tpl.description}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleCopy(tpl.content, tpl.id)}
                    className="p-3 bg-slate-900 hover:bg-blue-600 rounded-xl transition-all border border-white/10"
                  >
                    {copiedId === tpl.id ? <FaCheck className="text-green-400" /> : <FaCopy />}
                  </button>
                </div>

                <div className="bg-slate-950/50 rounded-2xl p-6 border border-white/5 font-mono text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {tpl.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LeadGenDetailPage;

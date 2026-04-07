'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useProperties } from '@/hooks/useProperties';
import { FaMapMarkerAlt, FaBed, FaBath } from 'react-icons/fa';

interface RecommendedPropertiesProps {
  currentPropertyId: string;
  type?: string;
}

const RecommendedProperties: React.FC<RecommendedPropertiesProps> = ({ currentPropertyId, type }) => {
  const { properties, loading } = useProperties();

  // Simple recommendation logic: same type, excluding current
  const recommended = properties
    .filter(p => p._id !== currentPropertyId && (type ? p.type === type : true))
    .slice(0, 3);

  if (loading) return <div className="animate-pulse h-40 bg-slate-100 rounded-xl" />;
  if (recommended.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 mt-6">
      <h3 className="text-lg font-black uppercase tracking-widest text-slate-800 mb-6 border-b-2 border-blue-500 pb-2 inline-block">
        Recommended
      </h3>
      
      <div className="space-y-6">
        {recommended.map((p) => (
          <Link key={p._id} href={`/properties/${p._id}`} className="group block">
            <div className="relative h-32 w-full mb-3 rounded-xl overflow-hidden shadow-lg">
              <Image 
                src={p.images?.[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=400&auto=format&fit=crop'} 
                alt={p.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute top-2 right-2 bg-blue-600 text-white text-[8px] font-black px-2 py-1 rounded-md uppercase tracking-widest">
                ${(p.rates?.monthly || p.rates?.nightly)?.toLocaleString()}
              </div>
            </div>
            
            <h4 className="font-bold text-sm text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1">
              {p.name}
            </h4>
            
            <div className="flex items-center gap-1 text-slate-400 text-[10px] mb-2">
              <FaMapMarkerAlt size={8} />
              <span>{p.location?.city}, {p.location?.state}</span>
            </div>

            <div className="flex gap-3 text-[10px] font-bold text-slate-600">
              <div className="flex items-center gap-1"><FaBed size={10} /> {p.beds || 0}</div>
              <div className="flex items-center gap-1"><FaBath size={10} /> {p.baths || 0}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default RecommendedProperties;

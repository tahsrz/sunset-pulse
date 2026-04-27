'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, Search, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { memoryBridge } from '@/lib/memory_bridge';

interface HeroSearchProps {
  isEntered: boolean;
  isAdvancedMode: boolean;
  query: string;
  setQuery: (query: string) => void;
}

const HeroSearch: React.FC<HeroSearchProps> = ({ isEntered, isAdvancedMode, query, setQuery }) => {
  const router = useRouter();

  const handleSearch = () => {
    if (query.trim() === '') {
      router.push('/properties');
    } else {
      // Memory Layer 1: Log Interaction
      memoryBridge.logInteraction(`Hero Search: ${query}`);

      // Memory Layer 2 & 3: Save to Dynamic/Session
      memoryBridge.save('session', 'location', query);
      memoryBridge.save('dynamic', 'location', query);

      router.push(`/properties/search-results?location=${encodeURIComponent(query)}&propertyType=All`);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  return (
    <div 
      className={`absolute inset-0 z-40 flex flex-col items-center justify-end pb-20 px-6 pointer-events-none transition-all duration-1000 delay-1000 ${
        isEntered ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <form 
        onSubmit={onSubmit}
        className="w-full max-w-2xl bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-2 flex items-center pointer-events-auto shadow-2xl animate-in slide-in-from-bottom-12 duration-1000"
      >
        <div className="pl-4 pr-2 text-white/50">
          <MapPin size={24} />
        </div>
        <input 
          type="text"
          placeholder="Search a city, ZIP, or property to start the brief..."
          className="flex-grow py-4 px-2 text-lg text-white bg-transparent focus:outline-none placeholder:text-white/30"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button 
          type="submit"
          className="bg-primary text-white p-4 rounded-xl hover:bg-primary/80 transition-colors flex items-center gap-2 group"
        >
          <Search size={20} className="group-hover:scale-110 transition-transform" />
        </button>
      </form>

      <div className="mt-8 flex gap-4 pointer-events-auto">
         <Link href="/properties" className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-full text-white hover:bg-white/10 transition-all text-sm font-medium">
          Browse Opportunities
        </Link>
        {isAdvancedMode && (
          <Link href="/command-post" className="flex items-center gap-2 px-6 py-3 bg-primary/20 border border-primary/30 rounded-full text-primary hover:bg-primary/30 transition-all text-sm font-medium">
            <Sparkles size={16} />
            Command Post
          </Link>
        )}
      </div>
    </div>
  );
};

export default HeroSearch;

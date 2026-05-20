'use client';

import AdvancedSearchWidget from '@/components/AdvancedSearchWidget';
import Properties from '@/components/Properties';
import SunsetHistorySection from '@/components/marketing/SunsetHistorySection';
import { useRouter } from 'next/navigation';

interface SearchFilters {
  location?: string;
  propertyType?: string;
  amenities?: string[];
  [key: string]: any;
}

const PropertiesPage: React.FC = () => {
  const router = useRouter();

  const handleSearch = (filters: SearchFilters) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value) {
        if (key === 'amenities' && Array.isArray(value)) {
          if (value.length > 0) params.append(key, value.join(','));
        } else {
          params.append(key, value.toString());
        }
      }
    });
    router.push(`/properties/search-results?${params.toString()}`);
  };

  const handleSaveAlert = async (filters: SearchFilters) => {
    try {
      const res = await fetch('/api/search/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: filters, frequency: 'daily' }),
      });
      if (res.ok) {
        alert('Search alert saved successfully.');
      }
    } catch (error) {
      console.error('Save alert error:', error);
    }
  };

  return (
    <>
      <section className='bg-slate-900 py-10 shadow-inner border-b border-white/10'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <AdvancedSearchWidget onSearch={handleSearch} onSaveAlert={handleSaveAlert} />
        </div>
      </section>
      <Properties />
      <SunsetHistorySection />
    </>
  );
};

export default PropertiesPage;

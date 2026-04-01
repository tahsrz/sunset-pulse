'use client';
import AdvancedSearchWidget from '@/components/AdvancedSearchWidget';
import Properties from '@/components/Properties';
import { useRouter } from 'next/navigation';

const PropertiesPage = () => {
  const router = useRouter();

  const handleSearch = (filters) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        if (key === 'amenities') {
          if (filters[key].length > 0) params.append(key, filters[key].join(','));
        } else {
          params.append(key, filters[key]);
        }
      }
    });
    router.push(`/properties/search-results?${params.toString()}`);
  };

  const handleSaveAlert = async (filters) => {
    try {
      const res = await fetch('/api/search/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: filters, frequency: 'daily' }),
      });
      if (res.ok) {
        alert('Recon alert deployed successfully.');
      }
    } catch (error) {
      console.error('Save alert error:', error);
    }
  };

  return (
    <>
      <section className='bg-blue-700 py-10 shadow-inner'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <AdvancedSearchWidget onSearch={handleSearch} onSaveAlert={handleSaveAlert} />
        </div>
      </section>
      <Properties />
    </>
  );
};
export default PropertiesPage;

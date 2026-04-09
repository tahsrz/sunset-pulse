'use client';

import React from 'react';
import AdvancedSearchWidget from '@/components/AdvancedSearchWidget';

interface SearchHeaderProps {
  onSearch: (filters: any) => void;
}

const SearchHeader: React.FC<SearchHeaderProps> = ({ onSearch }) => {
  return (
    <section className='bg-slate-900 py-6 border-b border-white/5'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <AdvancedSearchWidget onSearch={onSearch} />
      </div>
    </section>
  );
};

export default SearchHeader;

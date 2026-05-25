'use client';
import { useState } from 'react';
import { FaSearch, FaSlidersH, FaBell } from 'react-icons/fa';

interface AdvancedSearchFilters {
  location: string;
  propertyType: string;
  minPrice: string;
  maxPrice: string;
  beds: string;
  baths: string;
  amenities: string[];
  includeMLS: boolean;
}

interface AdvancedSearchWidgetProps {
  onSearch: (filters: AdvancedSearchFilters) => void;
  onSaveAlert?: (filters: AdvancedSearchFilters) => void;
}

const AdvancedSearchWidget: React.FC<AdvancedSearchWidgetProps> = ({ onSearch, onSaveAlert }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<AdvancedSearchFilters>({
    location: '',
    propertyType: 'All',
    minPrice: '',
    maxPrice: '',
    beds: '',
    baths: '',
    amenities: [],
    includeMLS: true
  });

  const propertyTypes = ['All', 'House', 'Apartment', 'RV Park', 'Condo', 'Industrial', 'Office', 'Senior Living', 'Mobile Home'];
  const commonAmenities = ['Wifi', 'Pool', 'Gym', 'Parking', 'RV Hookup', 'Laundry'];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const toggleAmenity = (amenity: string) => {
    setFilters(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity) 
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(filters);
  };

  return (
    <div className='w-full max-w-4xl mx-auto bg-white/95 backdrop-blur shadow-2xl rounded-2xl overflow-hidden border border-slate-200'>
      <form onSubmit={handleSearch} className='p-6'>
        {/* Top Row: Basic Search */}
        <div className='flex flex-col md:flex-row gap-4'>
          <div className='flex-1 relative'>
            <FaSearch className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400' />
            <input
              type='text'
              name='location'
              placeholder='Search by city, address, or zip...'
              className='w-full pl-12 pr-4 py-4 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 font-medium'
              value={filters.location}
              onChange={handleChange}
            />
          </div>
          <select
            name='propertyType'
            className='md:w-48 px-4 py-4 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700'
            value={filters.propertyType}
            onChange={handleChange}
          >
            {propertyTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button
            type='submit'
            className='bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95'
          >
            Search
          </button>
        </div>

        {/* Toggle Advanced Filters */}
        <div className='mt-4 flex justify-between items-center'>
          <button
            type='button'
            onClick={() => setIsExpanded(!isExpanded)}
            className='flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-xs uppercase tracking-widest transition-colors'
          >
            <FaSlidersH /> {isExpanded ? 'Hide Filters' : 'Advanced Filters'}
          </button>
          
          <div className='flex gap-4'>
             <button
              type='button'
              onClick={() => onSaveAlert?.(filters)}
              className='flex items-center gap-2 text-amber-600 hover:text-amber-700 font-bold text-xs uppercase tracking-widest transition-colors'
            >
              <FaBell /> Save Alert
            </button>
          </div>
        </div>

        {/* Advanced Section */}
        {isExpanded && (
          <div className='mt-8 pt-8 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in slide-in-from-top-4 duration-300'>
            {/* Price Range */}
            <div>
              <h4 className='text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4'>Price Range</h4>
              <div className='flex gap-2 items-center'>
                <input
                  type='number'
                  name='minPrice'
                  placeholder='Min'
                  className='w-full p-3 rounded-lg bg-slate-50 border-none text-sm'
                  value={filters.minPrice}
                  onChange={handleChange}
                />
                <span className='text-slate-300'>-</span>
                <input
                  type='number'
                  name='maxPrice'
                  placeholder='Max'
                  className='w-full p-3 rounded-lg bg-slate-50 border-none text-sm'
                  value={filters.maxPrice}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Beds / Baths */}
            <div>
              <h4 className='text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4'>Beds & Baths</h4>
              <div className='flex gap-2'>
                <select name='beds' className='w-full p-3 rounded-lg bg-slate-50 border-none text-sm' value={filters.beds} onChange={handleChange}>
                  <option value=''>Min Beds</option>
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}+ Beds</option>)}
                </select>
                <select name='baths' className='w-full p-3 rounded-lg bg-slate-50 border-none text-sm' value={filters.baths} onChange={handleChange}>
                  <option value=''>Min Baths</option>
                  {[1,2,3].map(n => <option key={n} value={n}>{n}+ Baths</option>)}
                </select>
              </div>
            </div>

            {/* Source Selection */}
            <div>
              <h4 className='text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4'>Listing Source</h4>
              <label className='flex items-center gap-3 cursor-pointer group'>
                <div className='relative'>
                  <input
                    type='checkbox'
                    name='includeMLS'
                    className='sr-only peer'
                    checked={filters.includeMLS}
                    onChange={handleChange}
                  />
                  <div className='w-10 h-6 bg-slate-200 peer-checked:bg-blue-600 rounded-full transition-colors'></div>
                  <div className='absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow-sm'></div>
                </div>
                <span className='text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors'>Live MLS/IDX Stream</span>
              </label>
            </div>

            {/* Amenities */}
            <div className='md:col-span-3'>
              <h4 className='text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4'>Amenities</h4>
              <div className='flex flex-wrap gap-2'>
                {commonAmenities.map(amenity => (
                  <button
                    key={amenity}
                    type='button'
                    onClick={() => toggleAmenity(amenity)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                      filters.amenities.includes(amenity)
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {amenity}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default AdvancedSearchWidget;

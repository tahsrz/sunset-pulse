'use client';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaArrowAltCircleLeft, FaMapMarkedAlt } from 'react-icons/fa';
import PropertyCard from '@/components/PropertyCard';
import Spinner from '@/components/Spinner';
import AdvancedSearchWidget from '@/components/AdvancedSearchWidget';
import ExplorerMap from '@/components/ExplorerMap';

const SearchResultsPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredPropertyId, setHoveredPropertyId] = useState(null);
  const [boundaryName, setBoundaryName] = useState(searchParams.get('label') || '');
  const [activeRouteProperty, setActiveRouteProperty] = useState(null);
  const [savedSectors, setSavedSectors] = useState([]);
  const [showSectorSidebar, setShowSectorSidebar] = useState(false);

  const isPolygonActive = searchParams.get('polygon');

  // Persistence: Load sectors from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('sunset_pulse_sectors');
    if (stored) setSavedSectors(JSON.parse(stored));
  }, []);

  useEffect(() => {
    // Sync boundary name with URL
    const label = searchParams.get('label');
    if (label) setBoundaryName(label);
  }, [searchParams]);

  useEffect(() => {
    const fetchSearchResults = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/properties/search/advanced?${searchParams.toString()}`);

        if (res.status === 200) {
          const data = await res.json();
          setProperties(data);
        } else {
          setProperties([]);
        }
      } catch (error) {
        console.error('[FETCH_SEARCH_RESULTS_ERROR]', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSearchResults();
  }, [searchParams]);

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

  const handlePolygonChange = (selection) => {
    const params = new URLSearchParams(searchParams.toString());
    if (selection && selection.type === 'polygon') {
      params.set('polygon', selection.data);
      if (boundaryName) params.set('label', boundaryName);
      router.push(`/properties/search-results?${params.toString()}`);
    } else {
      params.delete('polygon');
      params.delete('label');
      setBoundaryName('');
      router.push(`/properties/search-results?${params.toString()}`);
    }
  };

  const handleSaveBoundary = () => {
    if (!boundaryName) return toast.error('Sector label required.');
    
    const newSector = {
      id: Date.now(),
      name: boundaryName,
      polygon: searchParams.get('polygon'),
      timestamp: new Date().toISOString()
    };

    const updated = [newSector, ...savedSectors];
    setSavedSectors(updated);
    localStorage.setItem('sunset_pulse_sectors', JSON.stringify(updated));
    
    toast.success(`Sector [${boundaryName}] locked into Intelligence Grid.`);
  };

  const handleDeploySector = (sector) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('polygon', sector.polygon);
    params.set('label', sector.name);
    router.push(`/properties/search-results?${params.toString()}`);
    setBoundaryName(sector.name);
  };

  const handleRemoveSector = (id) => {
    const updated = savedSectors.filter(s => s.id !== id);
    setSavedSectors(updated);
    localStorage.setItem('sunset_pulse_sectors', JSON.stringify(updated));
  };

  const handlePropertySelect = (property) => {
    const element = document.getElementById(`property-${property._id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHoveredPropertyId(property._id);
      setTimeout(() => setHoveredPropertyId(null), 2000);
    }
  };

  const handleRouteClick = (property) => {
    if (activeRouteProperty?._id === property._id) {
      setActiveRouteProperty(null);
    } else {
      setActiveRouteProperty(property);
    }
  };

  return (
    <>
      <section className='bg-blue-700 py-6 shadow-inner'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <AdvancedSearchWidget onSearch={handleSearch} />
        </div>
      </section>

      <div className='flex flex-col md:flex-row h-[calc(100vh-160px)] overflow-hidden relative'>
        
        {/* Left Side: Map Recon Grid */}
        <div className='w-full md:w-2/5 h-[400px] md:h-full relative border-r border-slate-200'>
          <ExplorerMap 
            results={properties} 
            onSelectionChange={handlePolygonChange}
            onPropertySelect={handlePropertySelect}
            hoveredId={hoveredPropertyId}
            activeRouteProperty={activeRouteProperty}
          />

          {/* Sector Sidebar Toggle */}
          <button 
            onClick={() => setShowSectorSidebar(!showSectorSidebar)}
            className='absolute top-4 left-4 z-20 bg-slate-900/90 text-white p-3 rounded-xl border border-white/10 shadow-2xl hover:bg-slate-800 transition-all group'
          >
            <FaMapMarkedAlt className={`${showSectorSidebar ? 'text-blue-400' : 'text-slate-400 group-hover:text-white'}`} />
          </button>

          {/* Saved Sector Sidebar */}
          {showSectorSidebar && (
            <div className='absolute inset-y-0 left-0 w-64 z-30 bg-slate-900/95 backdrop-blur-xl border-r border-white/10 shadow-2xl animate-in slide-in-from-left duration-300 p-6 overflow-y-auto'>
              <div className='flex items-center justify-between mb-8'>
                <h3 className='text-sm font-black text-white uppercase tracking-widest italic'>Locked Sectors</h3>
                <button onClick={() => setShowSectorSidebar(false)} className='text-slate-500 hover:text-white'>✕</button>
              </div>

              {savedSectors.length === 0 ? (
                <p className='text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed text-center py-10 opacity-50 italic'>
                  No tactical sectors defined. Draw and lock a polygon to begin.
                </p>
              ) : (
                <div className='space-y-3'>
                  {savedSectors.map((sector) => (
                    <div key={sector.id} className='group relative'>
                      <button 
                        onClick={() => handleDeploySector(sector)}
                        className={`w-full text-left p-4 rounded-xl border transition-all ${boundaryName === sector.name ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
                      >
                        <div className='text-[10px] font-black uppercase truncate mb-1'>{sector.name}</div>
                        <div className='text-[8px] opacity-50 font-mono italic'>{new Date(sector.timestamp).toLocaleDateString()} RECON</div>
                      </button>
                      <button 
                        onClick={() => handleRemoveSector(sector.id)}
                        className='absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 bg-red-500 text-white w-4 h-4 rounded-full text-[8px] flex items-center justify-center hover:bg-red-600 transition-all'
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {isPolygonActive && (
            <div className='absolute top-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2'>
              <div className='bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-white/10 flex flex-col gap-2 animate-in slide-in-from-top-4 duration-500'>
                <div className='flex items-center gap-2'>
                  <FaMapMarkedAlt className='text-blue-400 animate-pulse' size={12} />
                  <span className='text-[8px] font-black uppercase tracking-[0.2em] text-blue-400'>Tactical Sector Active</span>
                </div>
                <div className='flex gap-2'>
                  <input 
                    type='text' 
                    placeholder='Label this sector...'
                    className='bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] text-white outline-none focus:border-blue-500 transition-all w-40'
                    value={boundaryName}
                    onChange={(e) => setBoundaryName(e.target.value)}
                  />
                  <button 
                    onClick={handleSaveBoundary}
                    className='bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all'
                  >
                    Lock
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Property Recon Feed */}
        <div className='w-full md:w-3/5 h-full overflow-y-auto bg-slate-50 p-6 custom-scrollbar'>
          <div className='container-xl lg:container m-auto'>
            {/* ... (back link and title) */}
            
            <div className='mb-8'>
              <h1 className='text-3xl font-black text-slate-900 uppercase tracking-tighter'>Search Results</h1>
              <div className='flex flex-col gap-1 mt-1'>
                <p className='text-slate-500 font-medium text-xs'>
                  Found {properties.length} matches for <span className="text-blue-600 font-bold">{searchParams.get('location') || 'Global Sector'}</span> [{searchParams.get('propertyType') || 'All Assets'}] across Internal & MLS Intelligence Streams
                </p>
                {isPolygonActive && (
                  <span className='w-fit text-[8px] bg-blue-500/10 text-blue-600 border border-blue-500/20 px-2 py-0.5 rounded font-black uppercase'>Geo-Filtered Tactical Sector</span>
                )}
              </div>
            </div>

            {loading ? (
              <Spinner loading={loading} />
            ) : properties.length === 0 ? (
              <div className='bg-white p-12 rounded-3xl border border-slate-200 text-center shadow-sm'>
                <p className='text-slate-500 font-bold text-sm uppercase tracking-widest'>No tactical matches found for "{searchParams.get('location')}". Adjust your Recon filters.</p>
              </div>
            ) : (
              <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20'>
                {properties.map((property) => (
                  <div 
                    key={property._id || property.mls_id}
                    id={`property-${property._id}`}
                    onMouseEnter={() => setHoveredPropertyId(property._id)}
                    onMouseLeave={() => setHoveredPropertyId(null)}
                    className={`transition-all duration-500 rounded-xl ${hoveredPropertyId === property._id ? 'scale-[1.02] ring-4 ring-blue-500/20 z-10' : ''}`}
                  >
                    <PropertyCard 
                      property={property} 
                      onRouteClick={handleRouteClick}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
export default SearchResultsPage;

'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import SearchHeader from '@/components/search/SearchHeader';
import MapSection from '@/components/search/MapSection';
import ResultsList from '@/components/search/ResultsList';

const SearchResultsPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);
  const [boundaryName, setBoundaryName] = useState(searchParams?.get('label') || '');
  const [activeRouteProperty, setActiveRouteProperty] = useState<any>(null);
  const [savedSectors, setSavedSectors] = useState<any[]>([]);
  const [showSectorSidebar, setShowSectorSidebar] = useState(false);

  const isPolygonActive = !!searchParams?.get('polygon');

  // Load saved regions from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('sunset_pulse_sectors');
    if (stored) setSavedSectors(JSON.parse(stored));
  }, []);

  // Sync boundary name with URL
  useEffect(() => {
    const label = searchParams?.get('label');
    if (label) setBoundaryName(label);
  }, [searchParams]);

  // Fetch results based on search params
  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!searchParams) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/properties/search/advanced?${searchParams.toString()}`);
        const json = await res.json();
        
        // Fix: Extract data from successResponse wrapper
        const propertyArray = json.data || json;
        setProperties(Array.isArray(propertyArray) ? propertyArray : []);
      } catch (error) {
        console.error('[FETCH_SEARCH_RESULTS_ERROR]', error);
        setProperties([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSearchResults();
  }, [searchParams]);

  const handleSearch = (filters: any) => {
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

  const handlePolygonChange = (selection: any) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
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
    if (!boundaryName) return toast.error('Please provide a label for this region.');
    
    const newSector = {
      id: Date.now(),
      name: boundaryName,
      polygon: searchParams?.get('polygon'),
      timestamp: new Date().toISOString()
    };

    const updated = [newSector, ...savedSectors];
    setSavedSectors(updated);
    localStorage.setItem('sunset_pulse_sectors', JSON.stringify(updated));
    toast.success(`Region "${boundaryName}" saved successfully.`);
  };

  const handleDeploySector = (sector: any) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('polygon', sector.polygon);
    params.set('label', sector.name);
    router.push(`/properties/search-results?${params.toString()}`);
    setBoundaryName(sector.name);
  };

  const handleRemoveSector = (id: number) => {
    const updated = savedSectors.filter(s => s.id !== id);
    setSavedSectors(updated);
    localStorage.setItem('sunset_pulse_sectors', JSON.stringify(updated));
  };

  const handlePropertySelect = (property: any) => {
    const element = document.getElementById(`property-${property._id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHoveredPropertyId(property._id);
      setTimeout(() => setHoveredPropertyId(null), 2000);
    }
  };

  const handleRouteClick = (property: any) => {
    if (activeRouteProperty?._id === property._id) {
      setActiveRouteProperty(null);
    } else {
      setActiveRouteProperty(property);
    }
  };

  return (
    <div className='flex flex-col min-h-screen bg-slate-950'>
      <SearchHeader onSearch={handleSearch} />

      <div className='flex flex-col md:flex-row h-[calc(100vh-160px)] overflow-hidden relative'>
        <MapSection 
          properties={properties}
          savedSectors={savedSectors}
          boundaryName={boundaryName}
          setBoundaryName={setBoundaryName}
          showSectorSidebar={showSectorSidebar}
          setShowSectorSidebar={setShowSectorSidebar}
          isPolygonActive={isPolygonActive}
          handlePolygonChange={handlePolygonChange}
          handlePropertySelect={handlePropertySelect}
          handleSaveBoundary={handleSaveBoundary}
          handleDeploySector={handleDeploySector}
          handleRemoveSector={handleRemoveSector}
          hoveredPropertyId={hoveredPropertyId}
          activeRouteProperty={activeRouteProperty}
        />

        <ResultsList 
          properties={properties}
          loading={loading}
          locationLabel={searchParams?.get('location') || 'Global Search'}
          propertyTypeLabel={searchParams?.get('propertyType') || 'All Properties'}
          isPolygonActive={isPolygonActive}
          hoveredPropertyId={hoveredPropertyId}
          setHoveredPropertyId={setHoveredPropertyId}
          handleRouteClick={handleRouteClick}
        />
      </div>
    </div>
  );
};

export default SearchResultsPage;

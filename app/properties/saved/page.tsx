'use client';

import React, { useState, useEffect } from 'react';
import PropertyCard from '@/components/PropertyCard';
import Spinner from '@/components/Spinner';
import { toast } from 'react-toastify';

interface Property {
  _id: string;
  name: string;
  type: string;
  images: string[];
  location: {
    street?: string;
    city: string;
    state: string;
    zipcode?: string;
  };
  rates: {
    nightly?: number;
    weekly?: number;
    monthly?: number;
  };
  amenities: string[];
  [key: string]: any;
}

const SavedPropertiesPage: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchSavedProperties = async () => {
      try {
        const res = await fetch('/api/bookmarks');

        if (res.status === 200) {
          const data = await res.json();
          setProperties(data);
        } else {
          console.error(res.statusText);
          toast.error('Failed to fetch saved properties');
        }
      } catch (error) {
        console.error(error);
        toast.error('Failed to fetch saved properties');
      } finally {
        setLoading(false);
      }
    };

    fetchSavedProperties();
  }, []);

  return loading ? (
    <Spinner loading={loading} />
  ) : (
    <section className='px-4 py-6'>
      <div className='container-xl lg:container m-auto px-4 py-6'>
        <h1 className='text-2xl mb-4'>Saved Properties</h1>
        {properties.length === 0 ? (
          <p>No saved properties</p>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            {properties.map((property) => (
              <PropertyCard key={property._id} property={property} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default SavedPropertiesPage;

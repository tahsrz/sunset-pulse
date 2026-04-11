'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchProperty } from '@/lib/core/requests';
import PropertyHeaderImage from '@/components/PropertyHeaderImage';
import PropertyDetails from '@/components/PropertyDetails';
import PropertyImages from '@/components/PropertyImages';
import BookmarkButton from '@/components/BookmarkButton';
import LeadCaptureForm from '@/components/LeadCaptureForm';
import BookingForm from '@/components/BookingForm';
import PropertyVerification from '@/components/SphinxGatekeeper';
import JamieChat from '@/components/JamieChat';
import ShareButtons from '@/components/ShareButtons';
import RecommendedProperties from '@/components/property/RecommendedProperties';
import Spinner from '@/components/Spinner';
import { FaArrowLeft } from 'react-icons/fa';

// --- Interfaces for Type Safety ---
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
  // Add other properties as needed
  [key: string]: any; 
}

interface RentData {
  status: string;
  rentEstimate?: number;
  rentRangeLow?: number;
  rentRangeHigh?: number;
  [key: string]: any;
}

const PropertyPage: React.FC = () => {
  const params = useParams();
  const id = params?.id as string;

  const [property, setProperty] = useState<Property | null>(null);
  const [rentData, setRentData] = useState<RentData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchPropertyData = async () => {
      if (!id) return;
      try {
        const propertyData = await fetchProperty(id);
        setProperty(propertyData as Property);

        // Fetch Grid-Persistent Rent Intelligence
        if (propertyData) {
          try {
            const rentRes = await fetch(`/api/properties/${id}/rent`);
            if (rentRes.ok) {
              const rent = await rentRes.json();
              setRentData(rent as RentData);
            }
          } catch (rentError) {
            console.error('Rent Recon Failure:', rentError);
          }
        }
      } catch (error) {
        console.error('Error fetching property:', error);
      } finally {
        setLoading(false);
      }
    };

    if (property === null) {
      fetchPropertyData();
    }
  }, [id, property]);

  if (!property && !loading) {
    return (
      <h1 className='text-center text-2xl font-bold mt-10'>
        Property Not Found
      </h1>
    );
  }

  // Combine property and rent data for Jamie
  const jamieData = property ? { ...property, rentData } : null;

  return (
    <>
      {loading && <Spinner loading={loading} />}
      {!loading && property && (
        <>
          <PropertyHeaderImage image={property.images[0]} />
          <section>
            <div className='container m-auto py-6 px-6'>
              <Link
                href='/properties'
                className='text-blue-500 hover:text-blue-600 flex items-center transition-all hover:-translate-x-1'
              >
                <FaArrowLeft className='mr-2' /> Back to Properties
              </Link>
            </div>
          </section>

          <section className='bg-slate-900/50 border-y border-white/5'>
            <div className='container m-auto py-10 px-6'>
              <div className='grid grid-cols-1 md:grid-cols-[70%_30%] w-full gap-6'>
                <PropertyDetails property={property} rentData={rentData} />
                <aside className='space-y-4'>
                  <BookmarkButton property={property} />
                  <ShareButtons property={property} />
                  <BookingForm property={property} />
                  <PropertyVerification>
                    <LeadCaptureForm propertyId={property._id} propertyName={property.name} />
                  </PropertyVerification>
                  <RecommendedProperties currentPropertyId={property._id} type={property.type} />
                </aside>
              </div>
            </div>
          </section>
          <PropertyImages images={property.images} />
          <JamieChat propertyData={jamieData} />
        </>
      )}
    </>
  );
};

export default PropertyPage;

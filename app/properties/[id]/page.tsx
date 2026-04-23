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
import TourRequestForm from '@/components/property/TourRequestForm';
import PropertyVerification from '@/components/VerificationStep';
import JamieChat from '@/components/JamieChat';
import ShareButtons from '@/components/ShareButtons';
import RecommendedProperties from '@/components/property/RecommendedProperties';
import Spinner from '@/components/Spinner';
import { FaArrowLeft } from 'react-icons/fa';
import { Property } from '@/lib/types';
import { logEvent } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

// --- Interfaces for Type Safety ---
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
  const { user } = useAuth();

  const [property, setProperty] = useState<Property | null>(null);
  const [rentData, setRentData] = useState<RentData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchPropertyData = async () => {
      if (!id) return;
      try {
        const propertyData = await fetchProperty(id);
        setProperty(propertyData as Property);

        if (propertyData) {
          // Log Engagement Event (Last 48h tracking)
          logEvent({
            type: 'PROPERTY_VIEW',
            description: `Asset ${propertyData.name} scanned in sector.`,
            actorId: user?.id || 'anonymous',
            actorName: user?.user_metadata?.full_name || 'Anonymous_User',
            targetId: id,
            severity: 'INFO'
          });

          try {
            const rentRes = await fetch(`/api/properties/${id}/rent`);
            if (rentRes.ok) {
              const rent = await rentRes.json();
              setRentData(rent as RentData);
            }
          } catch (rentError) {
            console.error('Market analysis failed:', rentError);
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
  }, [id, property, user]);

  if (!property && !loading) {
    return (
      <h1 className='text-center text-2xl font-bold mt-10'>
        Property Not Found
      </h1>
    );
  }

  // Determine if it's a rental/RV or a Sale/Standard property for form logic
  const isShortTerm = property?.type === 'RV' || property?.type === 'RV Park';

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
                  
                  {/* Action Forms based on Property Intel Type */}
                  {isShortTerm ? (
                    <BookingForm property={property} />
                  ) : (
                    <TourRequestForm propertyId={property._id} propertyName={property.name} />
                  )}

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

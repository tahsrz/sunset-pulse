'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchProperty } from '@/utils/requests';
import { fetchRentEstimate } from '@/lib/data/rentcast';
import PropertyHeaderImage from '@/components/PropertyHeaderImage';
import PropertyDetails from '@/components/PropertyDetails';
import PropertyImages from '@/components/PropertyImages';
import BookmarkButton from '@/components/BookmarkButton';
import LeadCaptureForm from '@/components/LeadCaptureForm';
import PropertyVerification from '@/components/SphinxGatekeeper';
import JamieChat from '@/components/JamieChat';
import ShareButtons from '@/components/ShareButtons';
import Spinner from '@/components/Spinner';
import { FaArrowLeft } from 'react-icons/fa';

const PropertyPage = () => {
  const { id } = useParams();

  const [property, setProperty] = useState(null);
  const [rentData, setRentData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPropertyData = async () => {
      if (!id) return;
      try {
        const propertyData = await fetchProperty(id);
        setProperty(propertyData);

        // Fetch RentCast Data
        if (propertyData && propertyData.location) {
          const address = `${propertyData.location.street}, ${propertyData.location.city}, ${propertyData.location.state} ${propertyData.location.zipcode}`;
          try {
            const rent = await fetchRentEstimate(address);
            setRentData(rent);
          } catch (rentError) {
            console.error('RentCast Fetch Error:', rentError);
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

          <section className='bg-blue-50'>
            <div className='container m-auto py-10 px-6'>
              <div className='grid grid-cols-1 md:grid-cols-70/30 w-full gap-6'>
                <PropertyDetails property={property} rentData={rentData} />
                <aside className='space-y-4'>
                  <BookmarkButton property={property} />
                  <ShareButtons property={property} />
                  <PropertyVerification>
                    <LeadCaptureForm propertyId={property._id} propertyName={property.name} />
                  </PropertyVerification>
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

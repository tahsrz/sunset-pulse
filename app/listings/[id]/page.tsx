import Link from 'next/link';
import { fetchProperty } from '@/lib/core/requests';
import { fetchRentEstimate } from '@/lib/data/rentcast';
import PropertyHeaderImage from '@/components/PropertyHeaderImage';
import PropertyDetails from '@/components/PropertyDetails';
import PropertyImages from '@/components/PropertyImages';
import BookmarkButton from '@/components/BookmarkButton';
import LeadCaptureForm from '@/components/LeadCaptureForm';
import PropertyVerification from '@/components/VerificationStep';
import JamieChat from '@/components/JamieChat';
import ShareButtons from '@/components/ShareButtons';
import { FaArrowLeft, FaChartLine } from 'react-icons/fa';

interface ListingPageProps {
  params: { id: string };
}

export default async function ListingPage({ params }: ListingPageProps) {
  const property = await fetchProperty(params.id);

  if (!property) {
    return (
      <h1 className='text-center text-2xl font-bold mt-10 text-slate-800'>
        Listing Not Found
      </h1>
    );
  }

  // Fetch RentCast Data (Server Side)
  const address = `${property.location.street}, ${property.location.city}, ${property.location.state} ${property.location.zipcode}`;
  let rentData = null;
  try {
    rentData = await fetchRentEstimate(address);
  } catch (e) {
    console.error('Market analysis failed:', e);
  }

  const jamieData = { ...property, rentData };

  return (
    <main className='bg-slate-50 min-h-screen pb-20'>
      <PropertyHeaderImage image={property.images[0]} />
      
      <section className='bg-white border-b border-slate-200'>
        <div className='container m-auto py-6 px-6 flex justify-between items-center'>
          <Link
            href='/properties'
            className='text-blue-600 hover:text-blue-700 flex items-center font-bold text-sm'
          >
            <FaArrowLeft className='mr-2' /> Back to All Listings
          </Link>
          <div className='flex items-center gap-2 bg-green-50 px-4 py-2 rounded-full border border-green-100'>
            <FaChartLine className='text-green-600' />
            <span className='text-[10px] font-black uppercase text-green-700 tracking-widest'>Listing Active</span>
          </div>
        </div>
      </section>

      <div className='container m-auto py-10 px-6'>
        <div className='grid grid-cols-1 md:grid-cols-70/30 w-full gap-8'>
          <div>
            <PropertyDetails property={property} rentData={rentData} />
            <div className='mt-10'>
              <h3 className='text-xl font-bold mb-6 text-slate-800 border-b pb-4'>Property Gallery</h3>
              <PropertyImages images={property.images} />
            </div>
          </div>

          <aside className='space-y-6'>
            <div className='bg-white p-6 rounded-2xl shadow-sm border border-slate-100'>
              <h4 className='text-xs font-black uppercase text-slate-400 tracking-widest mb-6'>Agent Controls</h4>
              <div className='space-y-4'>
                <BookmarkButton property={property} />
                <ShareButtons property={property} />
              </div>
            </div>

            <PropertyVerification>
              <div className='bg-white p-6 rounded-2xl shadow-sm border border-slate-100'>
                <h4 className='text-xs font-black uppercase text-slate-400 tracking-widest mb-6'>Direct Inquiry</h4>
                <LeadCaptureForm propertyId={property._id} propertyName={property.name} />
              </div>
            </PropertyVerification>
          </aside>
        </div>
      </div>

      <JamieChat propertyData={jamieData} />
    </main>
  );
}
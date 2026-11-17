import { fetchProperty } from '@/lib/core/requests';
import PropertyDetails from '@/components/PropertyDetails';
import JamieChat from '@/components/JamieChat';
import VisitorPropertyViewTracker from '@/components/property/VisitorPropertyViewTracker';

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await fetchProperty(id);

  if (!property) {
    return <h1 className="mt-10 text-center text-2xl font-bold">Listing Not Found</h1>;
  }

  const propertyId = property._id || id;
  return (
    <>
      <VisitorPropertyViewTracker propertyId={propertyId} />
      <PropertyDetails property={property} propertyId={propertyId} />
      <JamieChat propertyData={property} />
    </>
  );
}

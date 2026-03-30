import JamieChat from '@/components/JamieChat';
import { fetchRentEstimate } from '@/lib/data/rentcast'; // The API fetcher we discussed
import PropertyHero from '@/components/PropertyHero'; // Example component

interface ListingPageProps {
  params: { id: string };
}

export default async function ListingPage({ params }: ListingPageProps) {
  // 1. In a real app, you'd fetch the property from MongoDB here
  // const property = await getPropertyById(params.id);
  
  // 2. Fetch the RentCast data (This will use your mock JSON if in dev mode)
  // For now, we'll pass a Keller address to match your sample-estimate.json
  const rentData = await fetchRentEstimate("123 Keller Parkway, Keller, TX");

  return (
    <main className="relative min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        {/* Standard Property Details */}
        <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-slate-900">123 Keller Parkway</h1>
          <p className="text-slate-500 mb-4">Keller, Texas 76248</p>
          
          <div className="grid grid-cols-3 gap-4 border-t pt-4">
            <div>
              <p className="text-xs text-gray-400 uppercase">Estimated Rent</p>
              <p className="text-xl font-bold text-green-600">${rentData.rent}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase">Confidence</p>
              <p className="text-xl font-bold text-slate-700">{rentData.confidenceScore}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase">Range</p>
              <p className="text-sm font-medium text-slate-600">
                ${rentData.rentRangeLow} - ${rentData.rentRangeHigh}
              </p>
            </div>
          </div>
        </section>

        {/* The rest of your listing content goes here */}
        <div className="prose max-w-none text-slate-600">
          <p>This beautiful property in the heart of Keller offers...</p>
        </div>
      </div>

      {/* 3. Jamie sits "on top" of the page, holding the RentCast data */}
      <JamieChat propertyData={rentData} />
    </main>
  );
}
// ATTOM Intelligence Client (Mocked for Demo)
// Primary Signal: Tax/Deed History & Neighborhood Scores

export async function fetchAttomPropertyData(address: string) {
  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true' || !process.env.ATTOM_API_KEY) {
    console.log(`[ATTOM_MOCK] Fetching tax and deed history for: ${address}`);
    return {
      status: 'success',
      data: {
        taxAmount: 4250.50,
        assessedValue: 310000,
        neighborhoodScore: 88,
        ownerOccupied: true,
        lastSalePrice: 285000,
        lastSaleDate: '2021-06-15'
      }
    };
  }

  const res = await fetch(`https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/detail?address=${encodeURIComponent(address)}`, {
    headers: {
      'apikey': process.env.ATTOM_API_KEY || '',
      'Accept': 'application/json'
    }
  });

  if (!res.ok) throw new Error('ATTOM API Error');
  return res.json();
}

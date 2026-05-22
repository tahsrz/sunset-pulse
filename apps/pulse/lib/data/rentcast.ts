export async function fetchRentEstimate(address: string) {
  // Mock Mode for local development
  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true' || !process.env.RENTCAST_API_KEY) {
    console.log(`[RENTCAST_MOCK] Intercepted request for: ${address}`);
    const mockData = await import('../mocks/rentcast/sample-estimate.json');
    return mockData.default;
  }

  const res = await fetch(`https://api.rentcast.io/v1/rent-estimate?address=${encodeURIComponent(address)}`, {
    headers: {
      'X-Api-Key': process.env.RENTCAST_API_KEY || '',
      'Accept': 'application/json'
    }
  });
  
  if (!res.ok) throw new Error('Failed to fetch RentCast data');
  return res.json();
}

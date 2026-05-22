// Bridge API (Zillow Data) Client
// Primary Signal: Live Listings, Zestimates, and Real-time Comps

export async function fetchBridgeZillowData(address: string) {
  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true' || !process.env.BRIDGE_API_KEY) {
    console.log(`[BRIDGE_ZILLOW_MOCK] Fetching live listing data for: ${address}`);
    return {
      status: 'active',
      zestimate: 345000,
      nearbyComps: [338000, 352000, 349000],
      daysOnMarket: 14,
      statusHistory: 'Sold -> Pending -> Active'
    };
  }

  // Example for Bridge Interactives API endpoint
  const res = await fetch(`https://api.bridgeinteractive.com/v2/zillow/listings?address=${encodeURIComponent(address)}`, {
    headers: {
      'Authorization': `Bearer ${process.env.BRIDGE_API_KEY}`,
      'Accept': 'application/json'
    }
  });

  if (!res.ok) throw new Error('Bridge API Error');
  return res.json();
}

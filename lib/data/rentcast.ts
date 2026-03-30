export async function fetchRentEstimate(address: string) {
  // Use your X-Api-Key header here
  const res = await fetch(`https://api.rentcast.io/v1/rent-estimate?address=${encodeURIComponent(address)}`, {
    headers: {
      'X-Api-Key': process.env.RENTCAST_API_KEY || '',
      'Accept': 'application/json'
    }
  });
  
  if (!res.ok) throw new Error('Failed to fetch RentCast data');
  return res.json();
}
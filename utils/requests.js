const apiDomain = process.env.NEXT_PUBLIC_API_DOMAIN || null;

// Fetch all properties
async function fetchProperties({ showFeatured = false } = {}) {
  try {
    if (!apiDomain) {
      return [];
    }

    // Fixed: Added /api/ before properties
    const res = await fetch(
      `${apiDomain}/api/properties${showFeatured ? '/featured' : ''}`,
      { cache: 'no-store' }
    );

    if (!res.ok) {
      throw new Error('Failed to fetch data');
    }

    return res.json();
  } catch (error) {
    console.log(error);
    return [];
  }
}

// Fetch single property
async function fetchProperty(id) {
  try {
    // 1. Detect if we are in the browser
    const isClient = typeof window !== 'undefined';
    
    // 2. Fix: Ensure we use /api/properties
    // On client: use relative path to prevent "Double IP" bug
    // On server: use absolute apiDomain
    const fetchUrl = isClient 
      ? `/api/properties/${id}` 
      : `${apiDomain}/api/properties/${id}`;

    if (!isClient && !apiDomain) {
      return null;
    }

    const res = await fetch(fetchUrl);

    if (!res.ok) {
      throw new Error('Failed to fetch data');
    }

    return res.json();
  } catch (error) {
    console.log(error);
    return null;
  }
}

export { fetchProperties, fetchProperty };
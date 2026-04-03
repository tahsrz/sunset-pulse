const apiDomain = process.env.NEXT_PUBLIC_API_DOMAIN || null;

// Fetch all properties
async function fetchProperties({ showFeatured = false } = {}) {
  try {
    if (!apiDomain) {
      return [];
    }

    const res = await fetch(
      `${apiDomain}/api/properties${showFeatured ? '/featured' : ''}`,
      { cache: 'no-store' }
    );

    if (!res.ok) {
      throw new Error('Failed to fetch data');
    }

    return res.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

// Fetch single property
async function fetchProperty(id) {
  try {
    const isClient = typeof window !== 'undefined';
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
    console.error(error);
    return null;
  }
}

export { fetchProperties, fetchProperty };

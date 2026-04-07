const apiDomain = process.env.NEXT_PUBLIC_API_DOMAIN || null;

// Fetch all properties
async function fetchProperties({ showFeatured = false } = {}) {
  try {
    // Handle case where domain is not yet available (e.g. during build)
    if (!apiDomain) {
      return [];
    }

    const res = await fetch(
      `${apiDomain}/api/properties${showFeatured ? '/featured' : ''}`,
      { cache: 'no-store' }
    );

    if (!res.ok) {
      console.warn(`[RECON_FAILURE]: Failed to fetch properties. Status: ${res.status}`);
      return [];
    }

    return await res.json();
  } catch (error) {
    console.error('[CORE_ERROR]: Intelligence fetch intercept failed.', error.message);
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
      console.warn(`[RECON_FAILURE]: Failed to fetch asset ${id}. Status: ${res.status}`);
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error(`[CORE_ERROR]: Asset ${id} recon failed.`, error.message);
    return null;
  }
}

export { fetchProperties, fetchProperty };

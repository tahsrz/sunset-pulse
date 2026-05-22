import { persistenceEngine } from './persistenceEngine';

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

    const json = await res.json();
    return json.data || [];
  } catch (error) {
    console.error('[CORE_ERROR]: Intelligence fetch intercept failed.', error.message);
    return [];
  }
}

/**
 * Fetch single property with Intelligence Grid TTL.
 */
async function fetchProperty(id) {
  const isClient = typeof window !== 'undefined';
  
  if (isClient) {
    return await persistenceEngine.resolve(`ASSET_${id}`, async () => {
      const fetchUrl = `/api/properties/${id}`;
      const res = await fetch(fetchUrl);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    });
  }

  try {
    const fetchUrl = `${apiDomain}/api/properties/${id}`;

    if (!apiDomain) {
      return null;
    }

    const res = await fetch(fetchUrl);

    if (!res.ok) {
      console.warn(`[RECON_FAILURE]: Failed to fetch asset ${id}. Status: ${res.status}`);
      return null;
    }

    const json = await res.json();
    return json.data;
  } catch (error) {
    console.error(`[CORE_ERROR]: Asset ${id} recon failed.`, error.message);
    return null;
  }
}

export { fetchProperties, fetchProperty };

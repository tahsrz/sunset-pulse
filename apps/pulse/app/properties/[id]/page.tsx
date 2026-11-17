'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchProperty } from '@/lib/core/requests';
import PropertyDetails from '@/components/PropertyDetails';
import JamieChat from '@/components/JamieChat';
import Spinner from '@/components/Spinner';
import type { Property } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { useLocalListing } from '@/lib/powersync/useLocalListings';
import { useSunsetPowerSync } from '@/lib/powersync/PowerSyncProvider';
import { recordLocalPropertyView } from '@/lib/powersync/mutations';
import VisitorPropertyViewTracker from '@/components/property/VisitorPropertyViewTracker';

export default function PropertyPage() {
  const id = useParams<{ id: string }>()?.id;
  const { user } = useAuth();
  const { listing: localListing, enabled: localEnabled } = useLocalListing(id || null);
  const { database: localDatabase } = useSunsetPowerSync();
  const [loaded, setLoaded] = useState<{ id: string; property: Property | null }>();

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetchProperty(id).then(
      (property) => { if (!cancelled) setLoaded({ id, property: property || null }); },
      () => { if (!cancelled) setLoaded({ id, property: null }); },
    );
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_RECENT_PROPERTY_VIEWS_ENABLED === 'false') return;
    if (!localEnabled || !localDatabase || !user?.id || !id) return;
    recordLocalPropertyView(localDatabase, user.id, id).catch((error) => {
      console.error('[POWERSYNC_RECENT_VIEW_ERROR]', error);
    });
  }, [id, localDatabase, localEnabled, user?.id]);

  const property = (loaded?.id === id ? loaded?.property : null)
    ?? (localEnabled && localListing ? localListing as Property : null);
  if (!property) {
    return id && loaded?.id !== id
      ? <Spinner loading />
      : <h1 className="mt-10 text-center text-2xl font-bold">Property Not Found</h1>;
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

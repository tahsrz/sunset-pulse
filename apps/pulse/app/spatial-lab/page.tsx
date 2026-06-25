import type { Metadata } from 'next';
import KeplerSpatialLabLoader from '@/components/spatial/KeplerSpatialLabLoader';

export const metadata: Metadata = {
  title: 'Spatial Lab | Sunset Pulse',
  description: 'Kepler.gl spatial intelligence workspace for Sunset Pulse listing and market signals.'
};

export default function SpatialLabPage() {
  return <KeplerSpatialLabLoader />;
}

import type { Metadata } from 'next';
import DeckListingSignalsLoader from '@/components/spatial/DeckListingSignalsLoader';

export const metadata: Metadata = {
  title: 'Spatial Lab | Sunset Pulse',
  description: 'Deck.gl spatial intelligence workspace for Sunset Pulse listing and market signals.'
};

export default function SpatialLabPage() {
  return <DeckListingSignalsLoader />;
}

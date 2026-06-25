import type { Metadata } from 'next';
import DeckListingSignalsLoader from '@/components/spatial/DeckListingSignalsLoader';

export const metadata: Metadata = {
  title: 'Deck Signals | Sunset Pulse',
  description: 'Native deck.gl listing signal map for Sunset Pulse.'
};

export default function DeckSignalsPage() {
  return <DeckListingSignalsLoader />;
}

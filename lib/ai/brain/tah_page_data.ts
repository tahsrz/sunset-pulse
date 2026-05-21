import { getCartridgeMetadata, type CartridgeMetadata } from '@/lib/ai/brain/cartridge_metadata';
import { getPulseCartridge, listPulseCartridges, previewPulseCartridge } from '@/lib/ai/brain/pulse_query';

export type TahCartridgePreview = Awaited<ReturnType<typeof previewPulseCartridge>>[number];

export type TahCartridgeViewData = {
  metadata: CartridgeMetadata;
  previews: TahCartridgePreview[];
  related: CartridgeMetadata[];
  searchQuery: string;
  jsonLd: Record<string, unknown>;
};

export async function getTahCartridgeViewData(slug: string): Promise<TahCartridgeViewData | null> {
  const cartridge = getPulseCartridge(slug);
  if (!cartridge) return null;

  const metadata = getCartridgeMetadata(cartridge);
  const previews = await previewPulseCartridge(slug, 6);
  const searchQuery = metadata.searchQuery;
  const related = listPulseCartridges()
    .filter(candidate => candidate.slug !== cartridge.slug)
    .map(candidate => getCartridgeMetadata(candidate))
    .filter(candidate => candidate.domain.id === metadata.domain.id)
    .slice(0, 6);

  return {
    metadata,
    previews,
    related,
    searchQuery,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: metadata.displayTitle,
      identifier: metadata.source,
      url: `/tah/${metadata.slug}`,
      isPartOf: {
        '@type': 'CollectionPage',
        name: 'Sunset Pulse TAH Knowledge Archive',
        url: '/tah'
      },
      encodingFormat: metadata.type === 'hat' ? 'application/x-hat' : 'application/x-tah',
      keywords: [metadata.domain.label, metadata.format, metadata.searchQuery],
      distribution: {
        '@type': 'DataDownload',
        contentUrl: `/api/tah?q=${encodeURIComponent(searchQuery)}&limit=10`,
        encodingFormat: 'application/json'
      }
    }
  };
}

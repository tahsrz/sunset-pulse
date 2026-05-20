import { listPulseCartridges } from '@/lib/ai/brain/pulse_query';
import { getCartridgeMetadata } from '@/lib/ai/brain/cartridge_metadata';
import { siteUrlFromRequest } from '@/lib/core/site_url';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET(request: Request) {
  const host = siteUrlFromRequest(request);
  const cartridges = listPulseCartridges().map(cartridge => getCartridgeMetadata(cartridge, host));
  const generatedAt = new Date().toISOString();

  return Response.json(
    {
      name: 'Sunset Pulse TAH Catalog',
      description: 'Dynamic machine-readable catalog for Sunset Pulse TAH and HAT context pages.',
      generatedAt,
      dynamic: true,
      count: cartridges.length,
      endpoints: {
        htmlIndex: `${host}/tah`,
        headlessIndex: `${host}/tah/headless`,
        searchApi: `${host}/api/tah`,
        llms: `${host}/llms.txt`,
        sitemap: `${host}/sitemap.xml`
      },
      domains: cartridges.reduce<Record<string, number>>((acc, cartridge) => {
        acc[cartridge.domain.id] = (acc[cartridge.domain.id] || 0) + 1;
        return acc;
      }, {}),
      cartridges: cartridges.map(cartridge => ({
        slug: cartridge.slug,
        title: cartridge.displayTitle,
        canonicalTitle: cartridge.title,
        source: cartridge.source,
        type: cartridge.type,
        domain: cartridge.domain,
        format: cartridge.format,
        byteSize: cartridge.byteSize,
        payloadByteSize: cartridge.payloadByteSize,
        shardCount: cartridge.shardCount,
        searchQuery: cartridge.searchQuery,
        summary: cartridge.summary,
        htmlUrl: cartridge.routes.html,
        headlessUrl: cartridge.routes.headless,
        apiUrl: cartridge.routes.api,
        metaUrl: cartridge.routes.meta
      }))
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    }
  );
}

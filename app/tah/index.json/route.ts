import { listPulseCartridges } from '@/lib/ai/brain/pulse_query';
import { getCartridgeApiUrl, getCartridgeSearchQuery } from '@/lib/ai/brain/cartridge_query';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET() {
  const host = process.env.NEXT_PUBLIC_SITE_URL || 'https://sunsetpulse.com';
  const cartridges = listPulseCartridges();
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
      cartridges: cartridges.map(cartridge => ({
        slug: cartridge.slug,
        title: cartridge.title,
        source: cartridge.name,
        type: cartridge.type,
        searchQuery: getCartridgeSearchQuery(cartridge),
        htmlUrl: `${host}/tah/${cartridge.slug}`,
        headlessUrl: `${host}/tah/${cartridge.slug}/headless`,
        apiUrl: getCartridgeApiUrl(host, cartridge)
      }))
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    }
  );
}

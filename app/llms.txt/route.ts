import { listPulseCartridges } from '@/lib/ai/brain/pulse_query';
import { getCartridgeApiUrl, getCartridgeSearchQuery } from '@/lib/ai/brain/cartridge_query';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET(request: Request) {
  const host = siteUrlFromRequest(request);
  const cartridges = listPulseCartridges();
  const body = [
    '# Sunset Pulse',
    '',
    'Sunset Pulse is a real estate intelligence platform with a crawlable TAH/HAT cartridge archive for project context, Jamie workflows, MLS/IDX support, and North Texas market intelligence.',
    '',
    '## Primary Context Entrypoints',
    `- [TAH archive](${host}/tah)`,
    `- [Headless TAH catalog](${host}/tah/headless)`,
    `- [Dynamic TAH catalog JSON](${host}/tah/index.json)`,
    `- [TAH search API](${host}/api/tah)`,
    `- [Atlas world map](${host}/atlas)`,
    `- [Atlas map JSON](${host}/api/tah/atlas/map)`,
    `- [Atlas progressive probe](${host}/api/tah/atlas/probe?cursor=0&limit=12)`,
    '',
    '## Cartridge Pages',
    ...cartridges.map(cartridge => {
      const pageUrl = `${host}/tah/${cartridge.slug}`;
      const headlessUrl = `${pageUrl}/headless`;
      const querySeed = getCartridgeSearchQuery(cartridge);

      return `- [${cartridge.title}](${pageUrl}) | [headless](${headlessUrl}) | [query](${getCartridgeApiUrl(host, cartridge)}) | seed: ${querySeed}`;
    }),
    '',
    '## API Usage',
    `- \`GET ${host}/tah/headless\``,
    `- \`GET ${host}/api/tah?q=Dallas&limit=5\``,
    `- \`POST ${host}/api/tah\` with \`{"query":"North Texas market intelligence","limit":10}\``,
    ''
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
}

function siteUrlFromRequest(request: Request) {
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = forwardedHost || request.headers.get('host');

  if (host) {
    return `${forwardedProto}://${host}`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL || 'https://sunsetpulse.com';
}

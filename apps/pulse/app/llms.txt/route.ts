import { listPulseCartridges } from '@/lib/ai/brain/pulse_query';
import { getCartridgeApiUrl, getCartridgeSearchQuery } from '@/lib/ai/brain/cartridge_query';
import { siteUrlFromRequest } from '@/lib/core/site_url';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET(request: Request) {
  const host = siteUrlFromRequest(request);
  const cartridges = listPulseCartridges();
  const body = [
    '# Sunset Pulse',
    '',
    'Sunset Pulse is a real estate search platform with a crawlable TAH/HAT cartridge archive for project context, Jamie workflows, MLS/IDX support, and North Texas market research.',
    '',
    '## Primary Context Entrypoints',
    `- [TAH archive](${host}/tah)`,
    `- [Headless TAH catalog](${host}/tah/headless)`,
    `- [Dynamic TAH catalog JSON](${host}/tah/index.json)`,
    `- [TAH search API](${host}/api/tah)`,
    `- [Atlas world map](${host}/atlas)`,
    `- [Atlas published manifest](${host}/api/tah/atlas/manifest)`,
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
    `- \`POST ${host}/api/tah\` with \`{"query":"North Texas market research","limit":10}\``,
    ''
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
}

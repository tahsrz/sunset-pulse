import { listPulseCartridges } from '@/lib/ai/brain/pulse_query';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET() {
  const host = process.env.NEXT_PUBLIC_SITE_URL || 'https://sunsetpulse.com';
  const cartridges = listPulseCartridges();
  const body = [
    '# Sunset Pulse',
    '',
    'Sunset Pulse is a real estate intelligence platform with a crawlable TAH/HAT cartridge archive for project context, Jamie workflows, MLS/IDX support, and North Texas market intelligence.',
    '',
    '## Primary Context Entrypoints',
    `- TAH archive: ${host}/tah`,
    `- Dynamic TAH catalog JSON: ${host}/tah/index.json`,
    `- TAH search API: ${host}/api/tah`,
    `- Advanced TAH evaluator: ${host}/api/tah/eval`,
    '',
    '## Cartridge Pages',
    ...cartridges.map(cartridge => `- ${cartridge.title}: ${host}/tah/${cartridge.slug}`),
    '',
    '## API Usage',
    `GET ${host}/api/tah?q=Dallas&limit=5`,
    `POST ${host}/api/tah with {"query":"North Texas market intelligence","limit":10}`,
    ''
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
}

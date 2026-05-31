import { buildAtlasGlobe } from '@/lib/ai/brain/atlas_globe';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET() {
  const host = process.env.NEXT_PUBLIC_SITE_URL || 'https://sunsetpulse.app';

  return Response.json(buildAtlasGlobe(host), {
    headers: {
      'Cache-Control': 'no-store, max-age=0'
    }
  });
}

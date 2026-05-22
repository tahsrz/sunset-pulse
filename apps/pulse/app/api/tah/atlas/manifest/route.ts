import { buildAtlasManifest, readAtlasManifest } from '@/lib/ai/brain/atlas_manifest';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET() {
  const published = readAtlasManifest();
  const body = published || buildAtlasManifest();

  return Response.json(
    {
      ...body,
      published: Boolean(published)
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    }
  );
}

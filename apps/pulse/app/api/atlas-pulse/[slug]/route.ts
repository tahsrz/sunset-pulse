import { getAtlasPulsePlace } from '@/lib/tah/texasPlaceHistory';

export const dynamic = 'force-dynamic';

type AtlasPulseRouteProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_request: Request, { params }: AtlasPulseRouteProps) {
  const { slug } = await params;
  const place = getAtlasPulsePlace(slug);

  if (!place) {
    return Response.json(
      {
        error: 'Atlas Pulse place not found.',
        slug
      },
      {
        status: 404,
        headers: {
          'Cache-Control': 'no-store, max-age=0'
        }
      }
    );
  }

  return Response.json(
    {
      generatedAt: new Date().toISOString(),
      place
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    }
  );
}

import { getTexasPlaceHistory } from '@/lib/tah/texasPlaceHistory';

export const dynamic = 'force-dynamic';

type TexasHistoryRouteProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_request: Request, { params }: TexasHistoryRouteProps) {
  const { slug } = await params;
  const place = getTexasPlaceHistory(slug);

  if (!place) {
    return Response.json(
      {
        error: 'Texas place history not found.',
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

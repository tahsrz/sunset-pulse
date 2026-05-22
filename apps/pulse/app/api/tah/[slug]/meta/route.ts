import { NextRequest } from 'next/server';
import { getCartridgeMetadata } from '@/lib/ai/brain/cartridge_metadata';
import { getPulseCartridge } from '@/lib/ai/brain/pulse_query';
import { siteUrlFromRequest } from '@/lib/core/site_url';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type TahMetaRouteProps = {
  params: {
    slug: string;
  };
};

export function GET(request: NextRequest, { params }: TahMetaRouteProps) {
  const cartridge = getPulseCartridge(params.slug);

  if (!cartridge) {
    return Response.json(
      {
        error: 'TAH cartridge not found.',
        slug: params.slug
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
      cartridge: getCartridgeMetadata(cartridge, siteUrlFromRequest(request))
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    }
  );
}

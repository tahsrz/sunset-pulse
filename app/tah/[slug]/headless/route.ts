import { notFound } from 'next/navigation';
import { formatHeadlessCartridge, plainTextResponse } from '@/lib/ai/brain/headless_tah';
import { getPulseCartridge, previewPulseCartridge } from '@/lib/ai/brain/pulse_query';
import { siteUrlFromRequest } from '@/lib/core/site_url';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type HeadlessCartridgeRouteProps = {
  params: {
    slug: string;
  };
};

export async function GET(request: Request, { params }: HeadlessCartridgeRouteProps) {
  const cartridge = getPulseCartridge(params.slug);
  if (!cartridge) notFound();

  const host = siteUrlFromRequest(request);
  const previews = await previewPulseCartridge(params.slug, 8);
  return plainTextResponse(formatHeadlessCartridge(host, cartridge, previews));
}

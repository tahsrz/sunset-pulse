import { notFound } from 'next/navigation';
import { formatHeadlessCartridge, plainTextResponse } from '@/lib/ai/brain/headless_tah';
import { getPulseCartridge, previewPulseCartridge } from '@/lib/ai/brain/pulse_query';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type HeadlessCartridgeRouteProps = {
  params: {
    slug: string;
  };
};

export async function GET(_request: Request, { params }: HeadlessCartridgeRouteProps) {
  const cartridge = getPulseCartridge(params.slug);
  if (!cartridge) notFound();

  const host = process.env.NEXT_PUBLIC_SITE_URL || 'https://sunsetpulse.com';
  const previews = await previewPulseCartridge(params.slug, 8);
  return plainTextResponse(formatHeadlessCartridge(host, cartridge, previews));
}

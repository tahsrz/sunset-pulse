import { formatHeadlessCatalog, plainTextResponse } from '@/lib/ai/brain/headless_tah';
import { listPulseCartridges } from '@/lib/ai/brain/pulse_query';
import { siteUrlFromRequest } from '@/lib/core/site_url';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET(request: Request) {
  const host = siteUrlFromRequest(request);
  return plainTextResponse(formatHeadlessCatalog(host, listPulseCartridges()));
}

import { formatHeadlessCatalog, plainTextResponse } from '@/lib/ai/brain/headless_tah';
import { listPulseCartridges } from '@/lib/ai/brain/pulse_query';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET() {
  const host = process.env.NEXT_PUBLIC_SITE_URL || 'https://sunsetpulse.com';
  return plainTextResponse(formatHeadlessCatalog(host, listPulseCartridges()));
}

export const dynamic = 'force-dynamic';

import { getCallAssistReadiness } from '@/lib/call-assist/readiness';
import { successResponse } from '@/lib/core/apiResponse';

export async function GET() {
  return successResponse(getCallAssistReadiness());
}

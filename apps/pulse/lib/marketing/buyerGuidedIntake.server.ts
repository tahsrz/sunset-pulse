import 'server-only';

import { normalizePublicTenantSlug } from '@/lib/sites/tenantRouting';

export function getGuidedBuyerIntakeSite() {
  if (process.env.BUYER_GUIDED_INTAKE_ENABLED !== 'true') return null;
  return normalizePublicTenantSlug(process.env.BUYER_REQUEST_AGENT_SITE?.trim());
}

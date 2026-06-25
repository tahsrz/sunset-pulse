import { NextRequest } from 'next/server';
import { z } from 'zod';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import {
  crawlLeadIntelligence,
  getLeadIntelCrawlSnapshot,
  importLeadIntelCrawlToTah,
  requestAllowlistIsTrusted,
  type LeadIntelCrawlInput,
} from '@/lib/lead-intel/crawlLead';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const crawlRequestSchema = z.object({
  url: z.string().url().max(2048),
  sourceType: z.enum(['brokerage', 'regional_site', 'tax_record', 'business_profile', 'other']).optional(),
  entityHints: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  extractionMode: z.enum(['markdown', 'json', 'both']).optional(),
  maxPages: z.number().int().min(1).max(10).optional(),
  timeoutMs: z.number().int().min(5000).max(120000).optional(),
  allowedDomains: z.array(z.string().min(1).max(255)).max(30).optional(),
  importToTah: z.boolean().optional(),
  tahOutputDir: z.string().max(1000).optional(),
});

export async function GET(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;

  return successResponse({
    endpoint: '/api/intelligence/crawl-lead',
    framework: 'crawl4ai',
    mode: 'operator_local_first',
    snapshot: getLeadIntelCrawlSnapshot(),
    safety: {
      requestAllowlistTrusted: requestAllowlistIsTrusted(),
      unlistedLocalOverride: process.env.LEAD_INTEL_ALLOW_UNLISTED === 'true' && process.env.NODE_ENV !== 'production',
      disabled: process.env.LEAD_INTEL_CRAWLER_DISABLED === 'true',
    },
  });
}

export async function POST(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = crawlRequestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Invalid lead crawl request.', 400, parsed.error.flatten());
    }

    const record = await crawlLeadIntelligence(parsed.data as LeadIntelCrawlInput);
    const tahImport = parsed.data.importToTah
      ? importLeadIntelCrawlToTah({
          recordId: record.id,
          outputDir: parsed.data.tahOutputDir,
        })
      : null;
    return successResponse({
      endpoint: '/api/intelligence/crawl-lead',
      framework: 'crawl4ai',
      record,
      tahImport,
    }, {}, responseStatusFor(record.status));
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to crawl lead intelligence source.',
      400
    );
  }
}

function responseStatusFor(status: string) {
  if (status === 'completed') return 200;
  if (status === 'blocked') return 423;
  if (status === 'unavailable') return 503;
  return 500;
}

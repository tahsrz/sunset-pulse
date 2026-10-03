import 'server-only';

import reportIndex from '@/content/market-reports/index.v1.json';
import { marketReportCollectionSchema } from '@/lib/marketing/marketReportSchema';

const parsedIndex = marketReportCollectionSchema.parse(reportIndex);

export function listPublishedMarketReports(now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  return parsedIndex.reports.filter((report) =>
    report.status === 'published'
    && report.reviewedAt !== null
    && report.expiresAt >= today
    && ['authorized', 'public-permitted'].includes(report.source.licenseStatus),
  );
}

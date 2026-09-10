import { loadEnvConfig } from '@next/env';
import mongoose from 'mongoose';
import connectDB from '../lib/core/database';
import { countEmbeddedTaxonomyUsage, countNormalizedTaxonomyUsage } from '../lib/cms/taxonomyRepository';
import { buildTaxonomyReconciliationReport } from '../lib/cms/taxonomyReconciliation';
import Vibe from '../models/Vibe';

loadEnvConfig(process.cwd());

async function main() {
  await connectDB();
  const tenants = await Vibe.distinct('tenantId');
  const tenantIds = tenants.length > 0 ? [...new Set(tenants.map((tenant) => String(tenant || 'default')))] : ['default'];
  const reports = await Promise.all(tenantIds.map(async (tenantId) => buildTaxonomyReconciliationReport({
    tenantId,
    embeddedCounts: await countEmbeddedTaxonomyUsage(tenantId),
    normalizedCounts: await countNormalizedTaxonomyUsage(tenantId),
  })));
  process.stdout.write(`${JSON.stringify({ state: reports.every((report) => report.state === 'agrees') ? 'agrees' : 'mismatch', reports }, null, 2)}\n`);
  if (reports.some((report) => report.state !== 'agrees')) process.exitCode = 2;
}

main()
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });

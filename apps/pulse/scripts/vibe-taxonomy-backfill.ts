import connectDB from '../lib/core/database';
import { analyzeTaxonomyBackfill } from '../lib/cms/taxonomyBackfill';
import Vibe from '../models/Vibe';

async function main() {
  if (process.argv.includes('--write')) throw new Error('Write mode is not implemented. This command is intentionally dry-run only.');
  await connectDB();
  const vibes = await Vibe.find({}).select('tenantId vibeId taxonomyTermIds').lean();
  process.stdout.write(`${JSON.stringify(analyzeTaxonomyBackfill(vibes), null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});

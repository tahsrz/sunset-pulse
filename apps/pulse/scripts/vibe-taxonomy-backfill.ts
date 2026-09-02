import connectDB from '../lib/core/database';
import { analyzeTaxonomyBackfill } from '../lib/cms/taxonomyBackfill';
import { writeTaxonomyBackfill } from '../lib/cms/taxonomyBackfill';
import { seedControlledVibeTaxonomies } from '../lib/cms/taxonomySeed';
import Vibe from '../models/Vibe';

async function main() {
  const write = process.argv.includes('--write');
  if (write && process.env.VIBE_TAXONOMY_BACKFILL_WRITE !== '1') throw new Error('Write mode requires VIBE_TAXONOMY_BACKFILL_WRITE=1.');
  await connectDB();
  const vibes = await Vibe.find({}).select('tenantId vibeId taxonomyTermIds').lean();
  const result = write
    ? await (async () => {
      for (const tenantId of new Set(vibes.map((vibe) => String(vibe.tenantId || 'default')))) {
        await seedControlledVibeTaxonomies({ tenantId });
      }
      return writeTaxonomyBackfill({ vibes, actorId: 'taxonomy-backfill' });
    })()
    : analyzeTaxonomyBackfill(vibes);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});

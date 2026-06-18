import dotenv from 'dotenv';
import path from 'path';
import { importHotsheetFile } from '../lib/data/hotsheetMls';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: tsx scripts/import-hotsheet-text.ts <absolute-or-relative-text-file-path>');
  process.exit(1);
}

importHotsheetFile(path.resolve(process.cwd(), inputPath))
  .then(({ run, listings }) => {
    const { received, synced, skipped, failed } = run.metrics;
    console.log(`Parsed hotsheet listings: ${listings.length}`);
    console.log(`Run ${run.id}: received=${received}, synced=${synced}, skipped=${skipped}, failed=${failed}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Hotsheet import failed:', error);
    process.exit(1);
  });

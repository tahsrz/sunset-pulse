import path from 'path';
import { writeAtlasManifest } from '../lib/ai/brain/atlas_manifest';

const outArg = process.argv.find(arg => arg.startsWith('--out='));
const batchArg = process.argv.find(arg => arg.startsWith('--batch='));

const outputPath = outArg
  ? path.resolve(process.cwd(), outArg.replace('--out=', ''))
  : path.join(process.cwd(), 'public', 'atlas_manifest.json');

const batchSize = batchArg ? Number(batchArg.replace('--batch=', '')) : 25;
const manifest = writeAtlasManifest(outputPath, batchSize);

console.log(`[ATLAS_MANIFEST] Published ${manifest.mapped}/${manifest.total} cartridges to ${outputPath}`);
console.log(`[ATLAS_MANIFEST] Formats: ${JSON.stringify(manifest.formats)}`);

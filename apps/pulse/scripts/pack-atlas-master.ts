import path from 'path';
import { packPulseCatalog } from '../lib/core/tah_packager';

const args = new Map(
  process.argv
    .slice(2)
    .filter(arg => arg.startsWith('--') && arg.includes('='))
    .map(arg => {
      const [key, ...value] = arg.slice(2).split('=');
      return [key, value.join('=')];
    })
);

const include = args.get('include')
  ?.split(',')
  .map(slug => slug.trim())
  .filter(Boolean);
const exclude = args.get('exclude')
  ?.split(',')
  .map(slug => slug.trim())
  .filter(Boolean);
const maxShards = args.get('max-shards') ? Number(args.get('max-shards')) : undefined;
const outputDir = args.get('out')
  ? path.resolve(process.cwd(), args.get('out')!)
  : path.join(process.cwd(), 'cartridges', 'master');

const result = packPulseCatalog({
  baseName: args.get('name') || 'atlas_pulse_master',
  outputDir,
  includeSlugs: include,
  excludeSlugs: exclude,
  maxShards
});

console.log(JSON.stringify({
  name: result.baseName,
  outputDir: result.outputDir,
  hatPath: result.hatPath,
  tahPath: result.tahPath,
  manifestPath: result.manifestPath,
  sourceCount: result.sourceCount,
  skippedCount: result.skippedCount,
  shardCount: result.shardCount,
  files: result.files,
  stats: result.stats,
  skipped: result.skipped
}, null, 2));

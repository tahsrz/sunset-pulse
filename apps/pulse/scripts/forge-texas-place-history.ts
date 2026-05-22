import fs from 'fs';
import path from 'path';
import { TAHBuilder } from '../lib/core/tah_builder';
import { buildTexasPlaceHistoryTahInputs, TEXAS_PLACE_HISTORY_CARTRIDGE } from '../lib/tah/texasPlaceHistory';

function forgeTexasPlaceHistory() {
  const inputs = buildTexasPlaceHistoryTahInputs();

  if (inputs.length === 0) {
    throw new Error('No Texas place history entries are available to forge.');
  }

  const builder = new TAHBuilder(0.001, 14);
  const buffer = builder.forge(inputs);
  const outputDir = path.join(process.cwd(), 'cartridges');
  const outputPath = path.join(outputDir, TEXAS_PLACE_HISTORY_CARTRIDGE);

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, buffer);

  console.log(JSON.stringify({
    cartridge: TEXAS_PLACE_HISTORY_CARTRIDGE,
    outputPath,
    shards: inputs.length,
    bytes: buffer.length
  }, null, 2));
}

forgeTexasPlaceHistory();

import { TAHRetriever } from './tah_retriever';
import { supabase } from '../supabase';
import fs from 'fs';
import path from 'path';

const CARTRIDGES = [
  'abidan_court.tah',
  'abidan_vault.tah',
  'neighborhood_intel.tah',
  'user_memories.tah'
];

const TAH_CACHE: Record<string, Buffer> = {};

export interface GroundTruthResult {
  source: string;
  data: string;
  confidence: number;
}

/**
 * Surgical Retriever for Multi-Cartridge Intelligence
 * Queries all available tactical brain cartridges for ground-truth data.
 */
export async function getGroundTruth(query: string): Promise<GroundTruthResult[]> {
  const results: GroundTruthResult[] = [];
  const normalizedQuery = query.toLowerCase().trim();

  for (const cartridge of CARTRIDGES) {
    try {
      let buffer = TAH_CACHE[cartridge];

      if (!buffer) {
        // 1. Try Local File System first (Dev/Edge)
        const localPath = path.resolve(process.cwd(), `cartridges/${cartridge}`);
        if (fs.existsSync(localPath)) {
          buffer = fs.readFileSync(localPath);
          TAH_CACHE[cartridge] = buffer;
          console.log(`[TAH_LOCAL_LOAD] Successfully retrieved ${cartridge} from local storage.`);
        } else {
          // 2. Fallback to Supabase Storage (Production/Cloud)
          const { data, error } = await supabase.storage
            .from('cartridges')
            .download(cartridge);

          if (!error && data) {
            const arrayBuffer = await data.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
            TAH_CACHE[cartridge] = buffer;
            console.log(`[TAH_CLOUD_LOAD] Successfully retrieved ${cartridge} from Supabase.`);
          }
        }
      }

      if (buffer) {
        const retriever = new TAHRetriever(buffer);
        const matches = retriever.search(normalizedQuery);
        
        matches.forEach(match => {
          results.push({
            source: cartridge.replace('.tah', '').toUpperCase(),
            data: match.data,
            confidence: 0.95 // TAH matches are highly deterministic
          });
        });
      }
    } catch (err) {
      console.error(`[SURGICAL_RETRIEVER_ERROR] Failed to query ${cartridge}:`, err);
    }
  }

  return results;
}

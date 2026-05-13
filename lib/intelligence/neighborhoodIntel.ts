import path from 'path';
import fs from 'fs';
import { TAHRetriever } from '../core/tah_retriever';

/**
 * Neighborhood Intelligence Retriever
 * Surgical lookup of local facts for Jamie AI.
 * Now utilizing TAH Cartridges for deterministic expertise.
 */

const CARTRIDGE_PATH = path.resolve(process.cwd(), 'cartridges/neighborhood_intel.tah');

const NEIGHBORHOOD_KNOWLEDGE = {
  "bowie": {
    "vibe": "Ranch-ready and community-focused.",
    "fact": "Known for the Second Monday Trade Days, one of the oldest and largest flea markets in the state.",
    "amenity": "Proximity to the Bowie Highway commerce corridor."
  },
  "keller": {
    "vibe": "Upscale suburban with high-performance schools.",
    "fact": "Voted one of the best places to live in America by Money Magazine multiple times.",
    "amenity": "Excellent park system including Bear Creek Park."
  },
  "fort worth": {
    "vibe": "The perfect blend of cowboy culture and modern industry.",
    "fact": "Home to the world's only twice-daily cattle drive at the Stockyards.",
    "amenity": "Rapidly growing Alliance Corridor for tech and logistics."
  },
  "dallas": {
    "vibe": "Metropolitan powerhouse with a deep financial core.",
    "fact": "The Dallas Arts District is the largest contiguous urban arts district in the US.",
    "amenity": "World-class dining and high-speed transit infrastructure."
  }
};

export function getNeighborhoodIntel(city: string, neighborhood?: string) {
  const key = city.toLowerCase().trim();
  
  // 1. Attempt TAH Retrieval (Expertise Layer)
  if (fs.existsSync(CARTRIDGE_PATH)) {
    try {
      const retriever = new TAHRetriever(CARTRIDGE_PATH);
      const results = retriever.search(key);
      
      if (results.length > 0) {
        console.log(`🎯 [TAH_HIT] Expertise retrieved for: ${key}`);
        // For now, we take the first matching shard and parse it.
        // Expecting format: "Vibe: ... | Fact: ... | Amenity: ..."
        const data = results[0].data;
        const parts = data.split('|').map(p => p.split(':')[1]?.trim());
        
        if (parts.length >= 3) {
          return {
            vibe: parts[0],
            fact: parts[1],
            amenity: parts[2]
          };
        }
      }
    } catch (err) {
      console.error(`[TAH_ERROR] Failed to retrieve intelligence for ${key}:`, err);
    }
  }

  // 2. Fallback to Hardcoded Knowledge
  const intel = NEIGHBORHOOD_KNOWLEDGE[key as keyof typeof NEIGHBORHOOD_KNOWLEDGE] || {
    vibe: "High-potential growth zone.",
    fact: "Located in a region with significant economic momentum.",
    amenity: "Access to local Texas commerce and community hubs."
  };

  return intel;
}

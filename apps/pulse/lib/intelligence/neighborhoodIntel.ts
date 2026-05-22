import { TAHRetriever } from '../core/tah_retriever';
import { supabase } from '../supabase';

/**
 * Neighborhood Intelligence Retriever
 * Surgical lookup of local facts for Jamie AI.
 * Now utilizing Supabase-hosted TAH Cartridges for cloud-native expertise.
 */

const NEIGHBORHOOD_KNOWLEDGE = {
  // ... (keeping fallback knowledge for safety)
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

// Warm Cache for TAH Buffers to minimize storage egress
const TAH_CACHE: Record<string, Buffer> = {};

export async function getNeighborhoodIntel(city: string, neighborhood?: string) {
  const key = city.toLowerCase().trim();
  const cartridgeName = 'neighborhood_intel.tah';
  
  // 1. Attempt TAH Retrieval (Expertise Layer via Supabase Storage)
  try {
    let buffer = TAH_CACHE[cartridgeName];
    
    if (!buffer) {
      console.log(`🌐 [TAH_FETCH] Downloading ${cartridgeName} from grid storage...`);
      const { data, error } = await supabase.storage
        .from('cartridges')
        .download(cartridgeName);
      
      if (!error && data) {
        const arrayBuffer = await data.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
        TAH_CACHE[cartridgeName] = buffer;
      }
    }

    if (buffer) {
      const retriever = new TAHRetriever(buffer);
      const results = retriever.search(key);
      
      if (results.length > 0) {
        console.log(`🎯 [TAH_HIT] Expertise retrieved from storage for: ${key}`);
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
    }
  } catch (err) {
    console.error(`[TAH_STORAGE_ERROR] Failed to retrieve intelligence for ${key}:`, err);
  }

  // 2. Fallback to Hardcoded Knowledge
  const intel = NEIGHBORHOOD_KNOWLEDGE[key as keyof typeof NEIGHBORHOOD_KNOWLEDGE] || {
    vibe: "High-potential growth zone.",
    fact: "Located in a region with significant economic momentum.",
    amenity: "Access to local Texas commerce and community hubs."
  };

  return intel;
}

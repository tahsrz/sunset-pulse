/**
 * Neighborhood Intelligence Retriever
 * Surgical lookup of local facts for Jamie AI.
 * Future implementation will use TAH Cartridges.
 */

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
  const intel = NEIGHBORHOOD_KNOWLEDGE[key as keyof typeof NEIGHBORHOOD_KNOWLEDGE] || {
    vibe: "High-potential growth zone.",
    fact: "Located in a region with significant economic momentum.",
    amenity: "Access to local Texas commerce and community hubs."
  };

  return intel;
}

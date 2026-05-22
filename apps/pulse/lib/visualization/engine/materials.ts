/**
 * Defines the visual identity for procedurally generated assets
 */

export interface MaterialTemplate {
  structure: string; // R G B
  roof: string;
  trim: string;
  window: string;
  lawn: string;
  driveway: string;
  foliage: string;
  trunk: string;
}

export const MaterialLibrary: Record<string, MaterialTemplate> = {
  brick: {
    structure: '153 27 27', // Dark red brick
    roof: '64 64 64',      // Charcoal gray
    trim: '245 245 245',   // Off-white
    window: '186 230 253', // Light blue
    lawn: '21 128 61',     // Deep grass green
    driveway: '115 115 115', // Concrete gray
    foliage: '22 163 74',  // Vibrant green
    trunk: '120 113 108',  // Bark brown
  },
  modern: {
    structure: '255 255 255', // Pure white stucco
    roof: '23 23 23',        // Obsidian black
    trim: '38 38 38',        // Matte black
    window: '56 189 248',    // Sky blue
    lawn: '34 197 94',       // Fresh lawn
    driveway: '64 64 64',     // Asphalt
    foliage: '21 128 61',
    trunk: '68 64 60',
  },
  wood: {
    structure: '146 64 14',  // Cedar/Brown
    roof: '41 37 36',        // Dark shingle
    trim: '214 211 209',     // Stone trim
    window: '125 211 252',
    lawn: '101 163 13',      // Olive lawn
    driveway: '168 162 158', // Gravel
    foliage: '63 98 18',
    trunk: '41 37 36',
  },
  default: {
    structure: '200 200 200',
    roof: '100 100 100',
    trim: '255 255 255',
    window: '186 230 253',
    lawn: '34 197 94',
    driveway: '115 115 115',
    foliage: '34 197 94',
    trunk: '120 113 108',
  }
};

/**
 * Resolves a template based on metadata
 */
export const getMaterialForProperty = (property: any): MaterialTemplate => {
  const type = property?.type?.toLowerCase() || 'default';
  
  if (type.includes('house')) return MaterialLibrary.brick;
  if (type.includes('condo') || type.includes('apartment')) return MaterialLibrary.modern;
  if (type.includes('cabin') || type.includes('cottage')) return MaterialLibrary.wood;
  
  return MaterialLibrary.default;
};

/**
 * SunsetGG Renderer V4 - "The Digital Twin Update"
 * Improvements: Standard MTL support, relative indexing, and data-driven scaling.
 */

const colors = {
  logic: '59 130 246', 
  data: '168 85 247',  
  agent: '34 197 94',  
  obstacle: '249 115 22',
};

class MeshBuffer {
  private vertices: number[][] = [];
  private faces: { indices: number[]; material: string }[] = [];
  private currentMaterial: string = 'default';
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  addVertex(x: number, y: number, z: number): number {
    this.vertices.push([x, y, z]);
    return this.vertices.length; // 1-based index for OBJ
  }

  useMaterial(mat: string): void {
    this.currentMaterial = mat;
  }

  addFace(indices: number[]): void {
    this.faces.push({ indices, material: this.currentMaterial });
  }

  // Helper to add a box with relative indexing
  addBox(x: number, y: number, z: number, w: number, h: number, d: number, mat?: string) {
    if (mat) this.useMaterial(mat);
    const s = this.vertices.length + 1;
    
    // Bottom 4
    this.addVertex(x - w/2, y, z - d/2);
    this.addVertex(x + w/2, y, z - d/2);
    this.addVertex(x + w/2, y, z + d/2);
    this.addVertex(x - w/2, y, z + d/2);
    // Top 4
    this.addVertex(x - w/2, y + h, z - d/2);
    this.addVertex(x + w/2, y + h, z - d/2);
    this.addVertex(x + w/2, y + h, z + d/2);
    this.addVertex(x - w/2, y + h, z + d/2);

    this.addFace([s, s+1, s+5, s+4]);     // Front
    this.addFace([s+1, s+2, s+6, s+5]);   // Right
    this.addFace([s+2, s+3, s+7, s+6]);   // Back
    this.addFace([s+3, s, s+4, s+7]);     // Left
    this.addFace([s+4, s+5, s+6, s+7]);   // Top
    this.addFace([s, s+3, s+2, s+1]);     // Bottom
  }

  build(): string {
    let output = `# SunsetGG Asset Export\nmtllib scene.mtl\no ${this.name}\n`;
    
    for (const v of this.vertices) {
      output += `v ${v[0].toFixed(3)} ${v[1].toFixed(3)} ${v[2].toFixed(3)}\n`;
    }

    let lastMat = '';
    for (const f of this.faces) {
      if (f.material !== lastMat) {
        output += `usemtl ${f.material}\n`;
        lastMat = f.material;
      }
      output += `f ${f.indices.join(' ')}\n`;
    }
    return output;
  }
}

export const generatePropertyModel = (property: any, includeCourse: boolean = false): string => {
  const { 
    square_feet = 2000, 
    stories = 1, 
    amenities = [], 
    year_built = 2024 
  } = property || {};

  const buffer = new MeshBuffer(property?.name || 'Property_Model');
  
  // Logic: Scale dimensions based on actual square footage
  const footprintArea = square_feet / stories;
  const width = Math.sqrt(footprintArea * 1.2);
  const depth = footprintArea / width;
  const floorHeight = 10;
  const totalHeight = stories * floorHeight;

  // 1. Terrain & Driveway
  buffer.addBox(0, -0.5, 0, width * 2.5, 0.5, depth * 2.5, 'foliage');
  
  const hasGarage = amenities.some((a: any) => a?.toLowerCase().includes('garage'));
  if (hasGarage) {
    buffer.addBox(width/2 + 10, -0.4, 0, 15, 0.4, depth, 'driveway');
  }

  // 2. Main Structure (Stacked floors if > 1 story)
  for (let i = 0; i < stories; i++) {
    const yOffset = i * floorHeight;
    buffer.addBox(0, yOffset, 0, width, floorHeight, depth, 'structure');
    // Horizontal Trim between floors
    if (stories > 1) {
      buffer.addBox(0, yOffset + floorHeight - 0.5, 0, width + 0.5, 1, depth + 0.5, 'trim');
    }
  }

  // 3. Roof (Adaptive to property age - older = steeper)
  const isModern = year_built > 2010;
  const roofPitch = isModern ? 4 : 8; 
  const rS = buffer.addVertex(-width/2-1, totalHeight, -depth/2-1);
  buffer.addVertex(width/2+1, totalHeight, -depth/2-1);
  buffer.addVertex(width/2+1, totalHeight, depth/2+1);
  buffer.addVertex(-width/2-1, totalHeight, depth/2+1);
  buffer.addVertex(0, totalHeight + roofPitch, -depth/2-1);
  buffer.addVertex(0, totalHeight + roofPitch, depth/2+1);

  buffer.useMaterial('roof');
  buffer.addFace([rS, rS+1, rS+4]);
  buffer.addFace([rS+2, rS+3, rS+5]);
  buffer.addFace([rS, rS+4, rS+5, rS+3]);
  buffer.addFace([rS+1, rS+2, rS+5, rS+4]);

  // 4. Windows (Based on width)
  const winCount = Math.floor(width / 10);
  for (let f = 0; f < stories; f++) {
    for (let i = 0; i < winCount; i++) {
      const xPos = -width/2 + (i + 1) * (width/(winCount+1));
      const yPos = (f * floorHeight) + 3;
      // Front Windows
      buffer.addBox(xPos, yPos, -depth/2, 3, 4, 0.2, 'window');
    }
  }

  // 5. Environmental Details
  // Deterministic placement based on property ID or price
  const seed = (property?.price || 500000) % 100;
  if (seed > 50) {
    // Add a simple "Pool" if it's a "premium" seed
    buffer.addBox(-width, -0.4, depth, 20, 0.2, 15, 'data'); // Reusing data color for water
  }

  return buffer.build();
};

export const generateRingModel = (x: number, y: number, z: number, radius: number): string => {
  const buffer = new MeshBuffer('Training_Ring');
  const segments = 24;
  const tube = Math.max(radius * 0.08, 0.8);

  buffer.useMaterial('checkpoint');

  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    const c0 = Math.cos(a0);
    const s0 = Math.sin(a0);
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);

    const v0 = buffer.addVertex(x + c0 * (radius - tube), y + s0 * (radius - tube), z);
    const v1 = buffer.addVertex(x + c1 * (radius - tube), y + s1 * (radius - tube), z);
    const v2 = buffer.addVertex(x + c1 * (radius + tube), y + s1 * (radius + tube), z);
    const v3 = buffer.addVertex(x + c0 * (radius + tube), y + s0 * (radius + tube), z);

    buffer.addFace([v0, v1, v2]);
    buffer.addFace([v0, v2, v3]);
  }

  return buffer.build();
};

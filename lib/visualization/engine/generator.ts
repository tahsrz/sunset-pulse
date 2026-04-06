import { getMaterialForProperty, MaterialTemplate } from './materials';

const colors = {
  logic: '59 130 246', // Blue for system logic
  data: '168 85 247',  // Purple for data clusters
  agent: '34 197 94',  // Green for Jamie
  obstacle: '249 115 22',
};

class MeshBuffer {
  private vertices: number[][] = [];
  private faces: { indices: number[]; color?: string }[] = [];
  private currentColor: string | null = null;
  private header: string;
  private name: string;

  constructor(name: string, header: string = '# SunsetGG Asset') {
    this.name = name;
    this.header = header;
  }

  addVertex(x: number, y: number, z: number): number {
    this.vertices.push([x, y, z]);
    return this.vertices.length;
  }

  useColor(color: string | null): void {
    this.currentColor = color;
  }

  addFace(indices: number[], color?: string): void {
    this.faces.push({ indices, color: color || this.currentColor || undefined });
  }

  get vertexCount(): number {
    return this.vertices.length;
  }

  build(): string {
    let output = `${this.header}\no ${this.name}\n`;
    for (const v of this.vertices) {
      output += `v ${v[0].toFixed(3)} ${v[1].toFixed(3)} ${v[2].toFixed(3)}\n`;
    }
    let lastColor: string | undefined = undefined;
    for (const f of this.faces) {
      if (f.color !== lastColor) {
        output += `usecolor ${f.color || 'reset'}\n`;
        lastColor = f.color;
      }
      output += `f ${f.indices.join(' ')}\n`;
    }
    return output;
  }
}

export const generatePropertyModel = (property: any, includeCourse: boolean = false): string => {
  const { square_feet = 2000, amenities = [] } = property || {};
  const hasGarage = Array.isArray(amenities) && amenities.some((a: any) => a?.toLowerCase().includes('garage'));
  
  const mat = getMaterialForProperty(property);

  const totalArea = square_feet > 0 ? square_feet : 2000;
  const width = Math.sqrt(totalArea * 1.2);
  const depth = totalArea / width;
  const height = 12; 
  
  const buffer = new MeshBuffer('Scene', '# SunsetGG Material-Aware Asset V3');

  const addBox = (x: number, y: number, z: number, w: number, h: number, d: number, colorTag: string | null) => {
    const s = buffer.vertexCount + 1;
    buffer.addVertex(x - w/2, y, z - d/2);
    buffer.addVertex(x + w/2, y, z - d/2);
    buffer.addVertex(x + w/2, y, z + d/2);
    buffer.addVertex(x - w/2, y, z + d/2);
    buffer.addVertex(x - w/2, y + h, z - d/2);
    buffer.addVertex(x + w/2, y + h, z - d/2);
    buffer.addVertex(x + w/2, y + h, z + d/2);
    buffer.addVertex(x - w/2, y + h, z + d/2);
    
    const color = colorTag || 'reset';
    buffer.addFace([s, s+1, s+5, s+4], color);
    buffer.addFace([s+1, s+2, s+6, s+5], color);
    buffer.addFace([s+2, s+3, s+7, s+6], color);
    buffer.addFace([s+3, s, s+4, s+7], color);
    buffer.addFace([s+4, s+5, s+6, s+7], color);
    buffer.addFace([s, s+3, s+2, s+1], color);
  };

  // Lawn & Driveway
  addBox(0, -0.2, 0, width * 3, 0.2, depth * 3, mat.lawn);
  
  if (hasGarage) {
    addBox(width/2 + 15, -0.1, -depth/2 - 10, 15, 0.1, depth + 20, mat.driveway);
  }

  // Abdomen
  addBox(0, 0, 0, width, height, depth, mat.structure); 
  
  // Corner
  const pW = 1.5;
  addBox(-width/2, 0, -depth/2, pW, height + 0.5, pW, mat.trim);
  addBox(width/2, 0, -depth/2, pW, height + 0.5, pW, mat.trim);
  addBox(width/2, 0, depth/2, pW, height + 0.5, pW, mat.trim);
  addBox(-width/2, 0, depth/2, pW, height + 0.5, pW, mat.trim);

  if (hasGarage) {
    addBox(width/2 + 10, 0, 0, 20, height * 0.8, 20, mat.structure);
    addBox(width/2 + 10, 0, -10.1, 15, height * 0.6, 0.2, mat.trim);
  }

  // Roof and Trim
  const rStart = buffer.vertexCount + 1;
  buffer.addVertex(-width/2-2, height, -depth/2-2);
  buffer.addVertex(width/2+2, height, -depth/2-2);
  buffer.addVertex(width/2+2, height, depth/2+2);
  buffer.addVertex(-width/2-2, height, depth/2+2);
  buffer.addVertex(0, height+8, -depth/2-2);
  buffer.addVertex(0, height+8, depth/2+2);
  
  buffer.addFace([rStart, rStart+1, rStart+4], mat.roof);
  buffer.addFace([rStart+2, rStart+3, rStart+5], mat.roof);
  buffer.addFace([rStart, rStart+4, rStart+5, rStart+3], mat.roof);
  buffer.addFace([rStart+1, rStart+2, rStart+5, rStart+4], mat.roof);

  // Windows
  const winCount = Math.floor(width / 12);
  for(let i=0; i<winCount; i++) {
    const xPos = -width/2 + (i + 1) * (width/(winCount+1));
    const s1 = buffer.vertexCount + 1;
    buffer.addVertex(xPos - 2, 4, -depth/2 - 0.3);
    buffer.addVertex(xPos + 2, 4, -depth/2 - 0.3);
    buffer.addVertex(xPos + 2, 9, -depth/2 - 0.3);
    buffer.addVertex(xPos - 2, 9, -depth/2 - 0.3);
    buffer.addFace([s1, s1+1, s1+2, s1+3], mat.window);
  }

  // Foliage
  const trees: [number, number][] = [[-width/2 - 20, -depth/2 - 15], [width/2 + 20, depth/2 + 15], [-width/2 - 30, 25]];
  trees.forEach(([tx, tz]) => {
    addBox(tx, 0, tz, 2, 6, 2, mat.trunk);
    const fs = buffer.vertexCount + 1;
    buffer.addVertex(tx, 18, tz);
    buffer.addVertex(tx-6, 6, tz-6);
    buffer.addVertex(tx+6, 6, tz-6);
    buffer.addVertex(tx+6, 6, tz+6);
    buffer.addVertex(tx-6, 6, tz+6);
    buffer.addFace([fs, fs+1, fs+2], mat.foliage);
    buffer.addFace([fs, fs+2, fs+3], mat.foliage);
    buffer.addFace([fs, fs+3, fs+4], mat.foliage);
    buffer.addFace([fs, fs+4, fs+1], mat.foliage);
  });

  // Obstacle
  if (includeCourse) {
    const addRing = (x: number, y: number, z: number, r: number) => {
      const s = buffer.vertexCount + 1;
      for (let i = 0; i < 8; i++) {
        const a = (i/8)*Math.PI*2;
        buffer.addVertex(x + Math.cos(a)*r, y + Math.sin(a)*r, z);
        buffer.addVertex(x + Math.cos(a)*r*0.85, y + Math.sin(a)*r*0.85, z);
      }
      for (let i = 0; i < 8; i++) {
        const b = s + (i*2); const nb = s + (((i+1)%8)*2);
        buffer.addFace([b, b+1, nb+1, nb], colors.obstacle);
      }
    };
    addRing(-60, 30, -50, 18); addRing(60, 40, 60, 22); addRing(0, 60, 100, 15);
  }

  return buffer.build();
};

export const generateRingModel = (x: number, y: number, z: number, r: number, color: string = '249 115 22'): string => {
  const buffer = new MeshBuffer('Ring', '# SunsetGG Ring Asset');
  
  const s = 1;
  for (let i = 0; i < 8; i++) {
    const a = (i/8)*Math.PI*2;
    buffer.addVertex(x + Math.cos(a)*r, y + Math.sin(a)*r, z);
    buffer.addVertex(x + Math.cos(a)*r*0.85, y + Math.sin(a)*r*0.85, z);
  }
  
  for (let i = 0; i < 8; i++) {
    const b = s + (i*2); const nb = s + (((i+1)%8)*2);
    buffer.addFace([b, b+1, nb+1, nb], color);
  }

  return buffer.build();
};

export const generateSystemArchitectureModel = (): string => {
  const buffer = new MeshBuffer('SystemArchitecture', '# SunsetGG System Viz');

  const addNode = (x: number, y: number, z: number, w: number, h: number, d: number, colorTag: string) => {
    const s = buffer.vertexCount + 1;
    buffer.addVertex(x - w/2, y, z - d/2);
    buffer.addVertex(x + w/2, y, z - d/2);
    buffer.addVertex(x + w/2, y, z + d/2);
    buffer.addVertex(x - w/2, y, z + d/2);
    buffer.addVertex(x - w/2, y + h, z - d/2);
    buffer.addVertex(x + w/2, y + h, z - d/2);
    buffer.addVertex(x + w/2, y + h, z + d/2);
    buffer.addVertex(x - w/2, y + h, z + d/2);
    
    buffer.addFace([s, s+1, s+5, s+4], colorTag);
    buffer.addFace([s+1, s+2, s+6, s+5], colorTag);
    buffer.addFace([s+2, s+3, s+7, s+6], colorTag);
    buffer.addFace([s+3, s, s+4, s+7], colorTag);
    buffer.addFace([s+4, s+5, s+6, s+7], colorTag);
    buffer.addFace([s, s+3, s+2, s+1], colorTag);
  };

  addNode(0, 0, 0, 25, 6, 25, colors.logic);
  addNode(0, 35, 0, 12, 12, 12, colors.agent);
  addNode(-35, 0, 35, 15, 15, 15, colors.data);
  addNode(35, 0, -35, 15, 15, 15, colors.data);
  
  for(let i=0; i<4; i++) {
    const a = (i/4)*Math.PI*2;
    addNode(Math.cos(a)*60, 20, Math.sin(a)*60, 10, 10, 10, '255 255 255');
  }

  addNode(0, 10, 0, 1.5, 25, 1.5, '150 150 150');

  return buffer.build();
};

export const generateHallwayModel = (length: number = 600, width: number = 60, height: number = 40): string => {
  const buffer = new MeshBuffer('Hallway', '# SunsetGG Training Hallway V1');
  
  const addBox = (x: number, y: number, z: number, w: number, h: number, d: number, colorTag: string | null) => {
    const s = buffer.vertexCount + 1;
    buffer.addVertex(x - w/2, y, z - d/2);
    buffer.addVertex(x + w/2, y, z - d/2);
    buffer.addVertex(x + w/2, y, z + d/2);
    buffer.addVertex(x - w/2, y, z + d/2);
    buffer.addVertex(x - w/2, y + h, z - d/2);
    buffer.addVertex(x + w/2, y + h, z - d/2);
    buffer.addVertex(x + w/2, y + h, z + d/2);
    buffer.addVertex(x - w/2, y + h, z + d/2);
    
    const color = colorTag || 'reset';
    buffer.addFace([s, s+1, s+5, s+4], color);
    buffer.addFace([s+1, s+2, s+6, s+5], color);
    buffer.addFace([s+2, s+3, s+7, s+6], color);
    buffer.addFace([s+3, s, s+4, s+7], color);
    buffer.addFace([s+4, s+5, s+6, s+7], color);
    buffer.addFace([s, s+3, s+2, s+1], color);
  };

  // Floor
  addBox(0, -1, length/2 - 100, width, 1, length, '40 40 40');
  
  // Ceiling
  addBox(0, height, length/2 - 100, width, 1, length, '20 20 20');
  
  // Left Wall
  addBox(-width/2, 0, length/2 - 100, 1, height, length, '30 30 30');
  
  // Right Wall
  addBox(width/2, 0, length/2 - 100, 1, height, length, '30 30 30');

  // Pillars / Ribs for structure
  const ribSpacing = 100;
  for (let z = -100; z < length - 100; z += ribSpacing) {
    addBox(0, 0, z, width + 4, height + 4, 2, '59 130 246'); // Blue ribs
  }

  return buffer.build();
};

export const generateAbidanModel = (type: string = 'hound', color: string = '255 255 255'): string => {
  const buffer = new MeshBuffer('Pulse', `# SunsetGG Entity [TYPE: ${type.toUpperCase()}]`);

  const addTri = (v1: number[], v2: number[], v3: number[], colorTag: string) => {
    const s = buffer.vertexCount + 1;
    buffer.addVertex(v1[0], v1[1], v1[2]);
    buffer.addVertex(v2[0], v2[1], v2[2]);
    buffer.addVertex(v3[0], v3[1], v3[2]);
    buffer.addFace([s, s+1, s+2], colorTag);
  };

  const addBox = (x: number, y: number, z: number, w: number, h: number, d: number, colorTag: string) => {
    const s = buffer.vertexCount + 1;
    buffer.addVertex(x - w/2, y - h/2, z - d/2);
    buffer.addVertex(x + w/2, y - h/2, z - d/2);
    buffer.addVertex(x + w/2, y + h/2, z - d/2);
    buffer.addVertex(x - w/2, y + h/2, z - d/2);
    buffer.addVertex(x - w/2, y - h/2, z + d/2);
    buffer.addVertex(x + w/2, y - h/2, z + d/2);
    buffer.addVertex(x + w/2, y + h/2, z + d/2);
    buffer.addVertex(x - w/2, y + h/2, z + d/2);
    
    buffer.addFace([s, s+1, s+5, s+4], colorTag);
    buffer.addFace([s+1, s+2, s+6, s+5], colorTag);
    buffer.addFace([s+2, s+3, s+7, s+6], colorTag);
    buffer.addFace([s+3, s, s+4, s+7], colorTag);
    buffer.addFace([s+4, s+5, s+6, s+7], colorTag);
    buffer.addFace([s, s+3, s+2, s+1], colorTag);
  };

  if (type === 'hound') { 
    const r = 5;
    const pts = [[r,0,0], [-r,0,0], [0,r,0], [0,-r,0], [0,0,r], [0,0,-r]];
    const faces = [[2,4,0], [2,0,5], [2,5,1], [2,1,4], [3,0,4], [3,5,0], [3,1,5], [3,4,1]];
    faces.forEach(f => addTri(pts[f[0]], pts[f[1]], pts[f[2]], color));
  } 
  else if (type === 'gigante') { 
    const bodyW = 3, bodyH = 8;
    addBox(0, 0, 0, bodyW, bodyH, 2, color); 
    addBox(bodyW, bodyH/4, 0, 1, bodyH*1.5, 10, '200 200 200'); 
    addBox(-bodyW, bodyH/4, 0, 1, bodyH*1.5, 10, '200 200 200'); 
  }
  else if (type === 'ghost') { 
    const r = 4;
    const pts = [[0,r,0], [r,0,0], [0,0,r], [-r,0,0], [0,0,-r], [0,-r,0]];
    const faces = [[0,1,2], [0,2,3], [0,3,4], [0,4,1], [5,2,1], [5,3,2], [5,4,3], [5,1,4]];
    faces.forEach(f => addTri(pts[f[0]], pts[f[1]], pts[f[2]], '10 10 10')); 
    addBox(0, 0, 0, r*2.2, 0.1, r*2.2, color);
  }
  else if (type === 'spider') { 
    addBox(0, 4, 0, 2, 1, 2, color); 
    for(let i=0; i<4; i++) {
      const a = (i/4)*Math.PI*2 + Math.PI/4;
      const legX = Math.cos(a)*8, legZ = Math.sin(a)*8;
      addTri([0, 4, 0], [legX, 0, legZ], [legX*0.8, 0, legZ*0.8], color); 
    }
  }
  else if (type === 'wolf') { 
    const bodyW = 2, bodyH = 7;
    addBox(0, 0, 0, bodyW, bodyH, bodyW, color);
    for(let i=0; i<3; i++) {
      const offset = i * 2;
      addTri([bodyW/2, bodyH-1, 0], [bodyW+5, bodyH-2-offset, 2], [bodyW+5, bodyH-2-offset, -2], color);
      addTri([-bodyW/2, bodyH-1, 0], [-bodyW-5, bodyH-2-offset, -2], [-bodyW-5, bodyH-2-offset, 2], color);
    }
    addBox(0, bodyH/2, 1.1, 1, 1, 0.5, '255 0 0'); 
  }
  else if (type === 'phoenix') { 
    addBox(0, 0, 0, 1, 6, 1, color); 
    for(let i=0; i<4; i++) {
      const h = 2 + i;
      addTri([0, h, 0], [12, h+4, 2], [12, h, -2], color); 
      addTri([0, h, 0], [-12, h, -2], [-12, h+4, 2], color); 
    }
  }
  else if (type === 'fox') { 
    const width = 15, height = 4;
    addBox(0, 0, 0, width, height, 2, color); 
    addBox(0, 0, 0, 4, 4, 4, '255 0 0'); 
    for(let i=0; i<6; i++) {
      const x = -width/2 + (i * width/5);
      addTri([x, -height/2, 0], [x+1, -height/2-10, 0], [x-1, -height/2-10, 0], color);
    }
  }
  else if (type === 'reaper') { 
    const bodyW = 1.5, bodyH = 8;
    addBox(0, 0, 0, bodyW, bodyH, bodyW, '20 20 20'); 
    
    for(let i=0; i<8; i++) {
      const a = (i/8) * Math.PI;
      const x = Math.cos(a) * 15, y = Math.sin(a) * 10;
      addTri([0, bodyH, 0], [x, bodyH + y, 1], [x, bodyH + y - 2, -1], color);
    }

    addTri([0, 0, 0], [2, -12, 4], [-2, -12, 4], color);
    addBox(0, bodyH * 0.7, 1, 1, 1, 1, '80 0 120'); 
  }

  return buffer.build();
};

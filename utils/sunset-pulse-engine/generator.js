
import { getMaterialForProperty } from './materials';

const colors = {
  logic: '59 130 246', // Blue for system logic
  data: '168 85 247',  // Purple for data clusters
  agent: '34 197 94',  // Green for Jamie
  obstacle: '249 115 22',
};

export const generatePropertyModel = (property, includeCourse = false) => {
  const { square_feet = 2000, amenities = [] } = property || {};
  const hasGarage = Array.isArray(amenities) && amenities.some(a => a?.toLowerCase().includes('garage'));
  
  const mat = getMaterialForProperty(property);

  const totalArea = square_feet > 0 ? square_feet : 2000;
  const width = Math.sqrt(totalArea * 1.2);
  const depth = totalArea / width;
  const height = 12; 
  
  let vertices = [];
  let obj = '# SunsetGG Material-Aware Asset V3\no Scene\n';

  const addBox = (x, y, z, w, h, d, colorTag) => {
    const s = vertices.length + 1;
    vertices.push([x - w/2, y, z - d/2], [x + w/2, y, z - d/2], [x + w/2, y, z + d/2], [x - w/2, y, z + d/2]);
    vertices.push([x - w/2, y + h, z - d/2], [x + w/2, y + h, z - d/2], [x + w/2, y + h, z + d/2], [x - w/2, y + h, z + d/2]);
    
    if (colorTag) obj += `usecolor ${colorTag}\n`;
    else obj += 'usecolor reset\n';
    
    // Faces (standard cube layout)
    obj += `f ${s} ${s+1} ${s+5} ${s+4}\nf ${s+1} ${s+2} ${s+6} ${s+5}\nf ${s+2} ${s+3} ${s+7} ${s+6}\nf ${s+3} ${s} ${s+4} ${s+7}\nf ${s+4} ${s+5} ${s+6} ${s+7}\nf ${s} ${s+3} ${s+2} ${s+1}\n`;
  };

  // Lawn & Driveway
  // Large flat base for the lawn
  addBox(0, -0.2, 0, width * 3, 0.2, depth * 3, mat.lawn);
  
  // Driveway with garage face
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
    // Garage Door Trim
    addBox(width/2 + 10, 0, -10.1, 15, height * 0.6, 0.2, mat.trim);
  }

  // Roof and Trim
  const rStart = vertices.length + 1;
  vertices.push([-width/2-2, height, -depth/2-2], [width/2+2, height, -depth/2-2], [width/2+2, height, depth/2+2], [-width/2-2, height, depth/2+2], [0, height+8, -depth/2-2], [0, height+8, depth/2+2]);
  obj += `usecolor ${mat.roof}\n`;
  obj += `f ${rStart} ${rStart+1} ${rStart+4}\nf ${rStart+2} ${rStart+3} ${rStart+5}\nf ${rStart} ${rStart+4} ${rStart+5} ${rStart+3}\nf ${rStart+1} ${rStart+2} ${rStart+5} ${rStart+4}\n`;

  //  Windows (vista)
  const winCount = Math.floor(width / 12);
  for(let i=0; i<winCount; i++) {
    const xPos = -width/2 + (i + 1) * (width/(winCount+1));
    const s1 = vertices.length + 1;
    // Front Windows
    vertices.push([xPos - 2, 4, -depth/2 - 0.3], [xPos + 2, 4, -depth/2 - 0.3], [xPos + 2, 9, -depth/2 - 0.3], [xPos - 2, 9, -depth/2 - 0.3]);
    obj += `usecolor ${mat.window}\nf ${s1} ${s1+1} ${s1+2} ${s1+3}\n`;
  }

  // Material aware foliage
  const trees = [[-width/2 - 20, -depth/2 - 15], [width/2 + 20, depth/2 + 15], [-width/2 - 30, 25]];
  trees.forEach(([tx, tz]) => {
    addBox(tx, 0, tz, 2, 6, 2, mat.trunk);
    const fs = vertices.length + 1;
    vertices.push([tx, 18, tz], [tx-6, 6, tz-6], [tx+6, 6, tz-6], [tx+6, 6, tz+6], [tx-6, 6, tz+6]);
    obj += `usecolor ${mat.foliage}\nf ${fs} ${fs+1} ${fs+2}\nf ${fs} ${fs+2} ${fs+3}\nf ${fs} ${fs+3} ${fs+4}\nf ${fs} ${fs+4} ${fs+1}\n`;
  });

  // Obstacle
  if (includeCourse) {
    obj += `usecolor ${colors.obstacle}\n`;
    const addRing = (x, y, z, r) => {
      const s = vertices.length + 1;
      for (let i = 0; i < 8; i++) {
        const a = (i/8)*Math.PI*2;
        vertices.push([x + Math.cos(a)*r, y + Math.sin(a)*r, z], [x + Math.cos(a)*r*0.85, y + Math.sin(a)*r*0.85, z]);
      }
      for (let i = 0; i < 8; i++) {
        const b = s + (i*2); const nb = s + (((i+1)%8)*2);
        obj += `f ${b} ${b+1} ${nb+1} ${nb}\n`;
      }
    };
    addRing(-60, 30, -50, 18); addRing(60, 40, 60, 22); addRing(0, 60, 100, 15);
  }

  let vertexStream = '';
  vertices.forEach(v => vertexStream += `v ${v[0].toFixed(3)} ${v[1].toFixed(3)} ${v[2].toFixed(3)}\n`);
  return obj.replace('o Scene\n', 'o Scene\n' + vertexStream);
};

export const generateSystemArchitectureModel = () => {
  let vertices = [];
  let obj = '# SunsetGG System Viz\no SystemArchitecture\n';

  const addNode = (x, y, z, w, h, d, colorTag) => {
    const s = vertices.length + 1;
    vertices.push([x - w/2, y, z - d/2], [x + w/2, y, z - d/2], [x + w/2, y, z + d/2], [x - w/2, y, z + d/2]);
    vertices.push([x - w/2, y + h, z - d/2], [x + w/2, y + h, z - d/2], [x + w/2, y + h, z + d/2], [x - w/2, y + h, z + d/2]);
    obj += `usecolor ${colorTag}\n`;
    obj += `f ${s} ${s+1} ${s+5} ${s+4}\nf ${s+1} ${s+2} ${s+6} ${s+5}\nf ${s+2} ${s+3} ${s+7} ${s+6}\nf ${s+3} ${s} ${s+4} ${s+7}\nf ${s+4} ${s+5} ${s+6} ${s+7}\nf ${s} ${s+3} ${s+2} ${s+1}\n`;
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

  let vertexStream = '';
  vertices.forEach(v => vertexStream += `v ${v[0].toFixed(3)} ${v[1].toFixed(3)} ${v[2].toFixed(3)}\n`);
  return obj.replace('o SystemArchitecture\n', 'o SystemArchitecture\n' + vertexStream);
};

/**
 * Generates low-poly models for ghosts and recon.
 * Types: 'hound', 'titan', 'ghost', 'spider', 'wolf', 'phoenix', 'fox'
 */
export const generateAbidanModel = (type = 'hound', color = '255 255 255') => {
  let vertices = [];
  let obj = `# SunsetGG Entity [TYPE: ${type.toUpperCase()}]\no Pulse\n`;

  const addTri = (v1, v2, v3, colorTag) => {
    const s = vertices.length + 1;
    vertices.push(v1, v2, v3);
    if (colorTag) obj += `usecolor ${colorTag}\n`;
    obj += `f ${s} ${s+1} ${s+2}\n`;
  };

  const addBox = (x, y, z, w, h, d, colorTag) => {
    const s = vertices.length + 1;
    vertices.push([x - w/2, y - h/2, z - d/2], [x + w/2, y - h/2, z - d/2], [x + w/2, y + h/2, z - d/2], [x - w/2, y + h/2, z - d/2]);
    vertices.push([x - w/2, y - h/2, z + d/2], [x + w/2, y - h/2, z + d/2], [x + w/2, y + h/2, z + d/2], [x - w/2, y + h/2, z + d/2]);
    if (colorTag) obj += `usecolor ${colorTag}\n`;
    obj += `f ${s} ${s+1} ${s+5} ${s+4}\nf ${s+1} ${s+2} ${s+6} ${s+5}\nf ${s+2} ${s+3} ${s+7} ${s+6}\nf ${s+3} ${s} ${s+4} ${s+7}\nf ${s+4} ${s+5} ${s+6} ${s+7}\nf ${s} ${s+3} ${s+2} ${s+1}\n`;
  };

  if (type === 'hound') { 
    // MAKIEL-RAMIEL : Octahedron
    const r = 5;
    const pts = [[r,0,0], [-r,0,0], [0,r,0], [0,-r,0], [0,0,r], [0,0,-r]];
    const faces = [[2,4,0], [2,0,5], [2,5,1], [2,1,4], [3,0,4], [3,5,0], [3,1,5], [3,4,1]];
    faces.forEach(f => addTri(pts[f[0]], pts[f[1]], pts[f[2]], color));
  } 
  else if (type === 'gigante') { 
    // GADRAEL-ZERUEL: Masked Monolith
    const bodyW = 3, bodyH = 8;
    addBox(0, 0, 0, bodyW, bodyH, 2, color); // Core Body
    // Flat Toilet Paper Arms
    addBox(bodyW, bodyH/4, 0, 1, bodyH*1.5, 10, '200 200 200'); // Arm R
    addBox(-bodyW, bodyH/4, 0, 1, bodyH*1.5, 10, '200 200 200'); // Arm L
  }
  else if (type === 'ghost') { 
    // DURANDIEL-LELIEL: Shadow Sphere Icosahedron
    const r = 4;
    // Low-poly sphere 
    const pts = [[0,r,0], [r,0,0], [0,0,r], [-r,0,0], [0,0,-r], [0,-r,0]];
    const faces = [[0,1,2], [0,2,3], [0,3,4], [0,4,1], [5,2,1], [5,3,2], [5,4,3], [5,1,4]];
    faces.forEach(f => addTri(pts[f[0]], pts[f[1]], pts[f[2]], '10 10 10')); // Pitch Black Shadow
    // Add some white floating rings
    addBox(0, 0, 0, r*2.2, 0.1, r*2.2, color);
  }
  else if (type === 'spider') { 
    // TELARIEL-MATARAEL The Spindly Observer Eye
    addBox(0, 4, 0, 2, 1, 2, color); // Central Cyclops Body
    for(let i=0; i<4; i++) {
      const a = (i/4)*Math.PI*2 + Math.PI/4;
      const legX = Math.cos(a)*8, legZ = Math.sin(a)*8;
      addTri([0, 4, 0], [legX, 0, legZ], [legX*0.8, 0, legZ*0.8], color); // Long sharp legs
    }
  }
  else if (type === 'wolf') { 
    // RAZAEL-SACHIEL: The Two Faced Herald
    const bodyW = 2, bodyH = 7;
    addBox(0, 0, 0, bodyW, bodyH, bodyW, color);
    // Ribbon Arms
    for(let i=0; i<3; i++) {
      const offset = i * 2;
      addTri([bodyW/2, bodyH-1, 0], [bodyW+5, bodyH-2-offset, 2], [bodyW+5, bodyH-2-offset, -2], color);
      addTri([-bodyW/2, bodyH-1, 0], [-bodyW-5, bodyH-2-offset, -2], [-bodyW-5, bodyH-2-offset, 2], color);
    }
    addBox(0, bodyH/2, 1.1, 1, 1, 0.5, '255 0 0'); // Red Core
  }
  else if (type === 'phoenix') { 
    // SURIEL-ARAEL: The Wings of Light
    addBox(0, 0, 0, 1, 6, 1, color); // Slender Body Tsubasa
    // stylized wings
    for(let i=0; i<4; i++) {
      const h = 2 + i;
      addTri([0, h, 0], [12, h+4, 2], [12, h, -2], color); // Right Wing Layers
      addTri([0, h, 0], [-12, h, -2], [-12, h+4, 2], color); // Left Wing Layers
    }
  }
  else if (type === 'fox') { 
    // ZAKARIEL-SAHAQUIEL: The Falling Orbit
    const width = 15, height = 4;
    addBox(0, 0, 0, width, height, 2, color); // wide body
    addBox(0, 0, 0, 4, 4, 4, '255 0 0'); // Massive central eye and core
    // Trailing fins and tendrils
    for(let i=0; i<6; i++) {
      const x = -width/2 + (i * width/5);
      addTri([x, -height/2, 0], [x+1, -height/2-10, 0], [x-1, -height/2-10, 0], color);
    }
  }
  else if (type === 'reaper') { 
    // OZRIEL-reaper: The End of EVA
    const bodyW = 1.5, bodyH = 8;
    addBox(0, 0, 0, bodyW, bodyH, bodyW, '20 20 20'); // Dark body
    
    // Scythe Crescent Wing
    for(let i=0; i<8; i++) {
      const a = (i/8) * Math.PI;
      const x = Math.cos(a) * 15, y = Math.sin(a) * 10;
      addTri([0, bodyH, 0], [x, bodyH + y, 1], [x, bodyH + y - 2, -1], color);
    }

    // shharp geometric tail and scythe
    addTri([0, 0, 0], [2, -12, 4], [-2, -12, 4], color);
    addBox(0, bodyH * 0.7, 1, 1, 1, 1, '80 0 120'); // Purple Destruction Core
  }

  let vertexStream = '';
  vertices.forEach(v => vertexStream += `v ${v[0].toFixed(3)} ${v[1].toFixed(3)} ${v[2].toFixed(3)}\n`);
  return obj.replace('o Abidan\n', 'o Abidan\n' + vertexStream);
};

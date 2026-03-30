/**
 * SunsetGG High-Fidelity Procedural Generator
 * Version 2.2.0 // Architecture Detail Focus & System Viz
 */

const colors = {
  structure: null, // Dynamic
  window: '186 230 253',
  foliage: '34 197 94',
  trunk: '120 113 108',
  obstacle: '249 115 22',
  logic: '59 130 246', // Blue for system logic
  data: '168 85 247',  // Purple for data clusters
  agent: '34 197 94',  // Green for Jamie
};

export const generatePropertyModel = (property, includeCourse = false) => {
  const { square_feet = 2000, beds = 3, amenities = [] } = property || {};
  const hasGarage = Array.isArray(amenities) && amenities.some(a => a?.toLowerCase().includes('garage'));
  
  const totalArea = square_feet > 0 ? square_feet : 2000;
  const width = Math.sqrt(totalArea * 1.2);
  const depth = totalArea / width;
  const height = 12; 
  
  let vertices = [];
  let obj = '# SunsetGG High-Fidelity Asset\no Scene\n';

  const addBox = (x, y, z, w, h, d, colorTag) => {
    const s = vertices.length + 1;
    vertices.push([x - w/2, y, z - d/2], [x + w/2, y, z - d/2], [x + w/2, y, z + d/2], [x - w/2, y, z + d/2]);
    vertices.push([x - w/2, y + h, z - d/2], [x + w/2, y + h, z - d/2], [x + w/2, y + h, z + d/2], [x - w/2, y + h, z + d/2]);
    
    if (colorTag) obj += `usecolor ${colorTag}\n`;
    else obj += 'usecolor reset\n';
    obj += `f ${s} ${s+1} ${s+5} ${s+4}\nf ${s+1} ${s+2} ${s+6} ${s+5}\nf ${s+2} ${s+3} ${s+7} ${s+6}\nf ${s+3} ${s} ${s+4} ${s+7}\nf ${s+4} ${s+5} ${s+6} ${s+7}\nf ${s} ${s+3} ${s+2} ${s+1}\n`;
  };

  // 1. STRUCTURE + HIGHLIGHTS (Corner Pillars)
  addBox(0, 0, 0, width, height, depth); 
  // Corner Detailing
  const pW = 1.2;
  addBox(-width/2, 0, -depth/2, pW, height, pW, '200 200 200');
  addBox(width/2, 0, -depth/2, pW, height, pW, '200 200 200');
  addBox(width/2, 0, depth/2, pW, height, pW, '200 200 200');
  addBox(-width/2, 0, depth/2, pW, height, pW, '200 200 200');

  if (hasGarage) addBox(width/2 + 10, 0, 0, 20, height * 0.8, 20);

  // 2. ROOF + TRIM
  const rStart = vertices.length + 1;
  vertices.push([-width/2-2, height, -depth/2-2], [width/2+2, height, -depth/2-2], [width/2+2, height, depth/2+2], [-width/2-2, height, depth/2+2], [0, height+8, -depth/2-2], [0, height+8, depth/2+2]);
  obj += 'usecolor reset\n';
  obj += `f ${rStart} ${rStart+1} ${rStart+4}\nf ${rStart+2} ${rStart+3} ${rStart+5}\nf ${rStart} ${rStart+4} ${rStart+5} ${rStart+3}\nf ${rStart+1} ${rStart+2} ${rStart+5} ${rStart+4}\n`;

  // 3. WINDOWS (More prominent recessed frames)
  const winCount = Math.floor(width / 10);
  for(let i=0; i<winCount; i++) {
    const xPos = -width/2 + (i + 1) * (width/(winCount+1));
    const s1 = vertices.length + 1;
    vertices.push([xPos - 2, 4, -depth/2 - 0.3], [xPos + 2, 4, -depth/2 - 0.3], [xPos + 2, 9, -depth/2 - 0.3], [xPos - 2, 9, -depth/2 - 0.3]);
    obj += `usecolor ${colors.window}\nf ${s1} ${s1+1} ${s1+2} ${s1+3}\n`;
  }

  // 4. FOLIAGE
  const trees = [[-width/2 - 15, -depth/2 - 10], [width/2 + 15, depth/2 + 10], [-width/2 - 25, 20]];
  trees.forEach(([tx, tz]) => {
    addBox(tx, 0, tz, 1.5, 5, 1.5, colors.trunk);
    const fs = vertices.length + 1;
    vertices.push([tx, 15, tz], [tx-5, 5, tz-5], [tx+5, 5, tz-5], [tx+5, 5, tz+5], [tx-5, 5, tz+5]);
    obj += `usecolor ${colors.foliage}\nf ${fs} ${fs+1} ${fs+2}\nf ${fs} ${fs+2} ${fs+3}\nf ${fs} ${fs+3} ${fs+4}\nf ${fs} ${fs+4} ${fs+1}\n`;
  });

  // 5. OBSTACLE COURSE
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
    addRing(-50, 25, -40, 15); addRing(50, 35, 50, 20); addRing(0, 50, 80, 12);
  }

  let vertexStream = '';
  vertices.forEach(v => vertexStream += `v ${v[0].toFixed(3)} ${v[1].toFixed(3)} ${v[2].toFixed(3)}\n`);
  return obj.replace('o Scene\n', 'o Scene\n' + vertexStream);
};

export const generateSystemArchitectureModel = () => {
  let vertices = [];
  let obj = '# SunsetGG System Viz\no SystemArchitecture\n';

  const addNode = (x, y, z, w, h, d, colorTag, label) => {
    const s = vertices.length + 1;
    vertices.push([x - w/2, y, z - d/2], [x + w/2, y, z - d/2], [x + w/2, y, z + d/2], [x - w/2, y, z + d/2]);
    vertices.push([x - w/2, y + h, z - d/2], [x + w/2, y + h, z - d/2], [x + w/2, y + h, z + d/2], [x - w/2, y + h, z + d/2]);
    obj += `usecolor ${colorTag}\n`;
    obj += `f ${s} ${s+1} ${s+5} ${s+4}\nf ${s+1} ${s+2} ${s+6} ${s+5}\nf ${s+2} ${s+3} ${s+7} ${s+6}\nf ${s+3} ${s} ${s+4} ${s+7}\nf ${s+4} ${s+5} ${s+6} ${s+7}\nf ${s} ${s+3} ${s+2} ${s+1}\n`;
  };

  // Central Core: Next.js Framework
  addNode(0, 0, 0, 20, 5, 20, colors.logic, 'Framework');
  
  // Jamie AI Satellite
  addNode(0, 30, 0, 10, 10, 10, colors.agent, 'Jamie');
  
  // Data Clusters
  addNode(-30, 0, 30, 12, 12, 12, colors.data, 'Properties');
  addNode(30, 0, -30, 12, 12, 12, colors.data, 'Leads');
  
  // 3D Engine Grid
  for(let i=0; i<4; i++) {
    const a = (i/4)*Math.PI*2;
    addNode(Math.cos(a)*50, 15, Math.sin(a)*50, 8, 8, 8, '255 255 255', 'Engine');
  }

  // Connection Lines (Boxes)
  addNode(0, 10, 0, 1, 20, 1, '100 100 100', 'CoreSync');

  let vertexStream = '';
  vertices.forEach(v => vertexStream += `v ${v[0].toFixed(3)} ${v[1].toFixed(3)} ${v[2].toFixed(3)}\n`);
  return obj.replace('o SystemArchitecture\n', 'o SystemArchitecture\n' + vertexStream);
};

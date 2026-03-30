/**
 * SunsetGG Procedural House Generator
 * Generates a .obj string based on property parameters
 */
export const generatePropertyModel = (property) => {
  // 1. Safety Destructuring with Fallbacks
  const { square_feet = 2000, beds = 3, amenities = [] } = property || {};
  const hasGarage = Array.isArray(amenities) && amenities.some(a => a?.toLowerCase().includes('garage'));
  
  // 2. Base Dimensions
  const totalArea = square_feet > 0 ? square_feet : 2000;
  const width = Math.sqrt(totalArea * 1.2);
  const depth = totalArea / width;
  const height = 10; 
  
  let vertices = [];
  let faces = [];

  const addBox = (x, y, z, w, h, d) => {
    const startIdx = vertices.length + 1;
    vertices.push([x - w/2, y, z - d/2]);
    vertices.push([x + w/2, y, z - d/2]);
    vertices.push([x + w/2, y, z + d/2]);
    vertices.push([x - w/2, y, z + d/2]);
    vertices.push([x - w/2, y + h, z - d/2]);
    vertices.push([x + w/2, y + h, z - d/2]);
    vertices.push([x + w/2, y + h, z + d/2]);
    vertices.push([x - w/2, y + h, z + d/2]);

    faces.push([startIdx, startIdx+1, startIdx+5, startIdx+4]);
    faces.push([startIdx+1, startIdx+2, startIdx+6, startIdx+5]);
    faces.push([startIdx+2, startIdx+3, startIdx+7, startIdx+6]);
    faces.push([startIdx+3, startIdx, startIdx+4, startIdx+7]);
    faces.push([startIdx+4, startIdx+5, startIdx+6, startIdx+7]);
    faces.push([startIdx, startIdx+3, startIdx+2, startIdx+1]);
  };

  addBox(0, 0, 0, width, height, depth);

  if (hasGarage) {
    const gW = 20;
    const gD = 20;
    const gH = height * 0.8;
    addBox(width/2 + gW/2, 0, 0, gW, gH, gD);
  }

  const roofHeight = 6;
  const rStart = vertices.length + 1;
  vertices.push([-width/2 - 2, height, -depth/2 - 2]); 
  vertices.push([width/2 + 2, height, -depth/2 - 2]);  
  vertices.push([width/2 + 2, height, depth/2 + 2]);   
  vertices.push([-width/2 - 2, height, depth/2 + 2]);  
  vertices.push([0, height + roofHeight, -depth/2 - 2]); 
  vertices.push([0, height + roofHeight, depth/2 + 2]);  

  faces.push([rStart, rStart+1, rStart+4]); 
  faces.push([rStart+2, rStart+3, rStart+5]); 
  faces.push([rStart, rStart+4, rStart+5, rStart+3]); 
  faces.push([rStart+1, rStart+2, rStart+5, rStart+4]); 

  let obj = "# SunsetGG Generated Property Model\no House\n";
  vertices.forEach(v => obj += `v ${v[0].toFixed(3)} ${v[1].toFixed(3)} ${v[2].toFixed(3)}\n`);
  faces.forEach(f => {
    if (f.length === 3) obj += `f ${f[0]} ${f[1]} ${f[2]}\n`;
    else obj += `f ${f[0]} ${f[1]} ${f[2]} ${f[3]}\n`;
  });

  return obj;
};

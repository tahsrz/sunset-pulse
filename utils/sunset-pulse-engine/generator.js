/**
 * SunsetGG Procedural House Generator
 * Generates a .obj string based on property parameters
 */
export const generatePropertyModel = (property) => {
  const { square_feet, beds, amenities } = property;
  const hasGarage = amenities.some(a => a.toLowerCase().includes('garage'));
  
  // 1. Calculate base dimensions
  // Area = width * depth. We'll use a 1.2 aspect ratio for a standard house shape.
  const totalArea = square_feet || 2000;
  const width = Math.sqrt(totalArea * 1.2);
  const depth = totalArea / width;
  const height = 10; // Standard 10ft ceiling
  
  let vertices = [];
  let faces = [];

  // Helper to add a box
  const addBox = (x, y, z, w, h, d) => {
    const startIdx = vertices.length + 1;
    // Bottom 4
    vertices.push([x - w/2, y, z - d/2]);
    vertices.push([x + w/2, y, z - d/2]);
    vertices.push([x + w/2, y, z + d/2]);
    vertices.push([x - w/2, y, z + d/2]);
    // Top 4
    vertices.push([x - w/2, y + h, z - d/2]);
    vertices.push([x + w/2, y + h, z - d/2]);
    vertices.push([x + w/2, y + h, z + d/2]);
    vertices.push([x - w/2, y + h, z + d/2]);

    // Faces (standard cube)
    faces.push([startIdx, startIdx+1, startIdx+5, startIdx+4]); // Front
    faces.push([startIdx+1, startIdx+2, startIdx+6, startIdx+5]); // Right
    faces.push([startIdx+2, startIdx+3, startIdx+7, startIdx+6]); // Back
    faces.push([startIdx+3, startIdx, startIdx+4, startIdx+7]); // Left
    faces.push([startIdx+4, startIdx+5, startIdx+6, startIdx+7]); // Top
    faces.push([startIdx, startIdx+3, startIdx+2, startIdx+1]); // Bottom
  };

  // Add Main House Body
  addBox(0, 0, 0, width, height, depth);

  // Add Garage Wing if applicable
  if (hasGarage) {
    const gW = 20;
    const gD = 20;
    const gH = height * 0.8;
    addBox(width/2 + gW/2, 0, 0, gW, gH, gD);
  }

  // Add a Gable Roof
  const roofHeight = 6;
  const rStart = vertices.length + 1;
  vertices.push([-width/2 - 2, height, -depth/2 - 2]); // 0: Bottom-Left-Front
  vertices.push([width/2 + 2, height, -depth/2 - 2]);  // 1: Bottom-Right-Front
  vertices.push([width/2 + 2, height, depth/2 + 2]);   // 2: Bottom-Right-Back
  vertices.push([-width/2 - 2, height, depth/2 + 2]);  // 3: Bottom-Left-Back
  vertices.push([0, height + roofHeight, -depth/2 - 2]); // 4: Ridge-Front
  vertices.push([0, height + roofHeight, depth/2 + 2]);  // 5: Ridge-Back

  faces.push([rStart, rStart+1, rStart+4]); // Front Gable
  faces.push([rStart+2, rStart+3, rStart+5]); // Back Gable
  faces.push([rStart, rStart+4, rStart+5, rStart+3]); // Left Slope
  faces.push([rStart+1, rStart+2, rStart+5, rStart+4]); // Right Slope

  // Build the OBJ string
  let obj = "# SunsetGG Generated Property Model\no House\n";
  vertices.forEach(v => obj += `v ${v[0].toFixed(3)} ${v[1].toFixed(3)} ${v[2].toFixed(3)}\n`);
  faces.forEach(f => {
    if (f.length === 3) obj += `f ${f[0]} ${f[1]} ${f[2]}\n`;
    else obj += `f ${f[0]} ${f[1]} ${f[2]} ${f[3]}\n`;
  });

  return obj;
};

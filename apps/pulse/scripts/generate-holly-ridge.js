const fs = require('fs');
const path = require('path');

const generateHouse = (params) => {
  const { squareFeet, beds, hasGarage } = params;
  
  // Estimate dimensions based on sqft (Area = W * D)
  // 2203 sqft -> ~50ft x 44ft
  const width = Math.sqrt(squareFeet) * 1.2;
  const depth = squareFeet / width;
  const height = 10; // 10ft walls
  
  let objContent = '# SunsetGG Procedural House Generator\no HollyRidgeHouse\n';
  
  // Vertices (Box for the main house)
  const v = [
    [-width/2, 0, -depth/2], [width/2, 0, -depth/2], [width/2, 0, depth/2], [-width/2, 0, depth/2], // Bottom
    [-width/2, height, -depth/2], [width/2, height, -depth/2], [width/2, height, depth/2], [-width/2, height, depth/2], // Top
  ];
  
  // Add Garage if applicable (simple extension)
  if (hasGarage) {
    const gWidth = 20;
    const gDepth = 20;
    v.push(
      [width/2, 0, -gDepth/2], [width/2 + gWidth, 0, -gDepth/2], 
      [width/2 + gWidth, 0, gDepth/2], [width/2, 0, gDepth/2],
      [width/2, height*0.8, -gDepth/2], [width/2 + gWidth, height*0.8, -gDepth/2],
      [width/2 + gWidth, height*0.8, gDepth/2], [width/2, height*0.8, gDepth/2]
    );
  }
  
  // Add Roof vertices (Gable roof)
  const roofHeight = 6;
  v.push([-width/2, height + roofHeight, 0], [width/2, height + roofHeight, 0]);

  v.forEach(vert => {
    objContent += `v ${vert[0].toFixed(4)} ${vert[1].toFixed(4)} ${vert[2].toFixed(4)}\n`;
  });

  // Faces (Basic cube faces)
  objContent += 'f 1 2 6 5\nf 2 3 7 6\nf 3 4 8 7\nf 4 1 5 8\nf 1 4 3 2\n'; // Bottom + Walls
  
  // Roof faces
  const vCount = v.length;
  const rLeft = vCount - 1;
  const rRight = vCount;
  objContent += `f 5 6 ${rRight} ${rLeft}\n`; // Front roof slope
  objContent += `f 8 7 ${rRight} ${rLeft}\n`; // Back roof slope
  objContent += `f 5 8 ${rLeft}\n`; // Side gable
  objContent += `f 6 7 ${rRight}\n`; // Side gable

  return objContent;
};

const params = {
  squareFeet: 2203,
  beds: 3,
  hasGarage: true
};

const modelDir = path.join(process.cwd(), 'public', 'models');
if (!fs.existsSync(modelDir)) fs.mkdirSync(modelDir, { recursive: true });

const filePath = path.join(modelDir, 'holly-ridge.obj');
fs.writeFileSync(filePath, generateHouse(params));
console.log(`Generated: ${filePath}`);

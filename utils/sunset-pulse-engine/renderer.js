import { Vector, Matrix } from './math';

export class Triangle3D {
  constructor(v1, v2, v3, color = { r: 255, g: 255, b: 255 }) {
    this.vertices = [v1, v2, v3];
    this.color = color;
    this.shading = 1.0;
  }

  get(index) { return this.vertices[index]; }
  set(index, value) { this.vertices[index] = value; }

  getSurfaceNormal() {
    const line1 = this.vertices[1].subtract(this.vertices[0]);
    const line2 = this.vertices[2].subtract(this.vertices[0]);
    return line1.crossProduct(line2).normalized();
  }

  setShading(value) {
    this.shading = value;
  }

  getColorWithShading() {
    const r = Math.floor(this.color.r * this.shading);
    const g = Math.floor(this.color.g * this.shading);
    const b = Math.floor(this.color.b * this.shading);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

export class Mesh3D {
  constructor(triangles = []) {
    this.triangles = triangles;
  }

  static parseObj(text, color) {
    const vertices = [];
    const triangles = [];
    const lines = text.split('\n');
    for (const line of lines) {
      const parts = line.trim().split(/\s+/).filter(Boolean);
      if (parts.length < 2) continue;

      if (parts[0] === 'v') {
        const x = parseFloat(parts[1]);
        const y = parseFloat(parts[2]);
        const z = parseFloat(parts[3]);
        if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
          vertices.push(new Vector(x, y, z));
        }
      } else if (parts[0] === 'f') {
        const vIndices = parts.slice(1)
          .map(p => parseInt(p.split('/')[0]) - 1)
          .filter(idx => !isNaN(idx) && vertices[idx]);

        if (vIndices.length === 3) {
          triangles.push(new Triangle3D(vertices[vIndices[0]], vertices[vIndices[1]], vertices[vIndices[2]], color));
        } else if (vIndices.length === 4) {
          triangles.push(new Triangle3D(vertices[vIndices[0]], vertices[vIndices[1]], vertices[vIndices[2]], color));
          triangles.push(new Triangle3D(vertices[vIndices[0]], vertices[vIndices[2]], vertices[vIndices[3]], color));
        }
      }
    }
    return new Mesh3D(triangles);
  }

  static async loadFromObj(url, color) {
    const response = await fetch(url);
    const text = await response.text();
    return Mesh3D.parseObj(text, color);
  }

  static loadFromRaw(text, color) {
    return Mesh3D.parseObj(text, color);
  }
}

export class Plane {
  constructor(point, normal) {
    this.point = point;
    this.normal = normal.normalized();
  }

  distanceFromPoint(p) {
    return this.normal.dotProduct(p.subtract(this.point));
  }

  lineIntersectPlanePoint(start, end) {
    const ad = start.dotProduct(this.normal);
    const bd = end.dotProduct(this.normal);
    const planeD = this.point.dotProduct(this.normal);
    const t = (planeD - ad) / (bd - ad);
    return start.add(end.subtract(start).multiplyByScalar(t));
  }
}

export class Renderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.zNear = 0.1;
    this.zFar = 1000.0;
    this.fov = Math.PI / 2;
    this.meshes = [];
    this.cameraPos = new Vector(0, 0, 0);
    this.lightDir = new Vector(1, 1, -1).normalized();
    this.showWireframe = options.wireframe || false;
    this.wireframeColor = options.wireframeColor || 'rgba(255, 255, 255, 0.2)';
    
    this.projMat = this.createProjectionMatrix();
  }

  createProjectionMatrix() {
    const mat = new Matrix(3, 3);
    const aspectRatio = this.height / this.width;
    const fovRatio = 1.0 / Math.tan(this.fov / 2.0);
    const zNormalization = this.zFar / (this.zFar - this.zNear);

    mat.set(0, 0, aspectRatio * fovRatio);
    mat.set(1, 1, fovRatio);
    mat.set(2, 2, zNormalization);
    return mat;
  }

  render(cameraPos, cameraRotMat, meshPos = new Vector(0, 0, 0)) {
    this.ctx.clearRect(0, 0, this.width, this.height);

    const trianglesToRender = [];
    const viewMat = cameraRotMat.getTransposed();
    const viewVec = cameraPos.multiplyMatrix(viewMat).multiplyByScalar(-1.0);
    const nearPlane = new Plane(new Vector(0, 0, this.zNear), new Vector(0, 0, -1));

    for (const mesh of this.meshes) {
      for (const tri of mesh.triangles) {
        // Use the provided meshPos for translation
        const transformedTri = this.transformTriangle(tri, Matrix.identityMatrix(3), meshPos);

        const norm = transformedTri.getSurfaceNormal();
        const camToTri = transformedTri.get(0).subtract(cameraPos);

        // Simple back-face culling
        if (norm.dotProduct(camToTri) < 0) {
          let shading = norm.dotProduct(this.lightDir);
          shading = Math.max(0.2, Math.min(1, shading));
          transformedTri.setShading(shading);

          // Transform to view space
          const viewTri = this.transformTriangle(transformedTri, viewMat, viewVec);
          
          // Clip against near plane
          const clipped = this.clipTriangleAgainstPlane(viewTri, nearPlane);
          for (const cTri of clipped) {
            const projTri = this.projectTriangle(cTri);
            trianglesToRender.push(projTri);
          }
        }
      }
    }

    // Sort by depth (painter's algorithm)
    trianglesToRender.sort((a, b) => {
      const az = (a.get(0).z + a.get(1).z + a.get(2).z) / 3;
      const bz = (b.get(0).z + b.get(1).z + b.get(2).z) / 3;
      return bz - az;
    });

    for (const tri of trianglesToRender) {
      this.drawTriangle(tri);
    }
  }

  transformTriangle(tri, matrix, translation) {
    const v1 = tri.get(0).multiplyMatrix(matrix).add(translation);
    const v2 = tri.get(1).multiplyMatrix(matrix).add(translation);
    const v3 = tri.get(2).multiplyMatrix(matrix).add(translation);
    return new Triangle3D(v1, v2, v3, tri.color);
  }

  projectTriangle(tri) {
    const v = [tri.get(0), tri.get(1), tri.get(2)].map(curr => {
      const z = Math.max(this.zNear, curr.z); // Prevent divide by zero
      const newZ = (z - this.zNear) * this.projMat.get(2, 2);
      let projected = curr.multiplyMatrix(this.projMat);
      projected.set(2, newZ);
      projected = projected.divideByScalar(z);

      const x = (projected.x + 1.0) * this.width / 2.0;
      const y = (-projected.y + 1.0) * this.height / 2.0;
      return new Vector(x, y, newZ);
    });
    const result = new Triangle3D(v[0], v[1], v[2], tri.color);
    result.setShading(tri.shading);
    return result;
  }

  drawTriangle(tri) {
    this.ctx.beginPath();
    this.ctx.moveTo(tri.get(0).x, tri.get(0).y);
    this.ctx.lineTo(tri.get(1).x, tri.get(1).y);
    this.ctx.lineTo(tri.get(2).x, tri.get(2).y);
    this.ctx.closePath();
    
    this.ctx.fillStyle = tri.getColorWithShading();
    this.ctx.fill();

    if (this.showWireframe) {
      this.ctx.strokeStyle = this.wireframeColor;
      this.ctx.lineWidth = 0.5;
      this.ctx.stroke();
    }
  }

  clipTriangleAgainstPlane(tri, plane) {
    const inside = [];
    const outside = [];
    for (let i = 0; i < 3; i++) {
      if (plane.distanceFromPoint(tri.get(i)) <= 0) inside.push(tri.get(i));
      else outside.push(tri.get(i));
    }

    if (inside.length === 1) {
      const v1 = inside[0];
      const v2 = plane.lineIntersectPlanePoint(v1, outside[0]);
      const v3 = plane.lineIntersectPlanePoint(v1, outside[1]);
      return [new Triangle3D(v1, v2, v3, tri.color)];
    } else if (inside.length === 2) {
      const v1 = inside[0];
      const v2 = inside[1];
      const v3 = plane.lineIntersectPlanePoint(v1, outside[0]);
      const v4 = plane.lineIntersectPlanePoint(v2, outside[0]);
      return [
        new Triangle3D(v1, v2, v3, tri.color),
        new Triangle3D(v3, v2, v4, tri.color)
      ];
    } else if (inside.length === 3) {
      return [tri];
    }
    return [];
  }
}

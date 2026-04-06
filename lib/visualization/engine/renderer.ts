import { Vector, Matrix } from './math';

export interface Color {
  r: number;
  g: number;
  b: number;
}

export class Triangle3D {
  vertices: Vector[];
  color: Color;
  shading: number;

  constructor(v1: Vector, v2: Vector, v3: Vector, color: Color = { r: 255, g: 255, b: 255 }) {
    this.vertices = [v1, v2, v3];
    this.color = color;
    this.shading = 1.0;
  }

  get(index: number): Vector { return this.vertices[index]; }
  set(index: number, value: Vector): void { this.vertices[index] = value; }

  getSurfaceNormal(): Vector {
    const line1 = this.vertices[1].subtract(this.vertices[0]);
    const line2 = this.vertices[2].subtract(this.vertices[0]);
    return line1.crossProduct(line2).normalized();
  }

  setShading(value: number): void {
    this.shading = value;
  }

  getColorWithShading(): string {
    const r = Math.floor(this.color.r * this.shading);
    const g = Math.floor(this.color.g * this.shading);
    const b = Math.floor(this.color.b * this.shading);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

export class Mesh3D {
  triangles: Triangle3D[];

  constructor(triangles: Triangle3D[] = []) {
    this.triangles = triangles;
  }

  static parseObj(text: string, defaultColor: Color = { r: 255, g: 255, b: 255 }): Mesh3D {
    const vertices: Vector[] = [];
    const triangles: Triangle3D[] = [];
    let currentColor: Color = { ...defaultColor };
    
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
      } 
      // Custom Directive: usecolor R G B
      else if (parts[0] === 'usecolor') {
        currentColor = {
          r: parseInt(parts[1]) || defaultColor.r,
          g: parseInt(parts[2]) || defaultColor.g,
          b: parseInt(parts[3]) || defaultColor.b
        };
      }
      else if (parts[0] === 'f') {
        const vIndices = parts.slice(1)
          .map(p => parseInt(p.split('/')[0]) - 1)
          .filter(idx => !isNaN(idx) && vertices[idx]);

        if (vIndices.length === 3) {
          triangles.push(new Triangle3D(vertices[vIndices[0]], vertices[vIndices[1]], vertices[vIndices[2]], currentColor));
        } else if (vIndices.length === 4) {
          // Quad to Triangle conversion
          triangles.push(new Triangle3D(vertices[vIndices[0]], vertices[vIndices[1]], vertices[vIndices[2]], currentColor));
          triangles.push(new Triangle3D(vertices[vIndices[0]], vertices[vIndices[2]], vertices[vIndices[3]], currentColor));
        }
      }
    }
    return new Mesh3D(triangles);
  }

  static async loadFromObj(url: string, color: Color): Promise<Mesh3D> {
    const response = await fetch(url);
    const text = await response.text();
    return Mesh3D.parseObj(text, color);
  }

  static loadFromRaw(text: string, color: Color): Mesh3D {
    return Mesh3D.parseObj(text, color);
  }

  static createCube(size: number, color: Color = { r: 255, g: 255, b: 255 }): Mesh3D {
    const s = size / 2;
    const vertices = [
      new Vector(-s, -s, -s), new Vector(s, -s, -s), new Vector(s, s, -s), new Vector(-s, s, -s),
      new Vector(-s, -s, s), new Vector(s, -s, s), new Vector(s, s, s), new Vector(-s, s, s)
    ];
    const triangles = [
      new Triangle3D(vertices[0], vertices[1], vertices[2], color),
      new Triangle3D(vertices[0], vertices[2], vertices[3], color),
      new Triangle3D(vertices[1], vertices[5], vertices[6], color),
      new Triangle3D(vertices[1], vertices[6], vertices[2], color),
      new Triangle3D(vertices[5], vertices[4], vertices[7], color),
      new Triangle3D(vertices[5], vertices[7], vertices[6], color),
      new Triangle3D(vertices[4], vertices[0], vertices[3], color),
      new Triangle3D(vertices[4], vertices[3], vertices[7], color),
      new Triangle3D(vertices[3], vertices[2], vertices[6], color),
      new Triangle3D(vertices[3], vertices[6], vertices[7], color),
      new Triangle3D(vertices[4], vertices[5], vertices[1], color),
      new Triangle3D(vertices[4], vertices[1], vertices[0], color)
    ];
    return new Mesh3D(triangles);
  }
}

export class Plane {
  point: Vector;
  normal: Vector;

  constructor(point: Vector, normal: Vector) {
    this.point = point;
    this.normal = normal.normalized();
  }

  distanceFromPoint(p: Vector): number {
    return this.normal.dotProduct(p.subtract(this.point));
  }

  lineIntersectPlanePoint(start: Vector, end: Vector): Vector {
    const ad = start.dotProduct(this.normal);
    const bd = end.dotProduct(this.normal);
    const planeD = this.point.dotProduct(this.normal);
    const t = (planeD - ad) / (bd - ad);
    return start.add(end.subtract(start).multiplyByScalar(t));
  }
}

export interface RendererOptions {
  wireframe?: boolean;
  wireframeColor?: string;
}

export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  zNear: number;
  zFar: number;
  fov: number;
  meshes: Mesh3D[];
  cameraPos: Vector;
  lightDir: Vector;
  showWireframe: boolean;
  wireframeColor: string;
  projMat: Matrix;

  constructor(canvas: HTMLCanvasElement, options: RendererOptions = {}) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D context');
    this.ctx = context;
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

  createProjectionMatrix(): Matrix {
    const mat = new Matrix(3, 3);
    const aspectRatio = this.height / this.width;
    const fovRatio = 1.0 / Math.tan(this.fov / 2.0);
    const zNormalization = this.zFar / (this.zFar - this.zNear);

    mat.set(0, 0, aspectRatio * fovRatio);
    mat.set(1, 1, fovRatio);
    mat.set(2, 2, zNormalization);
    return mat;
  }

  render(cameraPos: Vector, cameraRotMat: Matrix, meshPos: Vector = new Vector(0, 0, 0)): void {
    this.ctx.clearRect(0, 0, this.width, this.height);

    const trianglesToRender: Triangle3D[] = [];
    const viewMat = cameraRotMat.getTransposed();
    const viewVec = cameraPos.multiplyMatrix(viewMat).multiplyByScalar(-1.0);
    const nearPlane = new Plane(new Vector(0, 0, this.zNear), new Vector(0, 0, -1));

    for (const mesh of this.meshes) {
      for (const tri of mesh.triangles) {
        const transformedTri = this.transformTriangle(tri, Matrix.identityMatrix(3), meshPos);
        const norm = transformedTri.getSurfaceNormal();
        const camToTri = transformedTri.get(0).subtract(cameraPos);

        if (norm.dotProduct(camToTri) < 0) {
          let shading = norm.dotProduct(this.lightDir);
          shading = Math.max(0.2, Math.min(1, shading));
          transformedTri.setShading(shading);

          const viewTri = this.transformTriangle(transformedTri, viewMat, viewVec);
          const clipped = this.clipTriangleAgainstPlane(viewTri, nearPlane);
          for (const cTri of clipped) {
            const projTri = this.projectTriangle(cTri);
            trianglesToRender.push(projTri);
          }
        }
      }
    }

    trianglesToRender.sort((a, b) => {
      const az = (a.get(0).z + a.get(1).z + a.get(2).z) / 3;
      const bz = (b.get(0).z + b.get(1).z + b.get(2).z) / 3;
      return bz - az;
    });

    for (const tri of trianglesToRender) {
      this.drawTriangle(tri);
    }
  }

  renderMesh(mesh: Mesh3D, meshPos: Vector, cameraRotMat: Matrix, cameraPos: Vector): void {
    const trianglesToRender: Triangle3D[] = [];
    const viewMat = cameraRotMat.getTransposed();
    const viewVec = cameraPos.multiplyMatrix(viewMat).multiplyByScalar(-1.0);
    const nearPlane = new Plane(new Vector(0, 0, this.zNear), new Vector(0, 0, -1));

    for (const tri of mesh.triangles) {
      const transformedTri = this.transformTriangle(tri, Matrix.identityMatrix(3), meshPos);
      const norm = transformedTri.getSurfaceNormal();
      const camToTri = transformedTri.get(0).subtract(cameraPos);

      if (norm.dotProduct(camToTri) < 0) {
        let shading = norm.dotProduct(this.lightDir);
        shading = Math.max(0.2, Math.min(1, shading));
        transformedTri.setShading(shading);

        const viewTri = this.transformTriangle(transformedTri, viewMat, viewVec);
        const clipped = this.clipTriangleAgainstPlane(viewTri, nearPlane);
        for (const cTri of clipped) {
          const projTri = this.projectTriangle(cTri);
          trianglesToRender.push(projTri);
        }
      }
    }

    trianglesToRender.sort((a, b) => {
      const az = (a.get(0).z + a.get(1).z + a.get(2).z) / 3;
      const bz = (b.get(0).z + b.get(1).z + b.get(2).z) / 3;
      return bz - az;
    });

    for (const tri of trianglesToRender) {
      this.drawTriangle(tri);
    }
  }

  projectPoint(point: Vector, cameraPos: Vector, cameraRotMat: Matrix, meshPos: Vector = new Vector(0, 0, 0)): { x: number, y: number, z: number } | null {
    const viewMat = cameraRotMat.getTransposed();
    const viewVec = cameraPos.multiplyMatrix(viewMat).multiplyByScalar(-1.0);
    const worldPoint = point.add(meshPos);
    const viewPoint = worldPoint.multiplyMatrix(viewMat).add(viewVec);
    
    if (viewPoint.z < this.zNear) return null;
    
    let projected = viewPoint.multiplyMatrix(this.projMat);
    projected = projected.divideByScalar(viewPoint.z);
    
    const x = (projected.x + 1.0) * this.width / 2.0;
    const y = (-projected.y + 1.0) * this.height / 2.0;
    
    return { x, y, z: viewPoint.z };
  }

  transformTriangle(tri: Triangle3D, matrix: Matrix, translation: Vector): Triangle3D {
    const v1 = tri.get(0).multiplyMatrix(matrix).add(translation);
    const v2 = tri.get(1).multiplyMatrix(matrix).add(translation);
    const v3 = tri.get(2).multiplyMatrix(matrix).add(translation);
    const newTri = new Triangle3D(v1, v2, v3, tri.color);
    newTri.setShading(tri.shading);
    return newTri;
  }

  projectTriangle(tri: Triangle3D): Triangle3D {
    const v = [tri.get(0), tri.get(1), tri.get(2)].map(curr => {
      const z = Math.max(this.zNear, curr.z);
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

  drawTriangle(tri: Triangle3D): void {
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

  clipTriangleAgainstPlane(tri: Triangle3D, plane: Plane): Triangle3D[] {
    const inside: Vector[] = [];
    const outside: Vector[] = [];
    for (let i = 0; i < 3; i++) {
      if (plane.distanceFromPoint(tri.get(i)) <= 0) inside.push(tri.get(i));
      else outside.push(tri.get(i));
    }

    if (inside.length === 1) {
      const v1 = inside[0];
      const v2 = plane.lineIntersectPlanePoint(v1, outside[0]);
      const v3 = plane.lineIntersectPlanePoint(v1, outside[1]);
      const res = new Triangle3D(v1, v2, v3, tri.color);
      res.setShading(tri.shading);
      return [res];
    } else if (inside.length === 2) {
      const v1 = inside[0];
      const v2 = inside[1];
      const v3 = plane.lineIntersectPlanePoint(v1, outside[0]);
      const v4 = plane.lineIntersectPlanePoint(v2, outside[0]);
      const res1 = new Triangle3D(v1, v2, v3, tri.color);
      const res2 = new Triangle3D(v3, v2, v4, tri.color);
      res1.setShading(tri.shading);
      res2.setShading(tri.shading);
      return [res1, res2];
    } else if (inside.length === 3) {
      return [tri];
    }
    return [];
  }
}

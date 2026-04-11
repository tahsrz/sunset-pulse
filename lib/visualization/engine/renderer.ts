import { Vector, Matrix } from './math';
import { ObjectPool, Poolable } from './pool';

export interface Color {
  r: number;
  g: number;
  b: number;
}

export class Triangle3D implements Poolable {
  vertices: Vector[];
  color: Color;
  shading: number;

  constructor(v1: Vector = new Vector(), v2: Vector = new Vector(), v3: Vector = new Vector(), color: Color = { r: 255, g: 255, b: 255 }) {
    this.vertices = [v1, v2, v3];
    this.color = color;
    this.shading = 1.0;
  }

  reset(): void {
    this.shading = 1.0;
    // Note: vertices are often managed by pools separately or reused in place
  }

  get(index: number): Vector { return this.vertices[index]; }
  set(index: number, value: Vector): void { this.vertices[index] = value; }

  getSurfaceNormal(target: Vector): void {
    // Optimization: using temporary subtraction to avoid allocation
    const v0 = this.vertices[0], v1 = this.vertices[1], v2 = this.vertices[2];
    const l1x = v1.x - v0.x, l1y = v1.y - v0.y, l1z = v1.z - v0.z;
    const l2x = v2.x - v0.x, l2y = v2.y - v0.y, l2z = v2.z - v0.z;
    
    target.x = l1y * l2z - l1z * l2y;
    target.y = l1z * l2x - l1x * l2z;
    target.z = l1x * l2y - l1y * l2x;
    
    target.normalizeInto(target);
  }

  setShading(value: number): void {
    this.shading = value;
  }

  getColorWithShading(): string {
    const r = (this.color.r * this.shading) | 0;
    const g = (this.color.g * this.shading) | 0;
    const b = (this.color.b * this.shading) | 0;
    return `rgb(${r},${g},${b})`;
  }
}

export class Mesh3D {
// ... existing code ...
  triangles: Triangle3D[];

  constructor(triangles: Triangle3D[] = []) {
    this.triangles = triangles;
  }

  static parseObj(text: string, defaultColor: Color = { r: 255, g: 255, b: 255 }): Mesh3D {
    const vertices: Vector[] = [];
    const triangles: Triangle3D[] = [];
    let currentColor: Color = { ...defaultColor };
    
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) continue;

      const parts = line.split(/\s+/);
      const type = parts[0];

      if (type === 'v') {
        vertices.push(new Vector(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])));
      } 
      else if (type === 'usecolor') {
        currentColor = {
          r: parseInt(parts[1]) || defaultColor.r,
          g: parseInt(parts[2]) || defaultColor.g,
          b: parseInt(parts[3]) || defaultColor.b
        };
      }
      else if (type === 'f') {
        const vIndices = [];
        for (let j = 1; j < parts.length; j++) {
          const idx = parseInt(parts[j].split('/')[0]) - 1;
          if (!isNaN(idx)) vIndices.push(idx);
        }

        if (vIndices.length === 3) {
          triangles.push(new Triangle3D(vertices[vIndices[0]], vertices[vIndices[1]], vertices[vIndices[2]], currentColor));
        } else if (vIndices.length === 4) {
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
    const v = [
      new Vector(-s, -s, -s), new Vector(s, -s, -s), new Vector(s, s, -s), new Vector(-s, s, -s),
      new Vector(-s, -s, s), new Vector(s, -s, s), new Vector(s, s, s), new Vector(-s, s, s)
    ];
    const triangles = [
      new Triangle3D(v[0], v[1], v[2], color), new Triangle3D(v[0], v[2], v[3], color),
      new Triangle3D(v[1], v[5], v[6], color), new Triangle3D(v[1], v[6], v[2], color),
      new Triangle3D(v[5], v[4], v[7], color), new Triangle3D(v[5], v[7], v[6], color),
      new Triangle3D(v[4], v[0], v[3], color), new Triangle3D(v[4], v[3], v[7], color),
      new Triangle3D(v[3], v[2], v[6], color), new Triangle3D(v[3], v[6], v[7], color),
      new Triangle3D(v[4], v[5], v[1], color), new Triangle3D(v[4], v[1], v[0], color)
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
    return this.normal.x * (p.x - this.point.x) + 
           this.normal.y * (p.y - this.point.y) + 
           this.normal.z * (p.z - this.point.z);
  }

  lineIntersectPlanePoint(start: Vector, end: Vector, target: Vector): void {
    const ad = start.dotProduct(this.normal);
    const bd = end.dotProduct(this.normal);
    const planeD = this.point.dotProduct(this.normal);
    const t = (planeD - ad) / (bd - ad);
    target.x = start.x + (end.x - start.x) * t;
    target.y = start.y + (end.y - start.y) * t;
    target.z = start.z + (end.z - start.z) * t;
  }
}

export interface RendererOptions {
  wireframe?: boolean;
  wireframeColor?: string;
}

export class Renderer {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  zNear: number = 0.1;
  zFar: number = 1000.0;
  fov: number = Math.PI / 2;
  meshes: Mesh3D[] = [];
  lightDir: Vector = new Vector(1, 1, -1).normalized();
  showWireframe: boolean;
  wireframeColor: string;
  projMat: Matrix;

  // Pools for reducing GC
  private vectorPool = new ObjectPool<Vector>(() => new Vector(), 500);
  private trianglePool = new ObjectPool<Triangle3D>(() => new Triangle3D(), 200);

  // Scratchpad for avoiding GC
  private tempVec1 = new Vector();
  private tempVec2 = new Vector();
  private tempNorm = new Vector();
  private identityMat = Matrix.identityMatrix(3);
  private nearPlane: Plane;

  constructor(canvas: HTMLCanvasElement, options: RendererOptions = {}) {
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Could not get 2D context');
    this.ctx = context;
    this.width = canvas.width;
    this.height = canvas.height;
    this.showWireframe = options.wireframe || false;
    this.wireframeColor = options.wireframeColor || 'rgba(255, 255, 255, 0.2)';
    this.projMat = this.createProjectionMatrix();
    this.nearPlane = new Plane(new Vector(0, 0, this.zNear), new Vector(0, 0, -1));
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
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.renderInternal(this.meshes.flatMap(m => m.triangles), cameraPos, cameraRotMat, meshPos);
  }

  renderMesh(mesh: Mesh3D, meshPos: Vector, cameraRotMat: Matrix, cameraPos: Vector): void {
    this.renderInternal(mesh.triangles, cameraPos, cameraRotMat, meshPos);
  }

  private renderInternal(triangles: Triangle3D[], cameraPos: Vector, cameraRotMat: Matrix, meshPos: Vector): void {
    const trianglesToRender: Triangle3D[] = [];
    const viewMat = cameraRotMat.getTransposed();
    
    const vx = -(cameraPos.x * viewMat.get(0,0) + cameraPos.y * viewMat.get(1,0) + cameraPos.z * viewMat.get(2,0));
    const vy = -(cameraPos.x * viewMat.get(0,1) + cameraPos.y * viewMat.get(1,1) + cameraPos.z * viewMat.get(2,1));
    const vz = -(cameraPos.x * viewMat.get(0,2) + cameraPos.y * viewMat.get(1,2) + cameraPos.z * viewMat.get(2,2));
    this.tempVec1.x = vx; this.tempVec1.y = vy; this.tempVec1.z = vz;

    const sessionAllocatedVectors: Vector[] = [];
    const sessionAllocatedTriangles: Triangle3D[] = [];

    for (let i = 0; i < triangles.length; i++) {
      const tri = triangles[i];
      const transformedTri = this.transformTriangle(tri, this.identityMat, meshPos, sessionAllocatedVectors, sessionAllocatedTriangles);
      
      transformedTri.getSurfaceNormal(this.tempNorm);
      this.tempVec2.x = transformedTri.get(0).x - cameraPos.x;
      this.tempVec2.y = transformedTri.get(0).y - cameraPos.y;
      this.tempVec2.z = transformedTri.get(0).z - cameraPos.z;

      if (this.tempNorm.dotProduct(this.tempVec2) < 0) {
        let shading = this.tempNorm.dotProduct(this.lightDir);
        transformedTri.setShading(Math.max(0.2, Math.min(1, shading)));

        const viewTri = this.transformTriangle(transformedTri, viewMat, this.tempVec1, sessionAllocatedVectors, sessionAllocatedTriangles);
        const clipped = this.clipTriangleAgainstPlane(viewTri, this.nearPlane, sessionAllocatedVectors, sessionAllocatedTriangles);
        
        for (let j = 0; j < clipped.length; j++) {
          const projected = this.projectTriangle(clipped[j], sessionAllocatedVectors, sessionAllocatedTriangles);
          trianglesToRender.push(projected);
        }
      }
    }

    trianglesToRender.sort((a, b) => {
      const az = a.get(0).z + a.get(1).z + a.get(2).z;
      const bz = b.get(0).z + b.get(1).z + b.get(2).z;
      return bz - az;
    });

    for (let i = 0; i < trianglesToRender.length; i++) {
      this.drawTriangle(trianglesToRender[i]);
    }

    // Cleanup session allocations back to pools
    this.vectorPool.releaseMany(sessionAllocatedVectors);
    this.trianglePool.releaseMany(sessionAllocatedTriangles);
  }

  private transformTriangle(tri: Triangle3D, matrix: Matrix, translation: Vector, vSession: Vector[], tSession: Vector[]): Triangle3D {
    const v1 = this.vectorPool.get(); tri.get(0).multiplyMatrixInto(matrix, v1); v1.addInto(translation, v1);
    const v2 = this.vectorPool.get(); tri.get(1).multiplyMatrixInto(matrix, v2); v2.addInto(translation, v2);
    const v3 = this.vectorPool.get(); tri.get(2).multiplyMatrixInto(matrix, v3); v3.addInto(translation, v3);
    vSession.push(v1, v2, v3);

    const res = this.trianglePool.get();
    res.set(0, v1); res.set(1, v2); res.set(2, v3);
    res.color = tri.color;
    res.setShading(tri.shading);
    tSession.push(res);
    return res;
  }

  private projectTriangle(tri: Triangle3D, vSession: Vector[], tSession: Triangle3D[]): Triangle3D {
    const v: Vector[] = [];
    for (let i = 0; i < 3; i++) {
      const curr = tri.get(i);
      const z = Math.max(this.zNear, curr.z);
      const invZ = 1.0 / z;
      const newZ = (z - this.zNear) * this.projMat.get(2, 2);
      
      const px = (curr.x * this.projMat.get(0, 0) + curr.y * this.projMat.get(1, 0) + curr.z * this.projMat.get(2, 0)) * invZ;
      const py = (curr.x * this.projMat.get(0, 1) + curr.y * this.projMat.get(1, 1) + curr.z * this.projMat.get(2, 1)) * invZ;
      
      const pv = this.vectorPool.get();
      pv.x = (px + 1.0) * this.width * 0.5;
      pv.y = (-py + 1.0) * this.height * 0.5;
      pv.z = newZ;
      v.push(pv);
      vSession.push(pv);
    }
    const res = this.trianglePool.get();
    res.set(0, v[0]); res.set(1, v[1]); res.set(2, v[2]);
    res.color = tri.color;
    res.setShading(tri.shading);
    tSession.push(res);
    return res;
  }

  drawTriangle(tri: Triangle3D): void {
    const v0 = tri.get(0), v1 = tri.get(1), v2 = tri.get(2);
    this.ctx.beginPath();
    this.ctx.moveTo(v0.x, v0.y);
    this.ctx.lineTo(v1.x, v1.y);
    this.ctx.lineTo(v2.x, v2.y);
    this.ctx.closePath();
    this.ctx.fillStyle = tri.getColorWithShading();
    this.ctx.fill();

    if (this.showWireframe) {
      this.ctx.strokeStyle = this.wireframeColor;
      this.ctx.lineWidth = 0.5;
      this.ctx.stroke();
    }
  }

  private clipTriangleAgainstPlane(tri: Triangle3D, plane: Plane, vSession: Vector[], tSession: Triangle3D[]): Triangle3D[] {
    const inside: Vector[] = [];
    const outside: Vector[] = [];
    for (let i = 0; i < 3; i++) {
      if (plane.distanceFromPoint(tri.get(i)) <= 0) inside.push(tri.get(i));
      else outside.push(tri.get(i));
    }

    if (inside.length === 1) {
      const v1 = inside[0];
      const v2 = this.vectorPool.get(); plane.lineIntersectPlanePoint(v1, outside[0], v2);
      const v3 = this.vectorPool.get(); plane.lineIntersectPlanePoint(v1, outside[1], v3);
      vSession.push(v2, v3);

      const res = this.trianglePool.get();
      res.set(0, v1); res.set(1, v2); res.set(2, v3);
      res.color = tri.color;
      res.setShading(tri.shading);
      tSession.push(res);
      return [res];
    } else if (inside.length === 2) {
      const v1 = inside[0], v2 = inside[1];
      const v3 = this.vectorPool.get(); plane.lineIntersectPlanePoint(v1, outside[0], v3);
      const v4 = this.vectorPool.get(); plane.lineIntersectPlanePoint(v2, outside[0], v4);
      vSession.push(v3, v4);

      const res1 = this.trianglePool.get();
      res1.set(0, v1); res1.set(1, v2); res1.set(2, v3);
      res1.color = tri.color;
      res1.setShading(tri.shading);

      const res2 = this.trianglePool.get();
      res2.set(0, v3); res2.set(1, v2); res2.set(2, v4);
      res2.color = tri.color;
      res2.setShading(tri.shading);
      
      tSession.push(res1, res2);
      return [res1, res2];
    } else if (inside.length === 3) {
      return [tri];
    }
    return [];
  }
}

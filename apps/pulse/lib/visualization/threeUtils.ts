import * as THREE from 'three';
import { Vector } from './engine/math';

/**
 * Normalizes a Three.js Object3D (Group/Mesh) for the Fiber Canvas.
 * This is the bridge between our raw math logic and the R3F ecosystem.
 */
export const normalizeThreeGroup = (group: THREE.Object3D, targetSize: number = 5) => {
  const box = new THREE.Box3().setFromObject(group);
  const center = new THREE.Vector3();
  box.getCenter(center);
  
  // 1. Center the geometry
  group.position.x -= center.x;
  group.position.y -= center.y;
  group.position.z -= center.z;

  // 2. Scale to fit
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = targetSize / (maxDim || 1);
  group.scale.setScalar(scale);

  return { scale, center };
};


export class Box3 {
  min: Vector;
  max: Vector;

  constructor(
    min: Vector = new Vector(Infinity, Infinity, Infinity),
    max: Vector = new Vector(-Infinity, -Infinity, -Infinity)
  ) {
    this.min = min;
    this.max = max;
  }

  expandByPoint(p: Vector): Box3 {
    this.min = new Vector(
      Math.min(this.min.x, p.x),
      Math.min(this.min.y, p.y),
      Math.min(this.min.z, p.z)
    );
    this.max = new Vector(
      Math.max(this.max.x, p.x),
      Math.max(this.max.y, p.y),
      Math.max(this.max.z, p.z)
    );
    return this;
  }

  setFromMesh(mesh: any): Box3 {
    this.makeEmpty();
    mesh.triangles.forEach((tri: any) => {
      tri.vertices.forEach((v: Vector) => {
        this.expandByPoint(v);
      });
    });
    return this;
  }

  makeEmpty(): Box3 {
    this.min = new Vector(Infinity, Infinity, Infinity);
    this.max = new Vector(-Infinity, -Infinity, -Infinity);
    return this;
  }

  getCenter(): Vector {
    return this.min.add(this.max).divideByScalar(2);
  }

  getSize(): Vector {
    return this.max.subtract(this.min);
  }

  containsPoint(p: Vector): boolean {
    return p.x >= this.min.x && p.x <= this.max.x &&
           p.y >= this.min.y && p.y <= this.max.y &&
           p.z >= this.min.z && p.z <= this.max.z;
  }
}

export const centerModel = (mesh: any): Vector => {
  const box = new Box3().setFromMesh(mesh);
  const center = box.getCenter();

  mesh.triangles.forEach((tri: any) => {
    for (let i = 0; i < 3; i++) {
      tri.vertices[i] = tri.vertices[i].subtract(center);
    }
  });

  console.log(`[THREE_UTILS] Model zeroed at center:`, [center.x, center.y, center.z]);
  return center;
};

export const normalizeModel = (mesh: any, targetSize: number = 1.0): number => {
  const box = new Box3().setFromMesh(mesh);
  centerModel(mesh);
  
  const size = box.getSize();
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = targetSize / (maxDim || 1);

  mesh.triangles.forEach((tri: any) => {
    for (let i = 0; i < 3; i++) {
      tri.vertices[i] = tri.vertices[i].multiplyByScalar(scale);
    }
  });

  return scale;
};


export const normalizeSanityAsset = (mesh: any, targetUnitSize: number = 20.0): { scale: number, center: Vector } => {
  const box = new Box3().setFromMesh(mesh);
  const center = box.getCenter();
  const size = box.getSize();
  
  mesh.triangles.forEach((tri: any) => {
    for (let i = 0; i < 3; i++) {
      tri.vertices[i] = tri.vertices[i].subtract(center);
    }
  });

  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = targetUnitSize / (maxDim || 1);

  mesh.triangles.forEach((tri: any) => {
    for (let i = 0; i < 3; i++) {
      tri.vertices[i] = tri.vertices[i].multiplyByScalar(scale);
    }
  });

  console.log(`[SANITY_ASSET_NORMALIZER] Zeroed at ${[center.x, center.y, center.z].join(',')} and scaled by ${scale.toFixed(4)}`);
  return { scale, center };
};

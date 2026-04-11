import { Poolable } from './pool';

export class Vector implements Poolable {
  private coords: Float32Array;

  constructor(x: number = 0, y: number = 0, z: number = 0) {
    this.coords = new Float32Array([x, y, z]);
  }

  reset(): void {
    this.coords[0] = 0;
    this.coords[1] = 0;
    this.coords[2] = 0;
  }

  get(index: number): number {
    return this.coords[index];
  }

  set(index: number, value: number): void {
    this.coords[index] = value;
  }

  get x(): number { return this.coords[0]; }
  set x(v: number) { this.coords[0] = v; }
  get y(): number { return this.coords[1]; }
  set y(v: number) { this.coords[1] = v; }
  get z(): number { return this.coords[2]; }
  set z(v: number) { this.coords[2] = v; }

  copyFrom(other: Vector): void {
    this.coords[0] = other.coords[0];
    this.coords[1] = other.coords[1];
    this.coords[2] = other.coords[2];
  }

  add(other: Vector): Vector {
    return new Vector(this.x + other.x, this.y + other.y, this.z + other.z);
  }

  addInto(other: Vector, target: Vector): void {
    target.x = this.x + other.x;
    target.y = this.y + other.y;
    target.z = this.z + other.z;
  }

  subtract(other: Vector): Vector {
    return new Vector(this.x - other.x, this.y - other.y, this.z - other.z);
  }

  subtractInto(other: Vector, target: Vector): void {
    target.x = this.x - other.x;
    target.y = this.y - other.y;
    target.z = this.z - other.z;
  }

  multiplyByScalar(scalar: number): Vector {
    return new Vector(this.x * scalar, this.y * scalar, this.z * scalar);
  }

  multiplyByScalarInto(scalar: number, target: Vector): void {
    target.x = this.x * scalar;
    target.y = this.y * scalar;
    target.z = this.z * scalar;
  }

  divideByScalar(scalar: number): Vector {
    if (scalar === 0) return new Vector(0, 0, 0);
    return new Vector(this.x / scalar, this.y / scalar, this.z / scalar);
  }

  divideByScalarInto(scalar: number, target: Vector): void {
    if (scalar === 0) {
      target.x = target.y = target.z = 0;
      return;
    }
    const inv = 1.0 / scalar;
    target.x = this.x * inv;
    target.y = this.y * inv;
    target.z = this.z * inv;
  }

  dotProduct(other: Vector): number {
    return this.x * other.x + this.y * other.y + this.z * other.z;
  }

  crossProduct(other: Vector): Vector {
    return new Vector(
      this.y * other.z - this.z * other.y,
      this.z * other.x - this.x * other.z,
      this.x * other.y - this.y * other.x
    );
  }

  crossProductInto(other: Vector, target: Vector): void {
    const x = this.y * other.z - this.z * other.y;
    const y = this.z * other.x - this.x * other.z;
    const z = this.x * other.y - this.y * other.x;
    target.x = x;
    target.y = y;
    target.z = z;
  }

  magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  normalized(): Vector {
    const mag = this.magnitude();
    return mag > 0 ? this.divideByScalar(mag) : new Vector(0, 0, 0);
  }

  normalizeInto(target: Vector): void {
    const mag = this.magnitude();
    if (mag > 0) {
      this.divideByScalarInto(mag, target);
    } else {
      target.x = target.y = target.z = 0;
    }
  }

  multiplyMatrix(matrix: Matrix): Vector {
    const result = new Vector();
    this.multiplyMatrixInto(matrix, result);
    return result;
  }

  multiplyMatrixInto(matrix: Matrix, target: Vector): void {
    const x = this.x, y = this.y, z = this.z;
    target.x = x * matrix.get(0, 0) + y * matrix.get(1, 0) + z * matrix.get(2, 0);
    target.y = x * matrix.get(0, 1) + y * matrix.get(1, 1) + z * matrix.get(2, 1);
    target.z = x * matrix.get(0, 2) + y * matrix.get(1, 2) + z * matrix.get(2, 2);
  }

  rotate(yaw: number, pitch: number, roll: number = 0): Vector {
    const mat = Matrix.fromEuler(yaw, pitch, roll);
    return this.multiplyMatrix(mat);
  }
}

export class Matrix {
  private data: Float32Array;
  readonly rows: number;
  readonly cols: number;

  constructor(rows: number = 3, cols: number = 3) {
    this.data = new Float32Array(rows * cols);
    this.rows = rows;
    this.cols = cols;
  }

  get(row: number, col: number): number {
    return this.data[row * this.cols + col];
  }

  set(row: number, col: number, value: number): void {
    this.data[row * this.cols + col] = value;
  }

  multiplyMatrix(other: Matrix): Matrix {
    const result = new Matrix(this.rows, other.cols);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < other.cols; j++) {
        let sum = 0;
        for (let k = 0; k < this.cols; k++) {
          sum += this.get(i, k) * other.get(k, j);
        }
        result.set(i, j, sum);
      }
    }
    return result;
  }

  getTransposed(): Matrix {
    const result = new Matrix(this.cols, this.rows);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        result.set(j, i, this.get(i, j));
      }
    }
    return result;
  }

  static identityMatrix(size: number): Matrix {
    const result = new Matrix(size, size);
    for (let i = 0; i < size; i++) result.set(i, i, 1);
    return result;
  }

  static fromEuler(yaw: number, pitch: number, roll: number = 0): Matrix {
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const cr = Math.cos(roll);
    const sr = Math.sin(roll);

    const res = new Matrix(3, 3);
    res.set(0, 0, cy * cr + sy * sp * sr);
    res.set(0, 1, sr * cp);
    res.set(0, 2, -sy * cr + cy * sp * sr);
    res.set(1, 0, -cy * sr + sy * sp * cr);
    res.set(1, 1, cr * cp);
    res.set(1, 2, sr * sy + cy * sp * cr);
    res.set(2, 0, sy * cp);
    res.set(2, 1, -sp);
    res.set(2, 2, cy * cp);
    return res;
  }
}

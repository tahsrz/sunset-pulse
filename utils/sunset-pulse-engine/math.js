export class Vector {
  constructor(x = 0, y = 0, z = 0) {
    this.coords = [x, y, z];
  }

  get(index) {
    return this.coords[index];
  }

  set(index, value) {
    this.coords[index] = value;
  }

  get x() { return this.coords[0]; }
  get y() { return this.coords[1]; }
  get z() { return this.coords[2]; }

  add(other) {
    return new Vector(this.x + other.x, this.y + other.y, this.z + other.z);
  }

  subtract(other) {
    return new Vector(this.x - other.x, this.y - other.y, this.z - other.z);
  }

  multiplyByScalar(scalar) {
    return new Vector(this.x * scalar, this.y * scalar, this.z * scalar);
  }

  divideByScalar(scalar) {
    if (scalar === 0) return new Vector(0, 0, 0);
    return new Vector(this.x / scalar, this.y / scalar, this.z / scalar);
  }

  dotProduct(other) {
    return this.x * other.x + this.y * other.y + this.z * other.z;
  }

  crossProduct(other) {
    return new Vector(
      this.y * other.z - this.z * other.y,
      this.z * other.x - this.x * other.z,
      this.x * other.y - this.y * other.x
    );
  }

  magnitude() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  normalized() {
    const mag = this.magnitude();
    return mag > 0 ? this.divideByScalar(mag) : new Vector(0, 0, 0);
  }

  multiplyMatrix(matrix) {
    const result = new Vector();
    for (let i = 0; i < 3; i++) {
      let sum = 0;
      for (let j = 0; j < 3; j++) {
        sum += this.get(j) * matrix.get(j, i);
      }
      result.set(i, sum);
    }
    return result;
  }
}

export class Matrix {
  constructor(rows = 3, cols = 3) {
    this.data = Array.from({ length: rows }, () => Array(cols).fill(0));
    this.rows = rows;
    this.cols = cols;
  }

  get(row, col) {
    return this.data[row][col];
  }

  set(row, col, value) {
    this.data[row][col] = value;
  }

  multiplyMatrix(other) {
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

  getTransposed() {
    const result = new Matrix(this.cols, this.rows);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        result.set(j, i, this.get(i, j));
      }
    }
    return result;
  }

  static identityMatrix(size) {
    const result = new Matrix(size, size);
    for (let i = 0; i < size; i++) result.set(i, i, 1);
    return result;
  }
}

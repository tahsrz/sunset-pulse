import { Vector } from './sunset-pulse-engine/math';
import { Box3 } from './threeUtils';

export class PulseRNG {
  private state: Vector;
  private readonly prime: Vector = new Vector(12.9898, 78.233, 37.719);
  private readonly bounds: Box3;

  constructor(seed: Vector = new Vector(0.1234, 0.5678, 0.9012)) {
    this.state = seed;
    this.bounds = new Box3(new Vector(-1, -1, -1), new Vector(1, 1, 1));
  }

  next(): number {
    const dot = this.state.dotProduct(this.prime);
    const val = Math.sin(dot) * 43758.5453123;
    const result = Math.abs(val - Math.floor(val));

    const center = this.bounds.getCenter();
    const drift = this.state.subtract(center).multiplyByScalar(0.5);
    
    const jitter = this.state.crossProduct(new Vector(result, 1.0, 0.5)).normalized();
    
    this.state = drift.add(jitter).add(new Vector(result, dot % 1, (result + dot) % 1));

    return result;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  vectorInBox(box: Box3): Vector {
    const size = box.getSize();
    return new Vector(
      box.min.x + this.next() * size.x,
      box.min.y + this.next() * size.y,
      box.min.z + this.next() * size.z
    );
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

export const pulseRNG = new PulseRNG();

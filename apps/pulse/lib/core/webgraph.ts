export class BitReader {
  private pos = 0;
  private bitPos = 7;

  constructor(private data: Buffer) {}

  public readBit(): number {
    if (this.pos >= this.data.length) return -1;
    const bit = (this.data[this.pos] >> this.bitPos) & 1;
    this.bitPos--;
    if (this.bitPos < 0) {
      this.bitPos = 7;
      this.pos++;
    }
    return bit;
  }

  public readBits(count: number): number {
    let val = 0;
    for (let i = 0; i < count; i++) {
      const bit = this.readBit();
      if (bit === -1) break;
      val = (val << 1) | bit;
    }
    return val;
  }

  public readUnary(): number {
    let count = 0;
    while (this.readBit() === 1) {
      count++;
    }
    return count;
  }

  public readGamma(): number {
    const m = this.readUnary();
    if (m === 0) return 1;
    return (1 << m) | this.readBits(m);
  }
}

export class WebGraph {
  public static decodeLinks(data: Buffer, nodeId: number, expectedCount: number): number[] {
    const links: number[] = [];
    if (expectedCount === 0) return links;

    const reader = new BitReader(data);
    
    // 1. Outdegree
    const actualOutdegree = reader.readGamma() - 1;
    // 2. Reference (Distance 0 in our v1)
    const refDist = reader.readGamma() - 1;
    // 3. Intervals
    const numIntervals = reader.readGamma() - 1;

    let lastPos = nodeId;
    for (let i = 0; i < numIntervals; i++) {
      const zigzag = reader.readGamma() - 1;
      const gap = (zigzag % 2 === 0) ? (zigzag / 2) : -(Math.floor(zigzag / 2) + 1);
      const start = lastPos + gap;
      const length = reader.readGamma() + 2;
      for (let j = 0; j < length; j++) {
        links.push(start + j);
      }
      lastPos = start + length;
    }

    // 4. Residuals
    while (links.length < actualOutdegree) {
      const zigzag = reader.readGamma() - 1;
      const gap = (zigzag % 2 === 0) ? (zigzag / 2) : -(Math.floor(zigzag / 2) + 1);
      const val = lastPos + gap;
      links.push(val);
      lastPos = val + 1;
    }

    return links.sort((a, b) => a - b);
  }
}

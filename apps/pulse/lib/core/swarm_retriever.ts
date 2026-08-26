import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export interface SwarmLink {
  hash: string;
  offset: number | 'UNRESOLVED';
}

export interface SwarmMatch {
  score: number;
  data: string;
  links: SwarmLink[];
}

interface SwarmShard {
  offset: number;
  length: number;
  text: string;
  links: SwarmLink[];
}

const MAX_SYMBOLS_PER_SHARD = 128;

/**
 * Reader for v3.5 swarm prototype cartridges produced by SwarmMemoriaBuilder.
 * These are raw .tah data streams with optional *_dht.json sidecars rather
 * than indexed .hat/.tah Memoria pairs.
 */
export class SwarmRetriever {
  private buffer: Buffer;
  private dht: Record<string, number> = {};
  private shards: SwarmShard[] | null = null;

  constructor(private tahPath: string) {
    if (!fs.existsSync(tahPath)) {
      throw new Error(`Swarm cartridge not found: ${tahPath}`);
    }

    this.buffer = fs.readFileSync(tahPath);
    this.loadDht();
  }

  private loadDht() {
    const parsed = path.parse(this.tahPath);
    const dhtPath = path.join(parsed.dir, `${parsed.name}_dht.json`);
    if (!fs.existsSync(dhtPath)) return;

    try {
      this.dht = JSON.parse(fs.readFileSync(dhtPath, 'utf-8'));
    } catch {
      this.dht = {};
    }
  }

  private parseShards(): SwarmShard[] {
    if (this.shards) return this.shards;

    const shards: SwarmShard[] = [];
    let offset = 0;

    while (offset < this.buffer.length) {
      const nullPos = this.buffer.indexOf(0, offset);
      if (nullPos === -1 || nullPos + 3 > this.buffer.length) break;

      const text = this.buffer.slice(offset, nullPos).toString('utf-8').trim();
      const symbolCount = this.buffer.readUInt16LE(nullPos + 1);
      const symbolBytes = 2 + symbolCount * 32;
      const nextOffset = nullPos + 1 + symbolBytes;

      if (symbolCount > MAX_SYMBOLS_PER_SHARD || nextOffset > this.buffer.length) {
        break;
      }

      const links: SwarmLink[] = [];
      for (let i = 0; i < symbolCount; i++) {
        const hashStart = nullPos + 3 + i * 32;
        const hash = this.buffer.slice(hashStart, hashStart + 32).toString('hex');
        links.push({
          hash,
          offset: this.dht[hash] ?? 'UNRESOLVED'
        });
      }

      if (text) {
        shards.push({
          offset,
          length: nextOffset - offset,
          text,
          links
        });
      }

      offset = nextOffset;
    }

    this.shards = shards;
    return shards;
  }

  public search(query: string, topN = 3): SwarmMatch[] {
    const cleanQuery = query.toLowerCase().replace(/[^\w\s/.-]/g, ' ').trim();
    const terms = cleanQuery.split(/\s+/).filter(term => term.length > 2);
    const querySymbolHash = crypto.createHash('sha256').update(query.trim()).digest('hex');

    return this.parseShards()
      .map(shard => {
        const normalizedText = shard.text.toLowerCase();
        const termMatches = terms.filter(term => normalizedText.includes(term)).length;
        const phraseMatch = cleanQuery.length > 0 && normalizedText.includes(cleanQuery);
        const linkMatch = shard.links.some(link => link.hash === querySymbolHash);

        if (!termMatches && !phraseMatch && !linkMatch) return null;

        return {
          score: termMatches * 10 + (phraseMatch ? 25 : 0) + (linkMatch ? 15 : 0) + 5,
          data: this.formatShard(shard),
          links: shard.links
        };
      })
      .filter((match): match is SwarmMatch => Boolean(match))
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);
  }

  private formatShard(shard: SwarmShard): string {
    if (shard.links.length === 0) return shard.text;

    const links = shard.links
      .map(link => `${link.hash.slice(0, 12)} -> ${link.offset}`)
      .join(', ');

    return `${shard.text}\n\n[SWARM_LINKS] ${links}`;
  }
}

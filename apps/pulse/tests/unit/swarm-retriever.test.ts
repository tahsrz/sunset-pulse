import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SwarmRetriever } from '@/lib/core/swarm_retriever';

function swarmShard(text: string, symbols: string[] = []): Buffer {
  const textBuffer = Buffer.from(text, 'utf-8');
  const countBuffer = Buffer.alloc(2);
  countBuffer.writeUInt16LE(symbols.length, 0);
  const symbolBuffers = symbols.map(symbol => crypto.createHash('sha256').update(symbol).digest());

  return Buffer.concat([textBuffer, Buffer.from([0]), countBuffer, ...symbolBuffers]);
}

describe('SwarmRetriever', () => {
  it('reads raw swarm prototype shards and resolves DHT links', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-retriever-'));
    const tahPath = path.join(dir, 'swarm_test.tah');
    const dhtPath = path.join(dir, 'swarm_test_dht.json');
    const dependency = swarmShard('RFC 7540: Hypertext Transfer Protocol Version 2 (HTTP/2)');
    const primary = swarmShard('Sunset Pulse uses high-performance networking via HTTP/2.', ['RFC_7540']);

    fs.writeFileSync(tahPath, Buffer.concat([dependency, primary]));
    fs.writeFileSync(dhtPath, JSON.stringify({
      [crypto.createHash('sha256').update('RFC_7540').digest('hex')]: 0
    }));

    const retriever = new SwarmRetriever(tahPath);
    const matches = retriever.search('HTTP/2', 5);

    expect(matches.length).toBeGreaterThan(0);
    expect(matches.some(match => match.data.includes('Sunset Pulse uses'))).toBe(true);
    expect(matches.some(match => match.data.includes('[SWARM_LINKS]'))).toBe(true);
    expect(matches.some(match => match.links.some(link => link.offset === 0))).toBe(true);
  });
});

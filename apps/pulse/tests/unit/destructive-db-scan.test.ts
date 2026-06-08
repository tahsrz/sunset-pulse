import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../..');
const scannedDirs = ['app', 'lib', 'scripts'].map((dir) => path.join(root, dir));
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const skippedSegments = new Set(['node_modules', '.next', 'tests', '__pycache__']);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    if (skippedSegments.has(entry)) return [];

    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) return walk(fullPath);

    return sourceExtensions.has(path.extname(fullPath)) ? [fullPath] : [];
  });
}

function lineForIndex(source: string, index: number) {
  return source.slice(0, index).split(/\r?\n/).length;
}

describe('destructive database operation scan', () => {
  it('does not contain broad DB wipe calls without safety review', () => {
    const findings = scannedDirs.flatMap(walk).flatMap((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      const matches = [
        ...source.matchAll(/\.deleteMany\s*\(\s*(?:\{\s*\})?\s*\)/g),
        ...source.matchAll(/\.dropDatabase\s*\(/g),
        ...source.matchAll(/\bTRUNCATE\b/g),
      ];

      return matches.map((match) => {
        const line = lineForIndex(source, match.index ?? 0);
        const nearbySource = source.split(/\r?\n/).slice(Math.max(0, line - 8), line + 3).join('\n');
        const hasGuard = nearbySource.includes('assertDestructiveDbOperationAllowed')
          || nearbySource.includes('@db-safety-reviewed');

        return hasGuard
          ? null
          : `${path.relative(root, filePath)}:${line} ${match[0]}`;
      }).filter(Boolean);
    });

    expect(findings).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../..');
const clientRoots = ['app', 'components', 'context', 'hooks'].map((dir) => path.join(root, dir));
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx']);
const skippedSegments = new Set(['node_modules', '.next', 'tests', '__pycache__']);
const transitiveClientModules = [
  path.join(root, 'hooks', 'usePropertyInteraction.ts'),
  path.join(root, 'lib', 'supabase.js'),
];
const trackedTables = new Set([
  'collections',
  'daily_briefings',
  'intelligence_events',
  'leads',
  'property_comments',
  'site_config',
  'tasks',
  'workflows',
]);

const expectedSensitiveClientDependencies = [
  'components/IntelligenceTimeline.jsx:intelligence_events',
  'components/JamieSprintDashboard.jsx:tasks',
  'components/LeadPipelineBoard.tsx:leads',
  'context/JamiePulseContext.tsx:daily_briefings',
  'hooks/usePropertyInteraction.ts:collections',
  'hooks/usePropertyInteraction.ts:property_comments',
  'lib/supabase.js:collections',
  'lib/supabase.js:intelligence_events',
  'lib/supabase.js:property_comments',
  'lib/supabase.js:tasks',
];

describe('tenant client data boundary', () => {
  it('does not expose site_config through a client component boundary', () => {
    const findings = clientBoundarySources()
      .filter(({ source }) => source.includes('site_config'))
      .map(({ filePath }) => path.relative(root, filePath).replace(/\\/g, '/'));

    expect(findings).toEqual([]);
  });

  it('keeps the remaining sensitive browser table dependencies explicitly inventoried', () => {
    const sources = clientBoundarySources();

    const findings = new Set<string>();
    for (const { filePath, source } of sources) {
      const relativePath = path.relative(root, filePath).replace(/\\/g, '/');
      for (const table of tablesReferencedByClient(source)) {
        if (trackedTables.has(table)) findings.add(`${relativePath}:${table}`);
      }
    }

    expect(Array.from(findings).sort()).toEqual(expectedSensitiveClientDependencies);
  });
});

function clientSourceFiles() {
  return clientRoots.flatMap(walk).map((filePath) => ({
    filePath,
    source: readFileSync(filePath, 'utf8'),
  }));
}

function clientBoundarySources() {
  return [
    ...clientSourceFiles().filter(({ source }) => isClientBoundary(source)),
    ...transitiveClientModules.map((filePath) => ({
      filePath,
      source: readFileSync(filePath, 'utf8'),
    })),
  ];
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    if (skippedSegments.has(entry)) return [];

    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) return walk(fullPath);
    return sourceExtensions.has(path.extname(fullPath)) ? [fullPath] : [];
  });
}

function isClientBoundary(source: string) {
  return /^\s*['\"]use client['\"];?/m.test(source);
}

function tablesReferencedByClient(source: string) {
  const tables = new Set<string>();
  for (const match of source.matchAll(/\.from\(\s*['\"]([^'\"]+)['\"]\s*\)/g)) {
    tables.add(match[1]);
  }
  for (const match of source.matchAll(/\btable:\s*['\"]([^'\"]+)['\"]/g)) {
    tables.add(match[1]);
  }
  return tables;
}

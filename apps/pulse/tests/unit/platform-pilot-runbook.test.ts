import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const runbookPath = resolve(process.cwd(), 'docs/PLATFORM_TWO_APP_PILOT_RUNBOOK.md');
const runbook = readFileSync(runbookPath, 'utf8');

describe('two-app pilot runbook safety contract', () => {
  it('keeps hosted inspection distinct from local Docker preflight', () => {
    expect(runbook).toContain('Hosted read-only preflight evidence');
    expect(runbook).toContain('not evidence about a hosted project');
    expect(runbook).toContain('unknown` and keep the decision NO-GO');
  });

  it('records the hosted target and all safety-critical observations without secrets', () => {
    for (const field of [
      'non-secret project reference',
      'Observed migration version(s)',
      'Workspace UUID and status',
      'Both manifests have zero capabilities?',
      'Workspace budget configured and approved?',
      'Provider credentials/integrations absent or disabled?',
      'External-effect, email and publication dispatch disabled?',
      'platform_run admission observed state',
    ]) {
      expect(runbook).toContain(field);
    }

    expect(runbook).toContain('do not link this checkout to a hosted project');
    expect(runbook).toContain('does not grant permission to change admission');
    expect(runbook).toContain('Re-run the read-only checks immediately before the session');
  });
});

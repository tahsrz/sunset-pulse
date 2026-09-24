import { describe, expect, it } from 'vitest';
import readiness from '@/lib/platform/apps/manifests/real-estate-readiness.v1.json';
import contentReview from '@/lib/platform/apps/manifests/client-content-review.v1.json';
import { evaluatePilotPreflight, type PilotPreflightSnapshot } from '@/lib/platform/pilot/preflight';

const reviewed = {
  'real-estate-readiness': readiness,
  'client-content-review': contentReview,
};

function readySnapshot(): PilotPreflightSnapshot {
  return {
    latestMigration: '20260924170000',
    admissionEnabled: false,
    workspace: { kind: 'team', status: 'active' },
    activeRoleCounts: { owner: 1, member: 1, reviewer: 1 },
    installs: [
      { appKey: readiness.key, status: 'installed', revision: 2, manifestHashValid: true, manifest: readiness },
      { appKey: contentReview.key, status: 'installed', revision: 1, manifestHashValid: true, manifest: contentReview },
    ],
    budgetConfigured: true,
    connectorDefinitionCount: 0,
    activeProviderReviewCount: 0,
    providerQuotaCount: 0,
  };
}

describe('two-app local pilot preflight', () => {
  it('reports only technical readiness and keeps session/approval checks for the operator', () => {
    const result = evaluatePilotPreflight(readySnapshot(), reviewed);
    expect(result.status).toBe('READY_FOR_OPERATOR_REVIEW');
    expect(result.checks.every((check) => check.status !== 'blocked')).toBe(true);
    expect(result.checks.find((check) => check.id === 'run_admission')?.detail).toContain('will not enable it');
    expect(result.checks.find((check) => check.id === 'provider_quotas')?.status).toBe('operator_review');
    expect(result.reminder).toContain('does not create accounts');
  });

  it('blocks missing roles, old schema, missing budget, or changed/active manifests', () => {
    const base = readySnapshot();
    const snapshot: PilotPreflightSnapshot = {
      ...base,
      latestMigration: '20260923190000',
      activeRoleCounts: { ...base.activeRoleCounts, member: 0 },
      budgetConfigured: false,
      installs: [{ ...base.installs[0], manifest: { ...readiness, capabilities: ['provider.call'] } }, base.installs[1]],
    };
    const result = evaluatePilotPreflight(snapshot, reviewed);
    expect(result.status).toBe('BLOCKED');
    expect(result.checks.filter((check) => check.status === 'blocked').map((check) => check.id)).toEqual(expect.arrayContaining([
      'migration_head', 'workspace_roles', 'workspace_budget', 'app:real-estate-readiness',
    ]));
  });

  it('blocks the previous schema head because workspace member listing is not yet repaired', () => {
    const result = evaluatePilotPreflight({
      ...readySnapshot(), latestMigration: '20260924160000',
    }, reviewed);
    expect(result.status).toBe('BLOCKED');
    expect(result.checks.find((check) => check.id === 'migration_head')).toMatchObject({
      status: 'blocked',
      detail: expect.stringContaining('20260924160000'),
    });
  });

  it('does not treat admission already enabled as authorization', () => {
    const snapshot: PilotPreflightSnapshot = { ...readySnapshot(), admissionEnabled: true };
    const result = evaluatePilotPreflight(snapshot, reviewed);
    expect(result.status).toBe('READY_FOR_OPERATOR_REVIEW');
    expect(result.checks.find((check) => check.id === 'run_admission')?.status).toBe('operator_review');
  });

  it('blocks a workspace with configured connectors or active provider reviews', () => {
    const result = evaluatePilotPreflight({
      ...readySnapshot(), connectorDefinitionCount: 1, activeProviderReviewCount: 1,
    }, reviewed);
    expect(result.status).toBe('BLOCKED');
    expect(result.checks.find((check) => check.id === 'provider_configuration')).toMatchObject({
      status: 'blocked',
      detail: expect.stringContaining('requires no configured provider integration'),
    });
  });
});

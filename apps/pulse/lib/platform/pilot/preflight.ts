import { isDeepStrictEqual } from 'node:util';

export type PilotPreflightSnapshot = Readonly<{
  latestMigration: string | null;
  admissionEnabled: boolean | null;
  workspace: { kind: string; status: string } | null;
  activeRoleCounts: Record<string, number>;
  installs: Array<{
    appKey: string;
    status: string;
    revision: number;
    manifestHashValid: boolean;
    manifest: unknown;
  }>;
  budgetConfigured: boolean;
  connectorDefinitionCount: number;
  activeProviderReviewCount: number;
  providerQuotaCount: number;
}>;

export type PilotPreflightCheck = Readonly<{
  id: string;
  status: 'pass' | 'blocked' | 'operator_review';
  detail: string;
}>;

// Pilot access management depends on the member-list RPC email cast as well as
// the user-layout migration; do not declare readiness before the current head.
const requiredMigration = '20260924170000';
const requiredApps = ['real-estate-readiness', 'client-content-review'] as const;

export function evaluatePilotPreflight(
  snapshot: PilotPreflightSnapshot,
  reviewedManifests: Record<(typeof requiredApps)[number], unknown>,
) {
  const workspace = snapshot.workspace;
  const installs = new Map(snapshot.installs.map((install) => [install.appKey, install]));
  const checks: PilotPreflightCheck[] = [
    {
      id: 'migration_head',
      status: snapshot.latestMigration && snapshot.latestMigration >= requiredMigration ? 'pass' : 'blocked',
      detail: snapshot.latestMigration ? `Local schema head: ${snapshot.latestMigration}.` : 'Could not read the local schema migration head.',
    },
    {
      id: 'workspace',
      status: workspace?.kind === 'team' && workspace.status === 'active' ? 'pass' : 'blocked',
      detail: workspace ? `Workspace kind ${workspace.kind}; status ${workspace.status}.` : 'Workspace was not found.',
    },
    {
      id: 'workspace_roles',
      status: (snapshot.activeRoleCounts.owner ?? 0) + (snapshot.activeRoleCounts.admin ?? 0) > 0 &&
        (snapshot.activeRoleCounts.member ?? 0) > 0 && (snapshot.activeRoleCounts.reviewer ?? 0) > 0 ? 'pass' : 'blocked',
      detail: `Active role counts: owner ${snapshot.activeRoleCounts.owner ?? 0}, admin ${snapshot.activeRoleCounts.admin ?? 0}, member ${snapshot.activeRoleCounts.member ?? 0}, reviewer ${snapshot.activeRoleCounts.reviewer ?? 0}. Identities and participant consent require operator verification.`,
    },
    {
      id: 'workspace_budget',
      status: snapshot.budgetConfigured ? 'pass' : 'blocked',
      detail: snapshot.budgetConfigured ? 'Workspace budget is configured; an operator must verify its approved conservative values.' : 'Workspace budget is not configured.',
    },
    {
      id: 'provider_configuration',
      status: snapshot.connectorDefinitionCount === 0 && snapshot.activeProviderReviewCount === 0 ? 'pass' : 'blocked',
      detail: snapshot.connectorDefinitionCount === 0 && snapshot.activeProviderReviewCount === 0
        ? 'No connector endpoints or active provider-adapter reviews are configured in this workspace.'
        : `Found ${snapshot.connectorDefinitionCount} connector definitions and ${snapshot.activeProviderReviewCount} active provider-adapter reviews; the pilot requires no configured provider integration.`,
    },
    {
      id: 'provider_quotas',
      status: 'operator_review',
      detail: `${snapshot.providerQuotaCount} provider quota policies found; an operator must verify approved conservative limits and confirm no provider integration or dispatch is enabled.`,
    },
    {
      id: 'run_admission',
      status: snapshot.admissionEnabled === false ? 'pass' : 'operator_review',
      detail: snapshot.admissionEnabled === false
        ? 'platform_run admission is disabled; this preflight will not enable it.'
        : snapshot.admissionEnabled === true
          ? 'platform_run admission is enabled; verify explicit approval and restore its prior state after the session.'
          : 'Could not verify platform_run admission; do not start a participant session.',
    },
  ];

  for (const appKey of requiredApps) {
    const install = installs.get(appKey);
    const manifestMatches = Boolean(install && isDeepStrictEqual(install.manifest, reviewedManifests[appKey]));
    const emptyCapabilities = Boolean(install && Array.isArray((install.manifest as { capabilities?: unknown[] }).capabilities) &&
      (install.manifest as { capabilities: unknown[] }).capabilities.length === 0);
    const status = install?.status === 'installed' && install.revision > 0 && install.manifestHashValid && manifestMatches && emptyCapabilities
      ? 'pass' : 'blocked';
    checks.push({
      id: `app:${appKey}`,
      status,
      detail: !install ? 'Reviewed app is not installed in this workspace.'
        : status === 'pass' ? `Installed revision ${install.revision}; exact reviewed manifest and empty capabilities verified.`
          : 'Install is disabled, has an invalid hash/revision, differs from the reviewed fixture, or declares capabilities.',
    });
  }

  const blockedCount = checks.filter((check) => check.status === 'blocked').length;
  const operatorReviewCount = checks.filter((check) => check.status === 'operator_review').length;
  return {
    status: blockedCount ? 'BLOCKED' : operatorReviewCount ? 'READY_FOR_OPERATOR_REVIEW' : 'TECHNICALLY_READY',
    checks,
    reminder: 'Read-only preflight only: it does not create accounts, change quotas, enable run admission, or authorize a participant session.',
  } as const;
}

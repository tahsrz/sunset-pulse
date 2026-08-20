import type {
  DeploymentEnvironment,
  NormalizedHostname,
  ResolvedDomain,
  TenantIdentity,
  TenantPublication,
  TenantResolutionErrorCode,
  TenantScopeId,
} from './contracts';

export type TenantDomainQuery = Readonly<{
  environment: DeploymentEnvironment;
  hostname: NormalizedHostname;
}>;

export type TenantDomainRecord = Readonly<{
  domain: ResolvedDomain;
  identity: TenantIdentity | null;
  publication: TenantPublication | null;
}>;

export interface TenantDomainRegistry {
  findExact(input: TenantDomainQuery): Promise<TenantDomainRecord | null>;
}

export type TenantDomainProjectionCandidate = Readonly<{
  domainId: string;
  environment: DeploymentEnvironment;
  hostname: NormalizedHostname;
  tenantId: TenantScopeId;
  revision: number;
}>;

export interface TenantDomainCandidateProvider {
  findCandidate(input: TenantDomainQuery): Promise<TenantDomainProjectionCandidate | null>;
}

type RegistryErrorCode = Extract<
  TenantResolutionErrorCode,
  'AMBIGUOUS_DOMAIN' | 'DEPENDENCY_UNAVAILABLE'
>;

export class TenantDomainRegistryError extends Error {
  readonly code: RegistryErrorCode;

  constructor(code: RegistryErrorCode, message: string) {
    super(message);
    this.name = 'TenantDomainRegistryError';
    this.code = code;
  }
}

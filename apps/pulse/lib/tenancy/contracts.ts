declare const normalizedHostnameBrand: unique symbol;

export type NormalizedHostname = string & {
  readonly [normalizedHostnameBrand]: true;
};

// Phase one uses the authoritative site_config UUID as the tenant scope ID.
export type TenantScopeId = string;

export type DeploymentEnvironment = 'production' | 'preview' | 'development';

export type DomainKind =
  | 'platform_subdomain'
  | 'custom_domain'
  | 'local_subdomain';

export type DomainStatus =
  | 'pending_verification'
  | 'pending_propagation'
  | 'active'
  | 'suspended'
  | 'revoked';

export type ResolvedDomain = Readonly<{
  domainId: string;
  hostname: NormalizedHostname;
  environment: DeploymentEnvironment;
  kind: DomainKind;
  status: DomainStatus;
  tenantId: TenantScopeId;
  revision: number;
  verifiedAt: string | null;
}>;

export type TenantIdentity = Readonly<{
  tenantId: TenantScopeId;
  agentId: string;
  siteConfigId: string;
  slug: string;
  ownerId: string | null;
}>;

export type TenantPublication = Readonly<{
  status: 'draft' | 'active' | 'suspended';
  reviewStatus: 'not_requested' | 'pending' | 'approved' | 'rejected';
  billingState: 'active' | 'trialing' | 'grace' | 'suspended' | 'unlinked';
  mayRenderPublicly: boolean;
  reason: string;
  effectiveUntil: string | null;
  revision: number;
}>;

export type TenantContext = Readonly<{
  requestId: string;
  domain: ResolvedDomain;
  identity: TenantIdentity;
  publication: TenantPublication;
  source: 'host' | 'custom_domain' | 'local_fixture' | 'internal_test';
  resolvedAt: string;
}>;

export type TenantResolutionErrorCode =
  | 'NO_TENANT_HOST'
  | 'MALFORMED_HOST'
  | 'RESERVED_HOST'
  | 'UNKNOWN_DOMAIN'
  | 'AMBIGUOUS_DOMAIN'
  | 'ENVIRONMENT_MISMATCH'
  | 'DOMAIN_NOT_ACTIVE'
  | 'TENANT_NOT_FOUND'
  | 'STALE_PROJECTION'
  | 'AUTHORITATIVE_MISMATCH'
  | 'CONFIGURATION_ERROR'
  | 'SITE_NOT_PUBLISHED'
  | 'ENTITLEMENT_BLOCKED'
  | 'DEPENDENCY_UNAVAILABLE';

export type TenantResolutionError = Readonly<{
  code: TenantResolutionErrorCode;
  publicStatus: 404 | 503;
  publicMessage: 'Site unavailable.';
  auditReason: string;
}>;

export type TenantResolutionResult =
  | Readonly<{ ok: true; context: TenantContext }>
  | Readonly<{ ok: false; error: TenantResolutionError }>;

export interface TenantContextResolver {
  resolve(request: Request): Promise<TenantResolutionResult>;
  require(request: Request): Promise<TenantContext>;
}

export type TenantCapability =
  | 'site:read_public'
  | 'site:edit'
  | 'site:review'
  | 'listing:assign'
  | 'lead:read'
  | 'lead:update'
  | 'notification:manage';

export type TenantAccess = Readonly<{
  actorId: string;
  tenantId: TenantScopeId;
  agentId: string;
  role: 'realtor' | 'operator' | 'admin';
  capabilities: ReadonlySet<TenantCapability>;
}>;

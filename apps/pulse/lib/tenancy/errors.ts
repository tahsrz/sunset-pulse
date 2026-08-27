import type {
  TenantResolutionError,
  TenantResolutionErrorCode,
} from './contracts';

const DEPENDENCY_ERRORS = new Set<TenantResolutionErrorCode>([
  'CONFIGURATION_ERROR',
  'DEPENDENCY_UNAVAILABLE',
]);

export function createTenantResolutionError(
  code: TenantResolutionErrorCode,
  auditReason: string
): TenantResolutionError {
  return Object.freeze({
    code,
    publicStatus: DEPENDENCY_ERRORS.has(code) ? 503 : 404,
    publicMessage: 'Site unavailable.',
    auditReason,
  });
}

export class TenantContextRequiredError extends Error {
  readonly resolution: TenantResolutionError;

  constructor(resolution: TenantResolutionError) {
    super(resolution.publicMessage);
    this.name = 'TenantContextRequiredError';
    this.resolution = resolution;
  }
}

const PRODUCTION_DB_CONFIRMATION = 'I_UNDERSTAND_THIS_CAN_DELETE_PRODUCTION_DATA';
const MAX_BACKUP_AGE_MS = 24 * 60 * 60 * 1000;

function isProductionRuntime() {
  return process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
}

function looksLikeProductionMongoUri(uri) {
  if (!uri || typeof uri !== 'string') return false;

  let searchable = uri.toLowerCase();
  try {
    const parsed = new URL(uri);
    searchable = `${parsed.hostname}${parsed.pathname}`.toLowerCase();
  } catch {
    // Keep the original string for non-standard Mongo URI parsing.
  }

  return /\bprod\b|production|live-db|primary-db/.test(searchable);
}

function assertSafeMongoConnection(uri = process.env.MONGODB_URI) {
  if (!uri) {
    throw new Error('MONGODB_URI is required.');
  }

  const explicitOverride = process.env.ALLOW_PRODUCTION_DB_CONNECTION === 'true';
  if (!isProductionRuntime() && looksLikeProductionMongoUri(uri) && !explicitOverride) {
    throw new Error(
      'Refusing to connect a non-production runtime to a production-looking MongoDB URI. ' +
      'Set ALLOW_PRODUCTION_DB_CONNECTION=true only for an intentional, reviewed operation.'
    );
  }
}

function assertTestEndpointAllowed(endpointName) {
  if (isProductionRuntime() && process.env.ENABLE_TEST_ENDPOINTS_IN_PRODUCTION !== 'true') {
    const error = new Error(`${endpointName} is disabled in production.`);
    error.status = 404;
    throw error;
  }
}

function assertDestructiveDbOperationAllowed({ operation, scope }) {
  const productionOverride = process.env.ALLOW_PRODUCTION_DESTRUCTIVE_DB_ACTIONS === 'true';
  const confirmation = process.env.CONFIRM_PRODUCTION_DESTRUCTIVE_ACTION;
  const backupReference = process.env.PRODUCTION_BACKUP_REFERENCE;
  const backupCompletedAt = process.env.PRODUCTION_BACKUP_COMPLETED_AT;

  if (isProductionRuntime() && (!productionOverride || confirmation !== PRODUCTION_DB_CONFIRMATION)) {
    throw new Error(
      `Blocked destructive database operation "${operation}" on "${scope}" in production. ` +
      `Required confirmation: ${PRODUCTION_DB_CONFIRMATION}`
    );
  }

  if (isProductionRuntime()) {
    if (!backupReference || !backupCompletedAt) {
      throw new Error(
        `Blocked destructive database operation "${operation}" on "${scope}" in production. ` +
        'A backup must be completed first. Set PRODUCTION_BACKUP_REFERENCE and PRODUCTION_BACKUP_COMPLETED_AT.'
      );
    }

    const backupTime = Date.parse(backupCompletedAt);
    if (!Number.isFinite(backupTime)) {
      throw new Error('PRODUCTION_BACKUP_COMPLETED_AT must be an ISO timestamp.');
    }

    if (Date.now() - backupTime > MAX_BACKUP_AGE_MS) {
      throw new Error(
        `Blocked destructive database operation "${operation}" on "${scope}" in production. ` +
        'The backup is older than 24 hours.'
      );
    }
  }
}

function assertNonEmptyDeleteFilter(filter, operation) {
  if (!filter || typeof filter !== 'object' || Array.isArray(filter) || Object.keys(filter).length === 0) {
    throw new Error(
      `Blocked broad destructive database operation "${operation}". ` +
      'Use a non-empty, scoped filter or add an explicit production destructive confirmation guard.'
    );
  }
}

module.exports = {
  MAX_BACKUP_AGE_MS,
  PRODUCTION_DB_CONFIRMATION,
  assertDestructiveDbOperationAllowed,
  assertNonEmptyDeleteFilter,
  assertSafeMongoConnection,
  assertTestEndpointAllowed,
  isProductionRuntime,
  looksLikeProductionMongoUri,
};

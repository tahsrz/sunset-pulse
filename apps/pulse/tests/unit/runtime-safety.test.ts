import { describe, expect, it, afterEach } from 'vitest';
import {
  assertDestructiveDbOperationAllowed,
  assertNonEmptyDeleteFilter,
  assertSafeMongoConnection,
  assertTestEndpointAllowed,
  PRODUCTION_DB_CONFIRMATION,
} from '@/lib/core/runtimeSafety';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

function setNodeEnv(value: NodeJS.ProcessEnv['NODE_ENV']) {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

describe('runtime database safety guards', () => {
  it('blocks production-looking Mongo URIs from non-production runtimes without an override', () => {
    setNodeEnv('development');
    process.env.VERCEL_ENV = 'preview';
    delete process.env.ALLOW_PRODUCTION_DB_CONNECTION;

    expect(() => assertSafeMongoConnection('mongodb+srv://user:pass@cluster.example.com/sunset-prod'))
      .toThrow(/Refusing to connect/);
  });

  it('allows production-looking Mongo URIs when an explicit connection override is set', () => {
    setNodeEnv('development');
    process.env.ALLOW_PRODUCTION_DB_CONNECTION = 'true';

    expect(() => assertSafeMongoConnection('mongodb+srv://user:pass@cluster.example.com/sunset-prod'))
      .not.toThrow();
  });

  it('hides test endpoints in production unless explicitly enabled', () => {
    setNodeEnv('production');
    delete process.env.ENABLE_TEST_ENDPOINTS_IN_PRODUCTION;

    expect(() => assertTestEndpointAllowed('test endpoint')).toThrow(/disabled in production/);
  });

  it('blocks destructive production DB operations without the exact confirmation phrase', () => {
    setNodeEnv('production');
    process.env.ALLOW_PRODUCTION_DESTRUCTIVE_DB_ACTIONS = 'true';
    process.env.CONFIRM_PRODUCTION_DESTRUCTIVE_ACTION = 'wrong';
    process.env.PRODUCTION_BACKUP_REFERENCE = 'mongodb-snapshot-123';
    process.env.PRODUCTION_BACKUP_COMPLETED_AT = new Date().toISOString();

    expect(() => assertDestructiveDbOperationAllowed({
      operation: 'deleteMany',
      scope: 'orders',
    })).toThrow(/Blocked destructive database operation/);
  });

  it('blocks destructive production DB operations without a backup reference', () => {
    setNodeEnv('production');
    process.env.ALLOW_PRODUCTION_DESTRUCTIVE_DB_ACTIONS = 'true';
    process.env.CONFIRM_PRODUCTION_DESTRUCTIVE_ACTION = PRODUCTION_DB_CONFIRMATION;
    delete process.env.PRODUCTION_BACKUP_REFERENCE;
    delete process.env.PRODUCTION_BACKUP_COMPLETED_AT;

    expect(() => assertDestructiveDbOperationAllowed({
      operation: 'deleteMany',
      scope: 'orders',
    })).toThrow(/backup must be completed first/);
  });

  it('blocks destructive production DB operations when the backup is stale', () => {
    setNodeEnv('production');
    process.env.ALLOW_PRODUCTION_DESTRUCTIVE_DB_ACTIONS = 'true';
    process.env.CONFIRM_PRODUCTION_DESTRUCTIVE_ACTION = PRODUCTION_DB_CONFIRMATION;
    process.env.PRODUCTION_BACKUP_REFERENCE = 'mongodb-snapshot-123';
    process.env.PRODUCTION_BACKUP_COMPLETED_AT = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();

    expect(() => assertDestructiveDbOperationAllowed({
      operation: 'deleteMany',
      scope: 'orders',
    })).toThrow(/older than 24 hours/);
  });

  it('allows destructive production DB operations only with override envs and a fresh backup', () => {
    setNodeEnv('production');
    process.env.ALLOW_PRODUCTION_DESTRUCTIVE_DB_ACTIONS = 'true';
    process.env.CONFIRM_PRODUCTION_DESTRUCTIVE_ACTION = PRODUCTION_DB_CONFIRMATION;
    process.env.PRODUCTION_BACKUP_REFERENCE = 'mongodb-snapshot-123';
    process.env.PRODUCTION_BACKUP_COMPLETED_AT = new Date().toISOString();

    expect(() => assertDestructiveDbOperationAllowed({
      operation: 'deleteMany',
      scope: 'orders',
    })).not.toThrow();
  });

  it('blocks empty delete filters', () => {
    expect(() => assertNonEmptyDeleteFilter({}, 'Order.deleteMany')).toThrow(/Blocked broad destructive/);
    expect(() => assertNonEmptyDeleteFilter(null, 'Order.deleteMany')).toThrow(/Blocked broad destructive/);
  });
});

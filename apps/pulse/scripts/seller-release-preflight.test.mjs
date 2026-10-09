import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { inspectSellerReleaseSources, planPendingSellerMigrations, requiredSellerReleasePaths } from './seller-release-preflight.mjs';

const bytes = Buffer.from('reviewed fixture\r\n');
const fixture = () => ({ files: requiredSellerReleasePaths.map((path) => ({ path, sha256: createHash('sha256').update(bytes).digest('hex') })) });
const names = requiredSellerReleasePaths.filter((path) => path.includes('/migrations/')).map((path) => path.split('/').at(-1));

test('verifies the whole packet against raw file bytes and reports ordered migrations', async () => {
  const readPaths = [];
  const result = await inspectSellerReleaseSources(fixture(), [...names].reverse(), async (path) => { readPaths.push(path); return bytes; });
  assert.equal(result.verifiedSourceCount, 23);
  assert.deepEqual(result.inventory.map((item) => item.file), names);
  assert.deepEqual(readPaths, requiredSellerReleasePaths);
});

test('rejects changed source bytes, including changed line endings', async () => {
  await assert.rejects(inspectSellerReleaseSources(fixture(), names, async () => Buffer.from('reviewed fixture\n')), /fingerprints differ/);
});

test('rejects omitted and duplicate manifest entries before any source read', async () => {
  const omitted = fixture(); omitted.files.pop();
  const duplicate = fixture(); duplicate.files[1] = duplicate.files[0];
  const reader = async () => { throw new Error('Source reader must not be reached'); };
  await assert.rejects(inspectSellerReleaseSources(omitted, names, reader), /complete 23-file/);
  await assert.rejects(inspectSellerReleaseSources(duplicate, names, reader), /duplicate/);
});

test('rejects traversal and unreviewed files before reading them', async () => {
  const manifest = fixture(); manifest.files[0].path = '../.env.local';
  let called = false;
  await assert.rejects(inspectSellerReleaseSources(manifest, names, async () => { called = true; return bytes; }), /unreviewed/);
  assert.equal(called, false);
});

test('rejects missing required migrations and duplicate migration versions', async () => {
  await assert.rejects(inspectSellerReleaseSources(fixture(), names.slice(1), async () => bytes), /Required migration is missing/);
  await assert.rejects(inspectSellerReleaseSources(fixture(), [...names, `${names[0].slice(0, 14)}_other.sql`], async () => bytes), /duplicate versions/);
});

test('plans the entire pending history, including earlier dependencies outside the compatibility tail', () => {
  const older = '20260901000000_existing_dependency.sql';
  const inventory = [older, ...names];
  assert.deepEqual(planPendingSellerMigrations(inventory, []).map((item) => item.file), inventory);
  assert.deepEqual(planPendingSellerMigrations(inventory, [older.slice(0, 14)]).map((item) => item.file), names);
  assert.deepEqual(planPendingSellerMigrations(inventory, inventory.map((name) => name.slice(0, 14))), []);
});

test('rejects unknown applied migrations and holes instead of treating latest version as enough', () => {
  assert.throws(() => planPendingSellerMigrations(names, ['20000101000000']), /absent from this repository/);
  assert.throws(() => planPendingSellerMigrations(names, [names[1].slice(0, 14)]), /gap/);
});

test('rejects invalid or duplicate applied versions and invalid migration filenames', () => {
  for (const history of [null, [123], ['bad'], [names[0].slice(0, 14), names[0].slice(0, 14)]]) {
    assert.throws(() => planPendingSellerMigrations(names, history), /unique 8- or 14-digit/);
  }
  assert.throws(() => planPendingSellerMigrations(['../migration.sql'], []), /invalid filename/);
});

test('includes legacy date-only migrations and matches their exported versions exactly', () => {
  const inventory = ['20260403_workflow_init.sql', '20260404_eight_by_eight.sql', ...names];
  assert.deepEqual(planPendingSellerMigrations(inventory, ['20260403']).map((item) => item.file), inventory.slice(1));
  assert.throws(() => planPendingSellerMigrations(inventory, ['20260403000000']), /absent from this repository/);
});

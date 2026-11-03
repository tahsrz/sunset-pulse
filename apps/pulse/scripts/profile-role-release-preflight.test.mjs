import assert from 'node:assert/strict';
import {test} from 'node:test';
import {spawnSync} from 'node:child_process';
import {mkdtemp,mkdir,rmdir,unlink,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {approvedAccountHashes,buildProfileRoleAuditSql,fingerprintRoleSource,inspectProfileRoleRelease,readProfileRoleSources,roleAuditCliEnv} from './profile-role-release-preflight.mjs';

const sources={migrations:[{version:'20261028120000',file:'20261028120000_calendar.sql',sha256:'c'.repeat(64)},
  {version:'20261103150000',file:'20261103150000_guard.sql',sha256:'d'.repeat(64)}],
functions:{handle_new_user:'a'.repeat(64),guard_profile_role_assignment:'b'.repeat(64)}};
const snapshot=()=>({schemaVersion:1,checkedAt:'2026-11-03T20:00:00Z',appliedVersions:sources.migrations.map(item=>item.version),
  roleCounts:{consumer:1,operator:1},privilegedTotal:1,approvedPrivilegedCount:1,unapprovedPrivilegedCount:0,
  functions:{handle_new_user:{bodySha256:sources.functions.handle_new_user,securityDefiner:true,searchPathPinned:true,trustedOwner:true},
    guard_profile_role_assignment:{bodySha256:sources.functions.guard_profile_role_assignment,securityDefiner:false,searchPathPinned:true,trustedOwner:true}},
  guardTrigger:{enabled:'O',eventBits:23,functionMatches:true}});
const inspect=value=>inspectProfileRoleRelease(value,sources,1);
test('CLI receives OS/auth settings without inherited project, database or provider overrides',()=>{
  const env=roleAuditCliEnv({PATH:'local-bin',USERPROFILE:'local-user',SUPABASE_ACCESS_TOKEN:'test-auth-placeholder',
    SUPABASE_PROJECT_ID:'different-project',SUPABASE_DB_URL:'different-database',DATABASE_URL:'different-database',OPENAI_API_KEY:'provider-placeholder'});
  assert.deepEqual(env,{PATH:'local-bin',USERPROFILE:'local-user',SUPABASE_ACCESS_TOKEN:'test-auth-placeholder',SUPABASE_TELEMETRY_DISABLED:'1'});
});
test('routine fingerprints normalize checkout line endings without discarding literal carriage returns',()=>{
  const body="BEGIN\n RETURN 'value';\nEND;";
  assert.equal(fingerprintRoleSource(body),fingerprintRoleSource(body.replaceAll('\n','\r\n')));
  assert.notEqual(fingerprintRoleSource("BEGIN RETURN 'a\rb'; END;"),fingerprintRoleSource("BEGIN RETURN 'ab'; END;"));
});

test('approved identities normalize without entering SQL or reports as addresses',()=>{
  const hashes=approvedAccountHashes(["  O'Neil@Example.test "]);
  assert.deepEqual(hashes,approvedAccountHashes(["o'neil@example.test"]));assert.match(hashes[0],/^[a-f0-9]{64}$/);
  const query=buildProfileRoleAuditSql(hashes);assert(query.startsWith('BEGIN READ ONLY;'));assert(query.endsWith('ROLLBACK;'));
  assert(!query.includes('example.test'));assert(!query.includes("'email',"));assert(!query.includes("'id',"));
});
test('invalid or duplicate approval input and SQL fingerprint injection are rejected',()=>{
  for(const value of [[],['not an address'],['one@example.test','ONE@example.test']]) assert.throws(()=>approvedAccountHashes(value));
  assert.throws(()=>buildProfileRoleAuditSql(["');DELETE FROM public.profiles;--"]));
});
test('database pass remains separate from deployment readiness and strips provider extras',()=>{
  const value=snapshot();value.accountEmails=['PRIVATE SENTINEL'];
  const report=inspect(value);assert.equal(report.status,'DATABASE_CHECKS_PASS');assert.match(report.scope,/deployment.*not verified/);
  assert(!JSON.stringify(report).includes('PRIVATE SENTINEL'));assert.equal(report.checks.length,5);
});
test('pending and unknown migration history blocks release even when routines match',()=>{
  const value=snapshot();value.appliedVersions=['20261028120000','20990101000000'];
  const report=inspect(value);assert.equal(report.status,'BLOCKED');assert.deepEqual(report.pendingMigrations,[sources.migrations[1]]);
  assert.deepEqual(report.unknownRemoteVersions,['20990101000000']);
});
test('recorded migration alone does not prove the routine body is repaired',()=>{
  const value=snapshot();value.functions.handle_new_user.bodySha256='f'.repeat(64);
  assert.equal(inspect(value).checks.find(check=>check.id==='handle_new_user').passed,false);
});
for(const property of ['securityDefiner','searchPathPinned','trustedOwner']) test(`unsafe guard ${property} blocks release`,()=>{
  const value=snapshot();value.functions.guard_profile_role_assignment[property]=property==='securityDefiner';
  assert.equal(inspect(value).status,'BLOCKED');
});
for(const patch of [null,{enabled:'D'},{enabled:'R'},{eventBits:22},{functionMatches:false}]) test(`missing or unsafe trigger blocks: ${JSON.stringify(patch)}`,()=>{
  const value=snapshot();value.guardTrigger=patch?{...value.guardTrigger,...patch}:null;assert.equal(inspect(value).status,'BLOCKED');
});
test('unapproved privileged profiles block release without returning identities',()=>{
  const value=snapshot();value.roleCounts.admin=1;value.privilegedTotal=2;value.unapprovedPrivilegedCount=1;
  const report=inspect(value);assert.equal(report.status,'BLOCKED');assert.deepEqual(report.privilegedProfiles,{total:2,approved:1,unapproved:1});
});
test('malformed counts, unexpected role values and duplicate history fail closed',()=>{
  for(const edit of [v=>v.approvedPrivilegedCount=2,v=>v.roleCounts.admin=-1,v=>v.roleCounts['PRIVATE SENTINEL']=1,
    v=>v.appliedVersions.push(v.appliedVersions[0]),v=>v.checkedAt='invalid']) {
    const value=snapshot();edit(value);assert.throws(()=>inspect(value));
  }
});
test('current role sources yield unique migration inventory and both body hashes',async()=>{
  const source=await readProfileRoleSources();assert(source.migrations.some(item=>item.version==='20261103150000'));
  assert.equal(new Set(source.migrations.map(item=>item.version)).size,source.migrations.length);
  for(const hash of Object.values(source.functions)) assert.match(hash,/^[a-f0-9]{64}$/);
});
test('CLI refuses a different linked project before reading approvals or sending a query',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'pulse-role-preflight-')),linked=join(directory,'supabase','.temp');
  await mkdir(linked,{recursive:true});const ref=join(linked,'project-ref');await writeFile(ref,'a'.repeat(20));
  try {
    const result=spawnSync(process.execPath,[fileURLToPath(new URL('./profile-role-release-preflight.mjs',import.meta.url)),
      '--expected-project-ref','b'.repeat(20),'--linked-project-dir',directory,'--approved-accounts-file',join(directory,'does-not-exist.json')],{encoding:'utf8',windowsHide:true});
    assert.equal(result.status,1);assert.match(result.stderr,/linked project does not match/);assert.equal(result.stdout,'');
  } finally {await unlink(ref);await rmdir(linked);await rmdir(join(directory,'supabase'));await rmdir(directory);}
});

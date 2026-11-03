import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {approvedAccountHashes,buildProfileRoleAuditSql,inspectProfileRoleRelease,readProfileRoleSources} from './profile-role-release-preflight.mjs';

/** Mutation fixtures run only inside the existing generated local acceptance stack. */
export async function profileRolePreflightAcceptance({sql,stack}) {
  assert.match(stack,/^pulse_auth_[a-f0-9]{8}$/);
  const sources=await readProfileRoleSources();
  const inspect=async emails=>inspectProfileRoleRelease(JSON.parse(await sql(buildProfileRoleAuditSql(approvedAccountHashes(emails)))),sources,emails.length);
  assert.equal((await inspect(['owner@example.test'])).status,'DATABASE_CHECKS_PASS');
  const first=randomUUID(),second=randomUUID();
  try {
    await sql(`INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
      ('${first}','owner@example.test','{}'),('${second}','other@example.test','{}');
      UPDATE public.profiles SET role='operator' WHERE id IN ('${first}','${second}');`);
    const unapproved=await inspect(['owner@example.test']);
    assert.equal(unapproved.status,'BLOCKED');assert.deepEqual(unapproved.privilegedProfiles,{total:2,approved:1,unapproved:1});
    assert.equal((await inspect(['owner@example.test','other@example.test'])).status,'DATABASE_CHECKS_PASS');
    await sql('ALTER TABLE public.profiles DISABLE TRIGGER profiles_role_assignment_guard;');
    assert.equal((await inspect(['owner@example.test','other@example.test'])).checks.find(check=>check.id==='role_guard_trigger').passed,false);
  } finally {
    await sql(`ALTER TABLE public.profiles ENABLE TRIGGER profiles_role_assignment_guard;
      DELETE FROM auth.users WHERE id IN ('${first}','${second}');`);
  }
  console.log('PASS: four real database preflight scenarios: repaired source hashes, approved/unapproved aggregates, matching approvals and disabled-guard detection.');
}

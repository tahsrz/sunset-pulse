import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {command} from './docker-acceptance.mjs';
import {approvedAccountHashes,buildProfileRoleAuditSql,inspectProfileRoleRelease,readProfileRoleSources} from './profile-role-release-preflight.mjs';

/** Mutation fixtures run only inside the existing generated local acceptance stack. */
export async function profileRolePreflightAcceptance({sql,authSql,stack}) {
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
    await sql('ALTER TABLE public.profiles ENABLE TRIGGER profiles_role_assignment_guard;');
    await authSql('ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;');
    assert.equal((await inspect(['owner@example.test','other@example.test'])).checks.find(check=>check.id==='signup_trigger').passed,false);
    await authSql('ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;');
    for(const events of ["INSERT OR UPDATE OF full_name", "INSERT OR UPDATE"]) {
      const condition=events==='INSERT OR UPDATE'?" WHEN (NEW.role <> 'admin')":'';
      await sql(`DROP TRIGGER profiles_role_assignment_guard ON public.profiles;
        CREATE TRIGGER profiles_role_assignment_guard BEFORE ${events} ON public.profiles
        FOR EACH ROW${condition} EXECUTE FUNCTION public.guard_profile_role_assignment();`);
      assert.equal((await inspect(['owner@example.test','other@example.test'])).checks.find(check=>check.id==='role_guard_trigger').passed,false);
    }
  } finally {
    await sql(`DROP TRIGGER IF EXISTS profiles_role_assignment_guard ON public.profiles;
      CREATE TRIGGER profiles_role_assignment_guard BEFORE INSERT OR UPDATE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.guard_profile_role_assignment();
      DELETE FROM auth.users WHERE id IN ('${first}','${second}');`);
    await authSql('ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;');
  }
  assert.equal((await inspect(['owner@example.test'])).status,'DATABASE_CHECKS_PASS');
  console.log('PASS: seven real database preflight scenarios and restored baseline: source hashes, aggregate approvals, disabled guard/signup triggers, column-restricted and conditional guards.');
}

async function main(args) {
  assert.equal(args.length,2,'Use the generated disposable acceptance runner.');assert.equal(args[0],'--stack');
  const stack=args[1];assert.match(stack,/^pulse_auth_[a-f0-9]{8}$/,'Use the generated disposable acceptance runner.');
  const container=`supabase_db_${stack}`;
  const entries=JSON.parse(await command('docker',['inspect',container,'--format','{{json .Config.Env}}']));
  const password=entries.find(value=>value.startsWith('POSTGRES_PASSWORD='))?.slice('POSTGRES_PASSWORD='.length);
  assert(password && !/[\r\n]/.test(password),'Generated local database credentials are unavailable.');
  // The Auth owner cannot use postgres's peer-authenticated socket. Its generated
  // container password stays in memory and is never printed or written to a file.
  const localSql=(input,user)=>command('docker',['exec','-i',...(user==='postgres'?[]:['-e','PGPASSWORD']),container,'psql',
    ...(user==='postgres'?[]:['-h','127.0.0.1']),'-X','-qAt','-U',user,'-d','postgres','-v','ON_ERROR_STOP=1'],
    {env:{...process.env,PGPASSWORD:password},input:`SET statement_timeout='20s';\n${input}`});
  const sql=input=>localSql(input,'postgres'),authSql=input=>localSql(input,'supabase_auth_admin');
  const packet=await readFile(new URL('../supabase/tests/database/profile_role_assignment.sql',import.meta.url),'utf8');
  const result=await sql(`SET search_path=public,extensions;\n${packet}`);
  assert(!/^not ok\b/m.test(result),`Role database assertions failed:\n${result}`);assert.match(result,/\b1\.\.18\b/);
  console.log('PASS: 18 role database assertions.');
  await profileRolePreflightAcceptance({sql,authSql,stack});
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) await main(process.argv.slice(2));

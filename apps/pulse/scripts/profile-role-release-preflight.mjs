import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,readdir,unlink,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {command} from './docker-acceptance.mjs';

const appRoot=fileURLToPath(new URL('..',import.meta.url));
export const roleMigrationVersion='20261103150000';
const routineNames=['handle_new_user','guard_profile_role_assignment'];
class PreflightError extends Error {}
const sha=value=>createHash('sha256').update(value).digest('hex');
export const fingerprintRoleSource=body=>sha(body.replaceAll('\r\n','\n').replace(/^[ \n\t]+|[ \n\t]+$/g,''));
export const roleAuditCliEnv=env=>({...Object.fromEntries(Object.entries(env).filter(([key])=>
  /^(?:PATH|PATHEXT|SystemRoot|windir|ComSpec|TEMP|TMP|APPDATA|LOCALAPPDATA|USERPROFILE|HOMEDRIVE|HOMEPATH|ProgramData|PROGRAMFILES|PROGRAMFILES\(X86\)|HTTP_PROXY|HTTPS_PROXY|NO_PROXY|ALL_PROXY|SSL_CERT_FILE|SSL_CERT_DIR|NODE_EXTRA_CA_CERTS|SUPABASE_ACCESS_TOKEN)$/i.test(key))),SUPABASE_TELEMETRY_DISABLED:'1'});

export function approvedAccountHashes(emails) {
  assert(Array.isArray(emails) && emails.length>0 && emails.length<=20,'Provide 1 to 20 approved account addresses.');
  const normalized=emails.map(email=>{
    assert(typeof email==='string' && email.length<=254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),'Approved account list contains an invalid address.');
    return email.trim().toLowerCase();
  });
  assert.equal(new Set(normalized).size,normalized.length,'Approved account list contains duplicates.');
  return normalized.map(sha).sort();
}

export async function readProfileRoleSources() {
  const directory=join(appRoot,'supabase','migrations');
  const files=(await readdir(directory)).filter(file=>file.endsWith('.sql')).sort();
  const migrations=await Promise.all(files.map(async file=>{
    const match=/^(\d{8}|\d{14})_[a-z0-9_]+\.sql$/.exec(file);assert(match,'Invalid migration filename.');
    return {version:match[1],file,sha256:sha((await readFile(join(directory,file),'utf8')).replaceAll('\r\n','\n'))};
  }));
  assert.equal(new Set(migrations.map(item=>item.version)).size,migrations.length,'Duplicate migration versions.');
  const migration=migrations.find(item=>item.version===roleMigrationVersion);assert(migration,'Role migration source is missing.');
  const source=await readFile(join(directory,migration.file),'utf8');
  const functions=Object.fromEntries(routineNames.map(name=>{
    const start=source.indexOf(`FUNCTION public.${name}()`);assert(start>=0,'Expected role routine source is missing.');
    const body=/AS\s+\$\$([\s\S]*?)\$\$/i.exec(source.slice(start));assert(body,'Expected role routine body is missing.');
    return [name,fingerprintRoleSource(body[1])];
  }));
  return {migrations,functions};
}

/** Fixed aggregate-only SELECTs. No account email, ID, or routine body is returned. */
export function buildProfileRoleAuditSql(hashes) {
  assert(Array.isArray(hashes) && hashes.length>0 && hashes.length<=20 && hashes.every(hash=>/^[a-f0-9]{64}$/.test(hash)),'Invalid approved-account fingerprints.');
  const approved=`ARRAY[${hashes.map(hash=>`'${hash}'`).join(',')}]::text[]`;
  const emailHash="encode(sha256(convert_to(lower(btrim(email)),'UTF8')),'hex')";
  return `BEGIN READ ONLY;
SET LOCAL statement_timeout='8s';
SELECT json_build_object(
 'schemaVersion',1,'checkedAt',now(),
 'appliedVersions',(SELECT coalesce(json_agg(version ORDER BY version),'[]'::json) FROM supabase_migrations.schema_migrations),
 'roleCounts',(SELECT coalesce(json_object_agg(label,total),'{}'::json) FROM (
   SELECT CASE WHEN role IN ('consumer','realtor','operator','admin') THEN role ELSE 'other' END label,count(*) total FROM public.profiles GROUP BY 1) counts),
 'privilegedTotal',(SELECT count(*) FROM public.profiles WHERE role IN ('operator','admin')),
 'approvedPrivilegedCount',(SELECT count(*) FROM public.profiles WHERE role IN ('operator','admin') AND ${emailHash}=ANY(${approved})),
 'unapprovedPrivilegedCount',(SELECT count(*) FROM public.profiles WHERE role IN ('operator','admin') AND coalesce(${emailHash},'')<>ALL(${approved})),
 'functions',(SELECT coalesce(json_object_agg(p.proname,json_build_object(
   'bodySha256',encode(sha256(convert_to(btrim(replace(p.prosrc,chr(13)||chr(10),chr(10)),E' \\n\\t'),'UTF8')),'hex'),
   'securityDefiner',p.prosecdef,'searchPathPinned',ARRAY['search_path=public']<@coalesce(p.proconfig,'{}'::text[]),
   'trustedOwner',r.rolsuper OR r.rolbypassrls)), '{}'::json)
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_roles r ON r.oid=p.proowner
   WHERE n.nspname='public' AND p.pronargs=0 AND p.proname IN ('handle_new_user','guard_profile_role_assignment')),
 'guardTrigger',(SELECT json_build_object('enabled',t.tgenabled,'eventBits',t.tgtype,
   'functionMatches',t.tgfoid=to_regprocedure('public.guard_profile_role_assignment()'),
   'unconditional',t.tgqual IS NULL,'allColumns',t.tgattr::text='','noArguments',t.tgnargs=0)
   FROM pg_trigger t WHERE t.tgrelid=to_regclass('public.profiles') AND NOT t.tgisinternal AND t.tgname='profiles_role_assignment_guard')
 ,'signupTrigger',(SELECT json_build_object('enabled',t.tgenabled,'eventBits',t.tgtype,
   'functionMatches',t.tgfoid=to_regprocedure('public.handle_new_user()'),
   'unconditional',t.tgqual IS NULL,'noArguments',t.tgnargs=0)
   FROM pg_trigger t WHERE t.tgrelid=to_regclass('auth.users') AND NOT t.tgisinternal AND t.tgname='on_auth_user_created')
) AS audit;
ROLLBACK;`;
}

export function inspectProfileRoleRelease(snapshot,sources,approvedCount) {
  assert(Number.isInteger(approvedCount) && approvedCount>0 && approvedCount<=20,'Invalid approved account count.');
  assert(snapshot && snapshot.schemaVersion===1 && Number.isFinite(Date.parse(snapshot.checkedAt)),'Invalid audit snapshot.');
  assert(Array.isArray(snapshot.appliedVersions) && snapshot.appliedVersions.every(version=>typeof version==='string' && /^\d{8}(?:\d{6})?$/.test(version)),'Invalid applied migration inventory.');
  assert.equal(new Set(snapshot.appliedVersions).size,snapshot.appliedVersions.length,'Duplicate applied migration versions.');
  const integer=value=>Number.isSafeInteger(value) && value>=0;
  assert(snapshot.roleCounts && Object.entries(snapshot.roleCounts).every(([role,total])=>['consumer','realtor','operator','admin','other'].includes(role) && integer(total)),'Invalid role counts.');
  for(const key of ['privilegedTotal','approvedPrivilegedCount','unapprovedPrivilegedCount']) assert(integer(snapshot[key]),'Invalid privilege counts.');
  assert.equal(snapshot.privilegedTotal,snapshot.approvedPrivilegedCount+snapshot.unapprovedPrivilegedCount,'Inconsistent approval counts.');
  assert.equal(snapshot.privilegedTotal,(snapshot.roleCounts.operator||0)+(snapshot.roleCounts.admin||0),'Inconsistent role counts.');
  assert(snapshot.functions && typeof snapshot.functions==='object','Invalid routine snapshot.');
  const pending=sources.migrations.filter(item=>!snapshot.appliedVersions.includes(item.version));
  const unknown=snapshot.appliedVersions.filter(version=>!sources.migrations.some(item=>item.version===version));
  const checks=[
    {id:'migration_history',passed:pending.length===0 && unknown.length===0},
    {id:'approved_privileged_profiles',passed:snapshot.unapprovedPrivilegedCount===0 && !snapshot.roleCounts.other},
  ];
  for(const name of routineNames) {
    const routine=snapshot.functions[name];
    checks.push({id:name,passed:Boolean(routine && routine.bodySha256===sources.functions[name] && routine.securityDefiner===(name==='handle_new_user') && routine.searchPathPinned===true && routine.trustedOwner===true)});
  }
  const trigger=snapshot.guardTrigger;
  checks.push({id:'role_guard_trigger',passed:Boolean(trigger && ['O','A'].includes(trigger.enabled) && trigger.eventBits===23 && trigger.functionMatches===true && trigger.unconditional===true && trigger.allColumns===true && trigger.noArguments===true)});
  const signup=snapshot.signupTrigger;
  checks.push({id:'signup_trigger',passed:Boolean(signup && ['O','A'].includes(signup.enabled) && signup.eventBits===5 && signup.functionMatches===true && signup.unconditional===true && signup.noArguments===true)});
  return {checkedAt:snapshot.checkedAt,status:checks.every(check=>check.passed)?'DATABASE_CHECKS_PASS':'BLOCKED',
    scope:'Read-only database aggregates and source checks only. Callback deployment and environment permissions are not verified.',
    approvedAddressesChecked:approvedCount,roleCounts:snapshot.roleCounts,
    privilegedProfiles:{total:snapshot.privilegedTotal,approved:snapshot.approvedPrivilegedCount,unapproved:snapshot.unapprovedPrivilegedCount},
    migrationCounts:{source:sources.migrations.length,applied:snapshot.appliedVersions.length,pending:pending.length,unknown:unknown.length},
    checks,pendingMigrations:pending,unknownRemoteVersions:unknown};
}

async function main(args) {
  const options={};
  for(let index=0;index<args.length;index+=2) {
    assert(['--expected-project-ref','--linked-project-dir','--approved-accounts-file'].includes(args[index]) && args[index+1] && !args[index+1].startsWith('--') && !options[args[index]],'Provide each required preflight option once.');
    options[args[index]]=args[index+1];
  }
  const expected=options['--expected-project-ref'];assert(typeof expected==='string' && /^[a-z0-9]{20}$/.test(expected),'An explicit 20-character project ref is required.');
  assert(options['--linked-project-dir'] && options['--approved-accounts-file'],'Provide the linked project directory and approved accounts file.');
  const projectDir=resolve(options['--linked-project-dir']),refPath=join(projectDir,'supabase','.temp','project-ref');
  assert.equal((await readFile(refPath,'utf8')).trim(),expected,'The linked project does not match the selected ref. No query sent.');
  const approved=JSON.parse(await readFile(resolve(options['--approved-accounts-file']),'utf8'));
  assert.deepEqual(Object.keys(approved),['emails'],'Approved accounts file must contain only an emails array.');
  const hashes=approvedAccountHashes(approved.emails),sources=await readProfileRoleSources();
  const directory=join(appRoot,'.pulse-local','profile-role-release');await mkdir(directory,{recursive:true});
  const queryPath=join(directory,`${randomUUID()}.sql`);await writeFile(queryPath,buildProfileRoleAuditSql(hashes));
  let raw;
  try {
    // Run the installed JS entry point directly: no shell or credentials in arguments.
    const cli=fileURLToPath(new URL('../../../node_modules/supabase/dist/supabase.js',import.meta.url));
    raw=await command(process.execPath,[cli,'--agent','yes','db','query','--linked','--file',queryPath,'--workdir',projectDir,'--output','json'],{env:roleAuditCliEnv(process.env),timeout:30000});
  } catch {throw new PreflightError('Read-only database query failed. Check CLI access and the selected linked project; provider output is suppressed.');}
  finally {await unlink(queryPath);}
  assert.equal((await readFile(refPath,'utf8')).trim(),expected,'The linked project changed during the query; results are not trusted.');
  assert(raw.length<128*1024,'Audit response exceeds its size limit.');
  const parsed=JSON.parse(raw);assert(Array.isArray(parsed.rows) && parsed.rows.length===1,'Unexpected audit response.');
  const report={target:{projectRef:expected},...inspectProfileRoleRelease(parsed.rows[0].audit,sources,hashes.length)};
  await writeFile(join(directory,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));if(report.status==='BLOCKED') process.exitCode=2;
}

if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) main(process.argv.slice(2)).catch(error=>{
  console.error(error instanceof assert.AssertionError || error instanceof PreflightError?error.message:'Role release preflight could not complete. No mutation was requested.');process.exitCode=1;
});

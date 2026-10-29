import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {parse as parseDotenv} from 'dotenv';
import {runReleaseBrowserAcceptance} from './release-browser-acceptance.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const artifacts=join(root,'.pulse-local','production-acceptance');
const envFiles=(await readdir(root)).filter(name=>/^\.env(?:\.(?:development|production|test))?(?:\.local)?$/.test(name));
assert.equal(envFiles.length,0,'Release acceptance requires a checkout without runtime env files.');
// Forward OS runtime settings only. Never inherit provider, deployment or database credentials.
const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>/^(?:PATH|PATHEXT|SystemRoot|windir|ComSpec|TEMP|TMP|APPDATA|LOCALAPPDATA|USERPROFILE|HOMEDRIVE|HOMEPATH|ProgramData|PROGRAMFILES|PROGRAMFILES\(X86\)|NUMBER_OF_PROCESSORS|PROCESSOR_ARCHITECTURE)$/i.test(key)));
Object.assign(env,{
  NODE_ENV:'production',NODE_OPTIONS:'--max-old-space-size=6144',NEXT_TELEMETRY_DISABLED:'1',
  NEXT_PUBLIC_SITE_URL:'http://localhost:3187',NEXT_PUBLIC_ROOT_DOMAIN:'localhost',
  NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54329',SUPABASE_URL:'http://127.0.0.1:54329',
  NEXT_PUBLIC_SUPABASE_ANON_KEY:'local-build-placeholder',SUPABASE_ANON_KEY:'local-build-placeholder',SUPABASE_SERVICE_ROLE_KEY:'local-build-placeholder',
  MONGODB_URI:'mongodb://127.0.0.1:1/pulse_build_unavailable',STRIPE_SECRET_KEY:'sk_test_local_build_only',
  GROQ_API_KEY:'local-build-placeholder',OPENAI_API_KEY:'local-build-placeholder',
  NEXT_PUBLIC_MOCK_MODE:'false',NEXT_PUBLIC_E2E_MODE:'false',NEXT_PUBLIC_PULSE_MOCK_AUTH_ENABLED:'false',
  E2E_OPERATOR_ACCESS:'false',JAMIE_PUBLIC_GUIDE_E2E_FIXTURE:'false',SELLER_EMAIL_SEND_ENABLED:'false',
});
// Optional public browser key only; no other value from this file enters the child environment.
const mapEnvIndex=process.argv.indexOf('--public-map-env');
if(mapEnvIndex>=0) {
  const key=parseDotenv(await readFile(process.argv[mapEnvIndex+1],'utf8')).NEXT_PUBLIC_MAPBOX_TOKEN?.trim();
  if(key?.startsWith('pk.')) env.NEXT_PUBLIC_MAPBOX_TOKEN=key;
}
await mkdir(artifacts,{recursive:true});
if(process.argv.includes('--browser-only')) {
  const result=JSON.parse(await readFile(join(artifacts,'build-result.json'),'utf8'));
  assert.equal(result.exitCode,0,'A successful production build is required before browser acceptance.');
  await runReleaseBrowserAcceptance({root,env,artifacts});
  process.exit(0);
}
const started=Date.now();
console.log(`Starting local production build; mock mode disabled; public Mapbox key ${env.NEXT_PUBLIC_MAPBOX_TOKEN?'available':'not supplied'}.`);
const child=spawn(process.execPath,[fileURLToPath(new URL('../../../node_modules/next/dist/bin/next',import.meta.url)),'build','--no-lint'],{cwd:root,env,windowsHide:true,stdio:['ignore','pipe','pipe']});
let log='';
for(const stream of [child.stdout,child.stderr]) stream.on('data',chunk=>{
  const safe=chunk.toString().replace(/pk\.[A-Za-z0-9_.-]+/g,'[public-map-key]');
  log+=safe;process.stdout.write(safe);
});
const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});
await writeFile(join(artifacts,'build.log'),log);
await writeFile(join(artifacts,'build-result.json'),JSON.stringify({exitCode:code,seconds:Math.round((Date.now()-started)/1000),mockMode:false,publicMapKeyAvailable:Boolean(env.NEXT_PUBLIC_MAPBOX_TOKEN)},null,2));
process.exitCode=typeof code==='number'?code:1;

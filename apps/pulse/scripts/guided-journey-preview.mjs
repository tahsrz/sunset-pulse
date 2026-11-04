import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdir,readdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {command,pulseRoot} from './docker-acceptance.mjs';

assert(!process.argv.slice(2).length,'Run this local preview without arguments.');
assert(!(await readdir(pulseRoot)).some(name=>/^\.env(?:\.(?:development|production|test))?(?:\.local)?$/.test(name)), 'Use the isolated checkout without runtime env files.');
const directory=join(pulseRoot,'.pulse-local','guided-journey');await mkdir(directory,{recursive:true});
const port=await new Promise((resolve,reject)=>{
  const server=createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const selected=server.address().port;server.close(()=>resolve(selected));});
});
const origin=`http://127.0.0.1:${port}`;
const os=Object.fromEntries(Object.entries(process.env).filter(([key])=>/^(?:PATH|PATHEXT|SystemRoot|windir|ComSpec|TEMP|TMP|APPDATA|LOCALAPPDATA|USERPROFILE|HOMEDRIVE|HOMEPATH|ProgramData|PROGRAMFILES|PROGRAMFILES\(X86\))$/i.test(key)));
const env={...os,NODE_ENV:'development',NEXT_TELEMETRY_DISABLED:'1',NODE_OPTIONS:'--max-old-space-size=6144',
  NEXT_PUBLIC_ROOT_DOMAIN:'localhost',NEXT_PUBLIC_SITE_URL:origin,
  NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:1',SUPABASE_URL:'http://127.0.0.1:1',NEXT_PUBLIC_SUPABASE_ANON_KEY:'local-preview-placeholder',SUPABASE_SERVICE_ROLE_KEY:'local-preview-placeholder',
  MONGODB_URI:'mongodb://127.0.0.1:1/pulse_preview_unavailable',NEXT_PUBLIC_MOCK_MODE:'false',NEXT_PUBLIC_E2E_MODE:'false',E2E_OPERATOR_ACCESS:'false',
  NEXT_PUBLIC_PULSE_MOCK_AUTH_ENABLED:'false',OPERATOR_EMAIL:'',AUTHORIZED_EMAIL:'',VIBE_CMS_PUBLIC_WRITE_WIP:'false',
  GROQ_API_KEY:'local-preview-placeholder',OPENAI_API_KEY:'local-preview-placeholder',STRIPE_SECRET_KEY:'sk_test_local_preview',SELLER_EMAIL_SEND_ENABLED:'false'};
const next=fileURLToPath(new URL('../../../node_modules/next/dist/bin/next',import.meta.url));
const server=spawn(process.execPath,[next,'dev','--hostname','127.0.0.1','--port',String(port)],{cwd:pulseRoot,env,windowsHide:true,stdio:['ignore','pipe','pipe']});
let exited=false,spawnError=false;const signals=[];let log='',logWrites=Promise.resolve();
server.once('exit',()=>{exited=true;});server.once('error',()=>{spawnError=true;});
for(const stream of [server.stdout,server.stderr]) stream.on('data',chunk=>{
  const text=chunk.toString();
  log+=text.replace(/eyJ[A-Za-z0-9_.-]+/g,'[redacted]');
  const snapshot=log;logWrites=logWrites.then(()=>writeFile(join(directory,'dev.log'),snapshot));
  for(const line of text.split(/\r?\n/)) {
    const match=/\b(GET|POST) (\/seller-plan\/preview)(?:\?[^ ]*)? (\d{3})/.exec(line);
    if(match) signals.push({method:match[1],path:match[2],status:Number(match[3])});
    if(/⨯|Failed to compile|Module not found|Type error:/.test(line)) console.error(line.replace(/eyJ[A-Za-z0-9_.-]+/g,'[redacted]'));
  }
});
try {
  let ready=false,lastStatus='no response';const deadline=Date.now()+120000;
  while(Date.now()<deadline) {
    assert(!exited&&!spawnError,'Owned preview server stopped before readiness.');
    try {const response=await fetch(origin+'/seller-plan/preview',{signal:AbortSignal.timeout(5000)});lastStatus=`HTTP ${response.status}`;if(response.ok&&(await response.text()).includes('Design Preview')){ready=true;break;}} catch(error) {lastStatus=error.cause?.code||error.name;}
    await delay(1000);
  }
  assert(ready,`The local journey preview did not render (${lastStatus}); inspect ignored dev.log.`);
  await writeFile(join(directory,'server.json'),JSON.stringify({origin,port,pid:server.pid,mode:'development',realBackends:false},null,2)+'\n');
  console.log(`Local: ${origin}/seller-plan/preview`);
  console.log('Local fixture preview ready. No live backend credentials loaded. Send quit to stop.');
  await new Promise(resolve=>{
    process.stdin.setEncoding('utf8');process.stdin.resume();
    const stop=()=>resolve();
    process.stdin.on('data',value=>{if(value.trim()==='quit')resolve();});
    process.stdin.once('end',stop);
    process.once('SIGINT',stop);process.once('SIGTERM',stop);server.once('exit',stop);
  });
} finally {
  process.stdin.pause();
  if(server.pid&&!exited) {
    if(process.platform==='win32') await command('taskkill',['/PID',String(server.pid),'/T','/F']);
    else server.kill('SIGTERM');
  }
  await writeFile(join(directory,'server-signals.json'),JSON.stringify(signals,null,2)+'\n');
  await logWrites;
  console.log('Stopped the owned local preview server.');
}

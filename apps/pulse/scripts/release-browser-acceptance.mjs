import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:net';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {command,withDockerService} from './docker-acceptance.mjs';

const next=fileURLToPath(new URL('../../../node_modules/next/dist/bin/next',import.meta.url));
const playwright=fileURLToPath(new URL('../../../node_modules/@playwright/test/cli.js',import.meta.url));
const redact=text=>text.replace(/pk\.[A-Za-z0-9_.-]+/g,'[public-map-key]');

export async function runReleaseBrowserAcceptance(input) {
  return withDockerService('mongo-test',async container=>{
    const port=await command('docker',['port',container,'27017/tcp']);
    assert.match(port,/^127\.0\.0\.1:\d+$/);
    return runBrowserPhases({...input,env:{...input.env,MONGODB_URI:`mongodb://${port}/pulse_release_acceptance`}});
  });
}

async function runBrowserPhases({root,env,artifacts}) {
  const failures=[];
  const outcomes=[];
  const modes=process.argv.includes('--production-only')?[false]:process.argv.includes('--fixture-only')?[true]:[false,true];
  for(const fixture of modes) {
    const started=Date.now();let passed=false;
    const port=fixture?3188:3187;
    const origin=`http://localhost:${port}`;
    const probe=createServer();await new Promise((resolve,reject)=>{probe.once('error',reject);probe.listen(port,'localhost',resolve);});await new Promise(resolve=>probe.close(resolve));
    const childEnv={...env,PLAYWRIGHT_BROWSERS_PATH:process.env.PLAYWRIGHT_BROWSERS_PATH || join(env.LOCALAPPDATA,'ms-playwright'),PULSE_RELEASE_ORIGIN:origin,PULSE_RELEASE_RUN_ID:String(Date.now()),KCD_GROUP_SITE_PUBLISHED:'true',
      ...(fixture?{NODE_ENV:'development',NEXT_E2E_ISOLATED_OUTPUT:'1',NEXT_PUBLIC_E2E_MODE:'true',NEXT_PUBLIC_MOCK_MODE:'true',JAMIE_PUBLIC_GUIDE_E2E_FIXTURE:'true'}:{})};
    const server=spawn(process.execPath,[next,fixture?'dev':'start','--hostname','localhost','--port',String(port)],{cwd:root,env:childEnv,windowsHide:true,stdio:['ignore','pipe','pipe']});
    let log='';for(const stream of [server.stdout,server.stderr]) stream.on('data',chunk=>{log+=redact(chunk.toString());});
    try {
      let ready=false;
      for(let attempt=0;attempt<90;attempt++) {
        if(server.exitCode!==null) throw new Error('Local acceptance server exited before readiness.');
        try { const response=await fetch(origin+'/explorer?lat=32',{signal:AbortSignal.timeout(2000)});if(response.status===200){ready=true;break;} } catch {}
        await new Promise(resolve=>setTimeout(resolve,1000));
      }
      assert(ready,'Local acceptance server did not become ready.');
      console.log(`Running ${fixture?'explicit fixture-map':'production live-map'} browser acceptance.`);
      const grep=process.argv.indexOf('--grep');
      const test=spawn(process.execPath,[playwright,'test','--config','playwright.release.config.ts',`tests/${fixture?'explorer-intelligence':'explorer-production'}.spec.ts`,...(grep>=0?['--grep',process.argv[grep+1]]:[])],{cwd:root,env:childEnv,windowsHide:true,stdio:['ignore','pipe','pipe']});
      for(const stream of [test.stdout,test.stderr]) stream.on('data',chunk=>process.stdout.write(redact(chunk.toString())));
      const code=await new Promise((resolve,reject)=>{test.once('error',reject);test.once('exit',resolve);});
      assert.equal(code,0,`${fixture?'Fixture':'Production'} browser acceptance failed.`);
      passed=true;
    } catch(error) {
      failures.push(error.message);
    } finally {
      if(server.exitCode===null) {
        if(process.platform==='win32') spawnSync('taskkill',['/pid',String(server.pid),'/t','/f'],{windowsHide:true,stdio:'ignore'});
        else server.kill('SIGTERM');
      }
      await writeFile(join(artifacts,fixture?'fixture-server.log':'production-server.log'),log);
      outcomes.push({mode:fixture?'fixture':'production',passed,seconds:Math.round((Date.now()-started)/1000)});
      await writeFile(join(artifacts,'browser-result.json'),JSON.stringify(outcomes,null,2));
    }
  }
  assert.deepEqual(failures,[],'Release browser acceptance failures');
}

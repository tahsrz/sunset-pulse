import {expect,test,type Page} from '@playwright/test';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';

declare global {
  interface Window { __atlasLifecycle: { snapshot:()=>{frames:number;pendingFrames:number;motionListeners:number} }; }
}
const evidence=new WeakMap<Page,Record<string,unknown>>();
test.beforeEach(async({page})=>{
  await page.route('**/api/news',route=>route.fulfill({status:503,json:{error:'Controlled unavailable news for Atlas lifecycle measurement.'}}));
});
test.afterEach(async({page},testInfo)=>{
  if(evidence.has(page)) {
    const final=await page.evaluate(()=>{
      const canvas=document.querySelector<HTMLCanvasElement>('canvas[aria-label="TAH knowledge globe"]');
      const context=canvas?.getContext('2d');
      const pixels=canvas && context?context.getImageData(0,0,canvas.width,canvas.height).data:null;
      return {snapshot:window.__atlasLifecycle.snapshot(),reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,
        documentHeight:document.documentElement.scrollHeight,canvas:canvas?{width:canvas.width,height:canvas.height,bounds:canvas.getBoundingClientRect().toJSON(),
          contextLost:context?.isContextLost(),transform:context?.getTransform().toJSON(),paintedPixels:pixels?.filter((value,index)=>index%4===3 && value>0).length}:null};
    });
    await mkdir(testInfo.outputDir,{recursive:true});await writeFile(testInfo.outputPath('atlas-lifecycle.json'),JSON.stringify({...evidence.get(page),final},null,2));
    const canvas=page.locator('canvas[aria-label="TAH knowledge globe"]');
    if(await canvas.count()) {
      const png=await canvas.evaluate(element=>(element as HTMLCanvasElement).toDataURL('image/png').split(',')[1]);
      await writeFile(testInfo.outputPath('atlas-final.png'),Buffer.from(png,'base64'));
    }
  }
});

async function atlasChunks() {
  const root=path.resolve('.next/static/chunks');
  const chunks:string[]=[];
  for(const file of await readdir(root,{recursive:true})) {
    if(!file.endsWith('.js')) continue;
    const code=await readFile(path.join(root,file),'utf8');
    if(code.includes('Hide Interface') && code.includes('Show Interface')) chunks.push('/_next/static/chunks/'+file.replaceAll('\\','/'));
  }
  expect(chunks.length,'the production build identifies the actual Atlas control chunk').toBeGreaterThan(0);
  return chunks;
}

async function instrument(page:Page) {
  await page.addInitScript(()=>{
    const request=window.requestAnimationFrame.bind(window),cancel=window.cancelAnimationFrame.bind(window);
    const pending=new Set<number>();let frames=0,motionListeners=0;
    window.requestAnimationFrame=callback=>{
      const id=request(time=>{pending.delete(id);frames++;callback(time);});pending.add(id);return id;
    };
    window.cancelAnimationFrame=id=>{pending.delete(id);cancel(id);};
    const add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener;
    const listeners=new WeakMap<EventTarget,Set<unknown>>();
    const tracked=(target:EventTarget,type:string)=>target instanceof MediaQueryList && target.media==='(prefers-reduced-motion: reduce)' && type==='change';
    EventTarget.prototype.addEventListener=function(type,listener,options){
      if(tracked(this,type)) {const set=listeners.get(this)||new Set();if(!set.has(listener)){set.add(listener);motionListeners++;}listeners.set(this,set);}
      return add.call(this,type,listener,options);
    };
    EventTarget.prototype.removeEventListener=function(type,listener,options){
      if(tracked(this,type) && listeners.get(this)?.delete(listener)) motionListeners--;
      return remove.call(this,type,listener,options);
    };
    window.__atlasLifecycle={snapshot:()=>({frames,pendingFrames:pending.size,motionListeners})};
  });
}

for(const reducedMotion of ['no-preference','reduce'] as const) test.describe(`Atlas ${reducedMotion}`,()=>{
  test('defers loading and releases animation work over repeated open/close cycles',async({page},testInfo)=>{
    test.setTimeout(180000);
    await instrument(page);
    const chunks=await atlasChunks(),scripts=new Set<string>(),errors:string[]=[];
    page.on('request',request=>{if(request.resourceType()==='script')scripts.add(new URL(request.url()).pathname);});
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto('/',{waitUntil:'domcontentloaded'});
    const launch=page.getByRole('button',{name:'Open Atlas View',exact:true});
    await expect(launch).toBeVisible();
    for(const chunk of chunks) expect(scripts.has(chunk),'Atlas code stays deferred before explicit launch').toBe(false);
    const initial=await page.evaluate(()=>window.__atlasLifecycle.snapshot());
    const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
    const cycles:Array<{cycle:number;width:number;elapsed:number;opened:ReturnType<Window['__atlasLifecycle']['snapshot']>;closed:ReturnType<Window['__atlasLifecycle']['snapshot']>;workers:number;metrics:{name:string;value:number}[]}>=[];
    const geometry:unknown[]=[];
    evidence.set(page,{reducedMotion,initial,chunks,cycles,geometry,errors,profile:'Local production; unavailable Supabase and empty disposable Mongo; news read controlled as unavailable; real local globe API; no prior-build improvement claim.'});
    for(const [cycle,width] of [390,1440,390,1440].entries()) {
      await page.setViewportSize({width,height:900});
      await page.emulateMedia({reducedMotion});
      expect(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(reducedMotion==='reduce');
      const start=await page.evaluate(()=>performance.now());
      await launch.click();
      await expect(page.locator('canvas[aria-label="TAH knowledge globe"]')).toBeVisible({timeout:30000});
      await expect.poll(()=>page.evaluate(()=>window.__atlasLifecycle.snapshot().motionListeners)).toBe(initial.motionListeners+1);
      await expect.poll(()=>page.locator('canvas[aria-label="TAH knowledge globe"]').evaluate((element)=>{
        const canvas=element as HTMLCanvasElement;
        return canvas.getContext('2d')!.getImageData(Math.floor(canvas.width/2),Math.floor(canvas.height/2),1,1).data[3];
      }),{timeout:30000,message:'The real globe paints a nontransparent center on the software-rendered browser.'}).toBeGreaterThan(0);
      const elapsed=await page.evaluate(value=>performance.now()-value,start);
      const opened=await page.evaluate(()=>window.__atlasLifecycle.snapshot());
      if(reducedMotion==='reduce') await expect.poll(()=>page.evaluate(()=>window.__atlasLifecycle.snapshot().pendingFrames)).toBe(0);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      const hide=await page.getByRole('button',{name:'Hide Interface',exact:true}).boundingBox();
      const close=await page.getByRole('button',{name:'Close Atlas experience',exact:true}).boundingBox();
      const dimensions=await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight}));
      geometry.push({cycle,width,hide,close,dimensions});
      expect(dimensions.height).toBeLessThan(30000);
      expect(hide && close && (hide.x+hide.width<=close.x || close.x+close.width<=hide.x || hide.y+hide.height<=close.y || close.y+close.height<=hide.y),'Close and interface controls do not overlap').toBe(true);
      if(cycle===0) {
        await page.getByRole('button',{name:'Hide Interface',exact:true}).click({timeout:5000});
        await expect(page.getByRole('button',{name:'Show Interface',exact:true})).toBeVisible();
      }
      if(cycle<2) {
        const image=await page.locator('canvas[aria-label="TAH knowledge globe"]').evaluate(element=>(element as HTMLCanvasElement).toDataURL('image/png').split(',')[1]);
        await writeFile(testInfo.outputPath(`atlas-canvas-${width}.png`),Buffer.from(image,'base64'));
      }
      await page.getByRole('button',{name:'Close Atlas experience',exact:true}).click();
      await expect(launch).toBeFocused();
      await expect(page.locator('canvas[aria-label="TAH knowledge globe"]')).toHaveCount(0);
      await expect.poll(()=>page.evaluate(()=>window.__atlasLifecycle.snapshot().motionListeners)).toBe(initial.motionListeners);
      await expect.poll(()=>page.evaluate(()=>window.__atlasLifecycle.snapshot().pendingFrames)).toBe(initial.pendingFrames);
      await cdp.send('HeapProfiler.collectGarbage');
      const metrics=(await cdp.send('Performance.getMetrics')).metrics.filter(metric=>['Nodes','JSEventListeners','JSHeapUsedSize'].includes(metric.name));
      cycles.push({cycle,width,elapsed,opened,closed:await page.evaluate(()=>window.__atlasLifecycle.snapshot()),workers:page.workers().length,metrics});
      expect(page.workers()).toHaveLength(0);
    }
    for(const chunk of chunks) expect(scripts.has(chunk)).toBe(true);
    const first=cycles[0].metrics.find(metric=>metric.name==='JSEventListeners')!.value;
    const last=cycles.at(-1)!.metrics.find(metric=>metric.name==='JSEventListeners')!.value;
    expect(last).toBeLessThanOrEqual(first+2);
    expect(errors).toEqual([]);
    await cdp.detach();
  });
});

for(const recovery of ['reopen','retry'] as const) test(`recovers Atlas through ${recovery} after its deferred chunk temporarily fails`,async({page})=>{
  const chunks=new Set(await atlasChunks());let blocked=true;
  await page.route('**/_next/static/**',route=>blocked && chunks.has(new URL(route.request().url()).pathname)?route.abort('failed'):route.continue());
  await page.goto('/',{waitUntil:'domcontentloaded'});
  const launch=page.getByRole('button',{name:'Open Atlas View',exact:true});await launch.click();
  const fallback=page.getByRole('alert').filter({hasText:'The Atlas view could not open.'});
  await expect(fallback).toBeVisible();
  await expect(fallback.getByRole('link',{name:'Open Atlas',exact:true})).toHaveAttribute('href','/atlas');
  blocked=false;
  if(recovery==='reopen') {
    await page.getByRole('button',{name:'Close Atlas experience',exact:true}).click();
    await expect(launch).toBeFocused();await launch.click();
  } else await fallback.getByRole('button',{name:'Retry Atlas View',exact:true}).click();
  await expect(page.getByRole('button',{name:'Hide Interface',exact:true})).toBeVisible({timeout:15000});
});

test('closing Atlas cancels an unfinished globe read',async({page})=>{
  let held:import('@playwright/test').Route|undefined;
  const failures:string[]=[];
  page.on('requestfailed',request=>{if(new URL(request.url()).pathname==='/api/tah/atlas/globe') failures.push(request.failure()?.errorText||'failed');});
  await page.route('**/api/tah/atlas/globe',route=>{held=route;});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Open Atlas View',exact:true}).click();
  await expect.poll(()=>Boolean(held)).toBe(true);
  await page.getByRole('button',{name:'Close Atlas experience',exact:true}).click();
  await expect.poll(()=>failures.some(error=>error.includes('ABORTED'))).toBe(true);
  await expect(page.locator('canvas[aria-label="TAH knowledge globe"]')).toHaveCount(0);
  await held?.abort().catch(()=>{});
});

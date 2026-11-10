import {test,expect,type Page} from '@playwright/test';
import {explorerEnvelope,explorerListing} from './fixtures/explorerListing';
import {mkdir,writeFile} from 'node:fs/promises';

const networkEvidence=new WeakMap<Page,{path:string;status:number}[]>();
const browserEvidence=new WeakMap<Page,string[]>();
test.beforeEach(async({page})=>{
  const responses:{path:string;status:number}[]=[];networkEvidence.set(page,responses);
  const diagnostics:string[]=[];browserEvidence.set(page,diagnostics);
  const redact=(text:string)=>text.replace(/pk\.[A-Za-z0-9_.-]+/g,'[public-map-key]');
  page.on('console',message=>{if(['error','warning'].includes(message.type())) diagnostics.push(redact(message.text()).slice(0,2000));});
  page.on('pageerror',error=>diagnostics.push(redact(error.stack||error.message).slice(0,3000)));
  page.on('requestfailed',request=>{const url=new URL(request.url());if(url.hostname.endsWith('mapbox.com')) diagnostics.push(`${url.pathname}: ${request.failure()?.errorText}`);});
  page.on('response',response=>{const url=new URL(response.url());if(url.hostname.endsWith('mapbox.com')) responses.push({path:url.pathname,status:response.status()});});
  await page.route('https://events.mapbox.com/**',route=>route.fulfill({status:204,body:''}));
  await page.route('**/api/jamie/dreams',route=>route.fulfill({json:[]}));
  await page.route('**/api/valuation',route=>route.fulfill({json:{data:[]}}));
  await page.route('**/api/properties**',route=>{
    const path=new URL(route.request().url()).pathname;
    const listing=explorerListing();
    const listings=[listing,explorerListing({id:'no-geo',_id:'no-geo',name:'No Map Location',location_geo:undefined})];
    return route.fulfill({json:explorerEnvelope(path==='/api/properties'?{properties:listings,total:2}:path==='/api/properties/search'?listings:listing)});
  });
});

test.afterEach(async({page},testInfo)=>{
  await mkdir(testInfo.outputDir,{recursive:true});
  await writeFile(testInfo.outputPath('browser-diagnostics.json'),JSON.stringify({mapRequests:networkEvidence.get(page)||[],console:browserEvidence.get(page)||[]},null,2));
  await testInfo.attach('map-request-statuses',{body:JSON.stringify(networkEvidence.get(page)||[]),contentType:'application/json'});
  await testInfo.attach('browser-diagnostics',{body:JSON.stringify(browserEvidence.get(page)||[]),contentType:'application/json'});
});

async function expectLoadedMap(page:Page) {
  const draw=page.locator('.mapbox-gl-draw_polygon');
  await expect(draw.or(page.getByRole('button',{name:'Retry Map',exact:true})).first()).toBeVisible({timeout:45000});
  await expect(draw).toBeVisible({timeout:2000});
}

test('production Explorer renders the real map, draws an area and keeps the list usable',async({page},testInfo)=>{
  test.skip(!process.env.NEXT_PUBLIC_MAPBOX_TOKEN,'A public Mapbox key is required for actual WebGL/tiles.');
  const errors:string[]=[];
  const mapResponses:{path:string;status:number}[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{const url=new URL(response.url());if(url.hostname.endsWith('mapbox.com')) mapResponses.push({path:url.pathname,status:response.status()});});
  const response=await page.goto('/explorer?lat=32.736&lng=-97.116',{waitUntil:'domcontentloaded'});
  expect(response?.headers()['content-security-policy']).toBeTruthy();
  expect(response?.headers()['content-security-policy']).not.toContain("'unsafe-eval'");
  const results=page.getByRole('region',{name:'Properties in This Search',exact:true});
  await expect(results.getByRole('link',{name:'808 W Abram St',exact:true})).toBeVisible();
  await expect(page.locator('[data-map-mode="fixture"]')).toHaveCount(0);
  await expectLoadedMap(page);
  await expect.poll(()=>mapResponses.some(response=>response.status===200 && response.path.includes('/styles/'))).toBe(true);
  for(const width of [390,1440]) {
    await page.setViewportSize({width,height:900});
    await expect(results.getByRole('link',{name:'808 W Abram St',exact:true})).toBeVisible();
    await expect(page.getByText('Map location not listed.',{exact:true})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:`.pulse-local/production-acceptance/explorer-live-${width}.png`,fullPage:true});
  }
  const canvas=page.locator('.mapboxgl-canvas');
  await canvas.scrollIntoViewIfNeeded();
  const bounds=await canvas.boundingBox();expect(bounds).not.toBeNull();
  const areaRequest=page.waitForRequest(request=>new URL(request.url()).pathname==='/api/properties/search' && new URL(request.url()).searchParams.has('polygon'));
  await page.locator('.mapbox-gl-draw_polygon').click();
  for(const [x,y] of [[.2,.3],[.5,.3],[.5,.6],[.2,.6]]) await page.mouse.click(bounds!.x+bounds!.width*x,bounds!.y+bounds!.height*y);
  // Explicitly finish the polygon; software WebGL may not have painted the first vertex's hit target yet.
  await page.keyboard.press('Enter');
  const selected=new URL((await areaRequest).url()).searchParams.get('polygon');
  expect(selected).toBeTruthy();
  await page.getByRole('button',{name:'Clear Area',exact:true}).click();
  await expect(page.getByRole('button',{name:'Clear Area',exact:true})).toHaveCount(0);
  for(const name of ['Listing Density','Nearby Places','Satellite']) {
    const button=page.getByRole('button',{name,exact:true});await button.click();await expect(button).toHaveAttribute('aria-pressed','true');await button.click();await expect(button).toHaveAttribute('aria-pressed','false');
  }
  expect(errors).toEqual([]);
  await testInfo.attach('live-map-evidence',{body:JSON.stringify({errors,mapResponses,polygonSearchObserved:Boolean(selected)}),contentType:'application/json'});
});

test('a failed real map request preserves results and retry restores the map',async({page})=>{
  test.skip(!process.env.NEXT_PUBLIC_MAPBOX_TOKEN,'A public Mapbox key is required for actual WebGL/tiles.');
  const styles=/https:\/\/api\.mapbox\.com\/styles\/v1\//;
  await page.route(styles,route=>route.abort('failed'));
  await page.goto('/explorer',{waitUntil:'domcontentloaded'});
  await expect(page.getByRole('button',{name:'Retry Map',exact:true})).toBeVisible({timeout:45000});
  await expect(page.getByRole('link',{name:'808 W Abram St',exact:true})).toBeVisible();
  await page.unroute(styles);
  await page.getByRole('button',{name:'Retry Map',exact:true}).click();
  await expectLoadedMap(page);
  await expect(page.getByRole('link',{name:'No Map Location',exact:true})).toBeVisible();
});

test('production homepage remains usable at phone and desktop widths',async({page},testInfo)=>{
  const measurements=[];
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  for(const width of [390,1440]) {
    await page.setViewportSize({width,height:900});
    await page.goto('/',{waitUntil:'domcontentloaded'});
    await expect(page.getByRole('link',{name:'Request My Free Seller Plan',exact:true})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    measurements.push(await page.evaluate(()=>({width:innerWidth,navigation:performance.getEntriesByType('navigation').map(entry=>entry.toJSON()),resources:performance.getEntriesByType('resource').filter(entry=>new URL(entry.name).origin===location.origin).map(entry=>({path:new URL(entry.name).pathname,duration:entry.duration,bytes:(entry as PerformanceResourceTiming).transferSize}))})));
    await page.screenshot({path:`.pulse-local/production-acceptance/homepage-production-${width}.png`,fullPage:true});
  }
  expect(errors).toEqual([]);
  await writeFile(testInfo.outputPath('production-baseline.json'),JSON.stringify({measurements,errors,comparison:'Current-build baseline only; no prior-build improvement claimed.'},null,2));
  await testInfo.attach('production-baseline',{body:JSON.stringify({measurements,errors,comparison:'Current-build baseline only; no prior-build improvement claimed.'}),contentType:'application/json'});
});

test('production KCD tenant and property photo remain usable at phone and desktop widths',async({page,baseURL})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  const kcd=new URL('/',baseURL);kcd.hostname='kcdgroup.localhost';
  for(const width of [390,1440]) {
    await page.setViewportSize({width,height:900});
    const styleReady=process.env.NEXT_PUBLIC_MAPBOX_TOKEN?page.waitForResponse(response=>response.url().includes('/styles/v1/mapbox/streets-v12') && response.status()===200,{timeout:30000}).catch(()=>null):null;
    const response=await page.goto(kcd.href,{waitUntil:'domcontentloaded'});
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading',{level:1})).toHaveText('Building Today For a Stronger Tomorrow.');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const photo=page.getByAltText('Arlington Plaza exterior with the 808 street number, front entrance, brick walkway, and parking beside the building',{exact:true});
    await expect(photo).toBeVisible();
    await expect.poll(()=>photo.evaluate(image=>(image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    if(styleReady) {
      const map=page.getByRole('region',{name:'Interactive map around Arlington Plaza',exact:true});
      await map.scrollIntoViewIfNeeded();expect(await styleReady).not.toBeNull();
      await map.getByRole('button',{name:'Show Arlington Plaza address on map',exact:true}).click();
      await expect(map.getByText('808 W Abram St, Arlington, TX 76013',{exact:true})).toBeVisible();
      await map.getByRole('button',{name:'Close popup',exact:true}).click();
    }
    await page.screenshot({path:`.pulse-local/production-acceptance/kcd-production-${width}.png`,fullPage:true});
  }
  expect(errors).toEqual([]);
});

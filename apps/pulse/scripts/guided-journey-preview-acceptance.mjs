import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium,expect} from '@playwright/test';
import {pulseRoot} from './docker-acceptance.mjs';

assert.equal(process.argv.length,3,'Provide the owned preview loopback origin.');
const origin=new URL(process.argv[2]);
assert(origin.protocol==='http:'&&['localhost','127.0.0.1'].includes(origin.hostname)&&origin.port&&!origin.username&&!origin.password&&origin.pathname==='/'&&!origin.search&&!origin.hash,'Only a plain local preview origin is allowed.');
const directory=join(pulseRoot,'.pulse-local','guided-journey');await mkdir(directory,{recursive:true});
const browser=await chromium.launch({headless:true});const errors=[],writes=[],apiRequests=[];
try {
  const context=await browser.newContext({viewport:{width:1440,height:1050}});
  await context.route('**/*',route=>{
    const request=route.request(),url=new URL(request.url());
    if(!['http:','https:'].includes(url.protocol)) return route.continue();
    if(url.origin!==origin.origin) return route.abort();
    if(!['GET','HEAD'].includes(request.method())) writes.push(url.pathname);
    if(url.pathname.startsWith('/api/')) apiRequests.push(url.pathname);
    return route.continue();
  });
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
    window.__journeyLabelEvents=[];
    document.addEventListener('animationstart',event=>{
      if(event.target instanceof HTMLElement&&event.target.closest('figure [aria-hidden="true"]')&&['Pricing Review','Home Preparation','Move Planning'].includes(event.target.textContent)) window.__journeyLabelEvents.push(event.target.textContent);
    });
  });
  const url=origin.origin+'/seller-plan/preview';await page.goto(url,{waitUntil:'networkidle',timeout:120000});
  await expect(page.getByRole('heading',{level:1})).toHaveText('What’s your next move?');
  const first=page.getByText('Pricing Review',{exact:true}).first();
  await expect(first).toBeVisible();
  await page.screenshot({path:join(directory,'journey-desktop.png'),fullPage:true});
  const next=()=>page.getByRole('button',{name:'Next →',exact:true}).click();
  const choose=async label=>{await page.getByRole('radio',{name:label,exact:true}).check();await next();};
  const heading=text=>expect(page.getByRole('heading',{level:1})).toHaveText(text);
  await choose('Buy and Sell');await page.getByRole('button',{name:'Use a Fictional Sample Home'}).click();await next();
  await expect(first).toHaveCSS('opacity','1');
  await page.getByRole('checkbox',{name:'This Is the Home I Mean'}).check();await next();
  await expect(page.getByLabel('Bedrooms',{exact:true})).toHaveValue('3');await next();
  await choose('Add Home Details');
  await page.getByRole('checkbox',{name:'Kitchen Cabinets',exact:true}).check();
  await page.getByRole('checkbox',{name:'None',exact:true}).check();await expect(page.getByRole('checkbox',{name:'Kitchen Cabinets',exact:true})).not.toBeChecked();await next();
  for(const value of ['Quartz','A Mix','Tile','2','No Pool','No Known Issues','Normal Wear']) await choose(value);
  await choose('I Own It');await choose('3–6 Months');await choose('Plan My Sale and Move');await choose('Yes');
  await page.getByLabel('Approximate Amount in Dollars').fill('250000');await next();
  for(const value of ['Looking at Homes','Yes','I’m Open to Either','No','Yes']) await choose(value);
  await page.getByLabel('Approximate Amount in Dollars').fill('450000');await next();await heading('Does this look right?');
  for(const label of ['Pricing Review','Home Preparation','Move Planning']) await expect(page.locator('figure').getByText(label,{exact:true})).toHaveCSS('opacity','1');
  assert.deepEqual(await page.evaluate(()=>window.__journeyLabelEvents),['Pricing Review','Home Preparation','Move Planning'],'Labels replayed during ordinary question rerenders.');
  await page.screenshot({path:join(directory,'journey-review.png'),fullPage:true});
  await page.getByRole('button',{name:'Edit Have you been pre-approved for a mortgage?'}).click();
  await page.getByRole('radio',{name:'Not Yet',exact:true}).check();await page.getByRole('button',{name:'Back to Review'}).click();
  await heading('Does this look right?');await expect(page.getByText('$450,000.00',{exact:true})).toHaveCount(0);
  await next();await page.getByLabel('Your Name',{exact:true}).fill('Taylor Example');await page.getByLabel('Email',{exact:true}).fill('taylor@example.test');
  await page.getByRole('checkbox',{name:'I’d Like a Response About My Request.'}).check();
  await page.getByText('Preview Controls',{exact:true}).click();await page.getByLabel('Final Step Response').selectOption('error');
  await page.getByRole('button',{name:'Preview My Request',exact:true}).click();await expect(page.getByRole('button',{name:'Loading…',exact:true})).toBeDisabled();
  await expect(page.locator('#journey-content').getByRole('alert')).toContainText('Preview error');await expect(page.getByLabel('Email',{exact:true})).toHaveValue('taylor@example.test');
  await page.getByLabel('Final Step Response').selectOption('loading');await page.getByRole('button',{name:'Preview My Request',exact:true}).click();
  await heading('Your next move, in view.');await expect(page.getByText('No request was sent here.',{exact:false})).toBeVisible();
  await page.reload({waitUntil:'networkidle'});await heading('What’s your next move?');
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
  await expect(first).toBeVisible();assert.equal(await first.evaluate(node=>getComputedStyle(node).animationName),'none');
  await page.screenshot({path:join(directory,'journey-mobile.png'),fullPage:true});
  await choose('Find a Home');await heading('Where are you in your home search?');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Narrow preview overflows the viewport.');
  await page.screenshot({path:join(directory,'journey-mobile-question.png'),fullPage:true});
  for(const value of ['Just Starting','Yes','An Existing Home','No','Not Yet']) await choose(value);
  await heading('Does this look right?');await expect(page.getByRole('button',{name:'Edit Home',exact:true})).toHaveCount(0);
  await page.reload({waitUntil:'networkidle'});await choose('Sell My Home');await page.getByRole('button',{name:'Use a Fictional Sample Home'}).click();await next();
  await page.getByRole('checkbox',{name:'This Is the Home I Mean'}).check();await next();await next();await choose('Leave These for Later');
  for(const value of ['I Own It','I’m Still Exploring','Work Out My Options','No']) await choose(value);
  await heading('Does this look right?');await expect(page.getByRole('button',{name:'Edit Where are you in your home search?',exact:true})).toHaveCount(0);
  // A 720x525 CSS viewport checks reflow equivalent to 200% zoom on the desktop viewport.
  await page.setViewportSize({width:720,height:525});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'The 200% desktop reflow overflows.');
  const motion=await context.newPage();await motion.goto(url,{waitUntil:'networkidle'});
  const animatedLabels=motion.locator('figure [aria-hidden="true"] > span > span');await expect(animatedLabels).toHaveCount(3);
  await expect(animatedLabels.last()).toHaveCSS('opacity','1');
  // Sample the actual CSS animation timeline deterministically; no app timer or fixture animation.
  for(const [time,visible] of [[280,1],[450,2],[720,3]]) {
    await animatedLabels.evaluateAll((nodes,time)=>nodes.forEach(node=>{const animation=node.getAnimations()[0];animation.pause();animation.currentTime=time;}),time);
    const opacity=await animatedLabels.evaluateAll(nodes=>nodes.map(node=>Number(getComputedStyle(node).opacity)));
    assert.equal(opacity.filter(value=>value>0).length,visible);
    await motion.locator('figure').screenshot({path:join(directory,`journey-labels-${visible}.png`)});
  }
  await motion.close();
  assert.deepEqual(errors,[],'Browser exceptions occurred.');assert.deepEqual(writes,[],'The prototype sent a write request.');assert.deepEqual(apiRequests,[],'The prototype contacted an application API.');
  const result={checkedAt:new Date().toISOString(),modes:['sell','buy','both'],desktop:1440,mobile:390,desktopZoomReflow:200,reducedMotion:true,sequentialLabelSamples:[280,450,720],labelRevealDoesNotReplay:true,hiddenApprovalCleared:true,renovationNoneExclusive:true,loadingAndFailureRecovery:true,reloadClearsDraft:true,applicationApiRequests:0,writeRequests:0,pageErrors:0};
  await writeFile(join(directory,'result.json'),JSON.stringify(result,null,2)+'\n');console.log('PASS: three journey branches, review edits, loading/error recovery, reduced motion, narrow layout and zero API/write requests.');
} finally {await browser.close();}

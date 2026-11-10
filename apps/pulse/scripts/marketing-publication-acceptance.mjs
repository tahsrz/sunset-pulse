import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {expect} from '@playwright/test';

export async function marketingPublicationAcceptance({primary,login,request,sql,origin,artifacts,browser,callbackLink}) {
  assert.equal(new URL(origin).hostname,'admin.localhost');
  const paths=['../config/marketing_copy.json','../content/marketing/seller-introduction.v1.json','../content/neighborhoods/presentation.v1.json'];
  const digest=async()=>Promise.all(paths.map(async path=>createHash('sha256').update(await readFile(new URL(path,import.meta.url))).digest('hex')));
  const before=await digest(),source=JSON.parse(await readFile(new URL(paths[0],import.meta.url),'utf8'));
  const {page}=primary;
  let callbackWrites=0;
  const verifyCallback=async account=>{
    assert.match(account.userId,/^[a-f0-9-]{36}$/);
    await sql(`UPDATE public.profiles SET full_name='BEFORE CALLBACK ACCEPTANCE' WHERE id='${account.userId}';`);
    const token=await callbackLink(account.email);
    // Keep the single-use token in memory; never put it in screenshots or assertion output.
    try {
      await account.page.goto(origin+'/auth/callback?'+new URLSearchParams({token_hash:token,type:'magiclink',next:'/admin/marketing/readiness'}),{timeout:120000});
    } catch {throw new Error('Local callback navigation failed; single-use credentials withheld.');}
    const result=new URL(account.page.url());
    assert.equal(result.origin,origin,'The callback must retain the non-bypass browser origin.');
    assert.equal(result.pathname,'/admin/marketing/readiness');
    assert.equal(await sql(`SELECT full_name=split_part(email,'@',1) FROM public.profiles WHERE id='${account.userId}';`),'t','The callback must apply the benign profile edit, not silently skip its writer.');
    callbackWrites++;
  };
  await verifyCallback(primary);
  assert.equal(await sql(`SELECT role FROM public.profiles WHERE id='${primary.userId}';`),'operator','A callback must preserve the trusted operator role.');
  const anonymous=await browser.newContext();
  try {
    const anonymousPage=await anonymous.newPage();
    for(const path of ['/api/admin/marketing','/api/admin/marketing/readiness']) {
      const denied=await anonymousPage.goto(origin+path,{timeout:120000});
      assert.equal(denied.status(),403,'Anonymous requests must not inherit loopback operator access.');
      assert.match(denied.headers()['cache-control'],/private, no-store/);
    }
  } finally {await anonymous.close();}
  console.log('PASS: anonymous marketing reads are denied on the reserved loopback hostname; local operator bypass is not active.');

  const live=await request(page,'/api/admin/marketing');assert.equal(live.status,200);assert.deepEqual(live.data,source);
  const read=await page.goto(origin+'/api/admin/marketing/readiness',{timeout:120000});assert.equal(read.status(),200);
  assert.match(read.headers()['cache-control'],/private, no-store/);
  const report=await read.json();
  assert.deepEqual(Object.keys(report).sort(),['checkedAt','items']);assert(Number.isFinite(Date.parse(report.checkedAt)));
  assert.equal(report.items.length,4);
  for(const item of report.items) assert.deepEqual(Object.keys(item).sort(),['key','optional','required','state','warnings']);
  assert.deepEqual(report.items.find(item=>item.key==='seller_profile').required,['biography','review']);
  assert.equal(report.items.filter(item=>item.state==='published').length,3);

  for(const [label,width] of [['phone',390],['desktop',1440]]) {
    await page.setViewportSize({width,height:900});
    await page.goto(origin+'/admin/marketing/readiness',{timeout:120000});
    await expect(page.getByRole('heading',{name:'Content Readiness',exact:true})).toBeVisible();
    const seller=page.locator('article#seller_profile');
    await expect(seller.getByText('Needs Content',{exact:true})).toBeVisible();
    await expect(seller.getByText('Approved short biography',{exact:true})).toBeVisible();
    await expect(seller.getByText('Approved main-site phone or email',{exact:true})).toHaveCount(0);
    await expect(seller.getByRole('link',{name:'View Seller Introduction',exact:true})).toHaveCount(0);
    await expect(page.getByText('Published',{exact:true})).toHaveCount(3);
    await seller.getByText('Review Seller Introduction',{exact:true}).click();
    await expect(seller.getByText('content/marketing/seller-introduction.v1.json',{exact:true})).toBeVisible();
    const guide=page.locator('article#old_town_keller');
    await expect(guide.getByRole('link',{name:'View Old Town Keller',exact:true})).toHaveAttribute('href','/neighborhoods/old-town-keller');
    await guide.getByText('Review Old Town Keller',{exact:true}).click();
    await expect(guide.getByText('content/neighborhoods/presentation.v1.json',{exact:true})).toBeVisible();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Readiness must fit the viewport.');
    await page.screenshot({path:artifacts+`publication-${label}.png`,fullPage:true});
  }

  const refreshed=page.waitForResponse(response=>response.url()===origin+'/api/admin/marketing/readiness' && response.status()===200);
  await page.getByRole('button',{name:'Refresh Checks',exact:true}).click();await refreshed;
  await expect(page.locator('article')).toHaveCount(4);
  await page.route('**/api/admin/marketing/readiness',route=>route.fulfill({status:503,json:{error:'Controlled unavailable read.'}}),{times:1});
  await page.getByRole('button',{name:'Refresh Checks',exact:true}).click();
  await expect(page.getByRole('alert').filter({hasText:'Content readiness could not be checked.'})).toBeVisible();
  await expect(page.locator('article')).toHaveCount(0);
  await page.getByRole('button',{name:'Try Again',exact:true}).click();
  await expect(page.locator('article')).toHaveCount(4);
  console.log('PASS: operator publication checks at phone/desktop widths, required/optional content, refresh and failed-read recovery.');

  await page.goto(origin+'/admin/marketing',{timeout:120000});
  const mutations=[];
  page.on('request',entry=>{if(new URL(entry.url()).pathname==='/api/admin/marketing' && entry.method()!=='GET') mutations.push(entry.method());});
  const draftTitle='UNPUBLISHED ACCEPTANCE DRAFT';
  await page.getByLabel('Hero Title',{exact:true}).fill(draftTitle);
  const download=page.waitForEvent('download');
  await page.getByRole('button',{name:'Download Draft',exact:true}).click();
  const file=await download;assert.equal(file.suggestedFilename(),'marketing-copy.draft.json');
  const exported=JSON.parse(await readFile(await file.path(),'utf8'));assert.equal(exported.hero.title,draftTitle);
  await expect(page.getByText('Draft download started. The live site has not changed.',{exact:true})).toBeVisible();
  assert.deepEqual(mutations,[],'Downloading a draft must not call a publication writer.');
  assert.deepEqual((await request(page,'/api/admin/marketing')).data,source);
  const publish=await request(page,'/api/admin/marketing','POST',{hero:{title:draftTitle}});
  assert.equal(publish.status,409);assert.equal(publish.data.code,'MARKETING_PUBLISH_UNAVAILABLE');
  await page.getByRole('link',{name:'Check Content Readiness',exact:true}).click();
  await expect(page.locator('article')).toHaveCount(4);
  console.log('PASS: a draft downloads through the browser without changing repository content; legacy publication remains disabled.');

  const roles={operator:200};
  for(const role of ['realtor','consumer']) {
    const denied=await login({role,untrustedSignup:role==='consumer'});
    if(role==='consumer') {
      await verifyCallback(denied);
      assert.equal(await sql(`SELECT role FROM public.profiles WHERE id='${denied.userId}';`),'consumer','The callback must not promote untrusted signup metadata.');
    }
    for(const path of ['/api/admin/marketing','/api/admin/marketing/readiness']) assert.equal((await request(denied.page,path)).status,403);
    assert.equal((await request(denied.page,'/api/admin/marketing','POST',{})).status,403);
    await denied.page.goto(origin+'/admin/marketing/readiness',{timeout:120000});
    await expect(denied.page.getByRole('alert').filter({hasText:'Site administrator access is required'})).toBeVisible();
    await expect(denied.page.locator('article')).toHaveCount(0);
    assert.deepEqual(denied.pageErrors,[]);roles[role]=403;
  }
  assert.match(primary.userId,/^[a-f0-9-]{36}$/);
  await sql(`UPDATE public.profiles SET role='admin' WHERE id='${primary.userId}';`);
  assert.equal((await request(page,'/api/admin/marketing/readiness')).status,200);roles.admin=200;
  assert.deepEqual(primary.pageErrors,[]);assert.deepEqual(await digest(),before);assert.equal(callbackWrites,2);
  await writeFile(artifacts+'publication-result.json',JSON.stringify({checkedAt:new Date().toISOString(),mockAuth:false,localOperatorBypass:false,roles,
    sourceFilesUnchanged:true,callbackProfileWrites:callbackWrites,guideStates:report.items.map(({key,state})=>({key,state})),widths:[390,1440],draftDownloaded:true,failedReadRecovered:true},null,2));
  console.log('PASS: real operator/admin access, real realtor/consumer denial, bounded readiness response and unchanged source files.');
}

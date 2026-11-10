import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

// Explicitly mocked UI acceptance; database acceptance runs separately.
const base=new URL(process.argv[2]||'http://127.0.0.1:3007');
assert(['127.0.0.1','localhost'].includes(base.hostname),'Only run mocked UI acceptance on a loopback server');
const output=resolve('test-results/internal-consultations');await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
try {
  for(const width of [320,390,1440]) {
    const context=await browser.newContext({viewport:{width,height:1000},timezoneId:'America/Chicago',reducedMotion:'reduce'});
    const page=await context.newPage();
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    const slot={id:'fixture-slot',startsAt:'2026-11-03T18:00:00Z',endsAt:'2026-11-03T18:30:00Z',timeZone:'America/Chicago'};
    const settings={requestId:'dc953f78-07fb-4196-9e61-c83f1c4d185a',expectedRevision:null,enabled:false,timeZone:'America/Chicago',durationMinutes:30,noticeMinutes:120,horizonDays:30,internalCalendarAcknowledged:false,windows:[]};
    let saves=0,reservations=0;
    await page.route('**/api/**',async route=>{
      const url=new URL(route.request().url());const path=url.pathname;
      let body={ok:true};
      if(path==='/api/realtor/consultations') {
        if(route.request().method()==='POST') {
          const saved=route.request().postDataJSON();assert.equal(saved.settings.enabled,true);assert.equal(saved.settings.internalCalendarAcknowledged,true);assert.equal(saved.settings.windows.length,1);assert.equal(saved.ownerId,undefined);saves++;
          body={ok:true,result:{revision:1}};
        } else body={ok:true,result:{sites:[{agentId:'fixture-agent',site:'fixture'}],selected:{agentId:'fixture-agent',site:'fixture'},settings,bookings:[]}};
      } else if(path==='/api/lead-magnets') body={success:true,accepted:true,duplicate:false,bookingOffer:{token:'fixture-capability-memory-only',expiresAt:new Date(Date.now()+900000).toISOString()}};
      else if(path==='/api/seller-consultations/availability') body={status:'available',slots:[slot]};
      else if(path==='/api/seller-consultations/reservations') {reservations++;assert.equal(route.request().postDataJSON().slotId,slot.id);body={status:'confirmed',bookingId:'fixture-booking',startsAt:slot.startsAt,endsAt:slot.endsAt,timeZone:slot.timeZone};}
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
    });
    await page.goto(new URL('/consultations',base).href,{waitUntil:'domcontentloaded',timeout:120000});
    await page.getByText('No hours set. Add the times you want to offer.').waitFor({timeout:30000});
    await page.getByRole('button',{name:'Add Hours',exact:true}).click();
    await page.getByLabel('Start 1',{exact:true}).fill('10:00');await page.getByLabel('End 1',{exact:true}).fill('12:00');
    await page.getByLabel('Allow New Bookings',{exact:true}).check();await page.getByLabel('I will keep these hours free.',{exact:false}).check();
    await page.getByRole('button',{name:'Save Availability',exact:true}).click();
    await page.getByText('Availability saved. New requests can book these hours once booking is configured for this environment.').waitFor();assert.equal(saves,1);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Owner overflow at ${width}`);
    await page.screenshot({path:resolve(output,`owner-${width}.png`),fullPage:true});
    await page.goto(new URL('/seller-plan',base).href,{waitUntil:'domcontentloaded',timeout:120000});
    await page.waitForLoadState('networkidle');
    await page.getByRole('button',{name:'Continue',exact:true}).click();
    await page.getByRole('heading',{name:'When are you thinking?',exact:true}).waitFor();
    await page.getByRole('button',{name:'Continue',exact:true}).click();
    await page.getByLabel('Your name',{exact:true}).fill('Fixture Seller');await page.getByLabel('Email',{exact:true}).fill('fixture@example.test');
    await page.getByLabel('I agree to be contacted to respond to this request.',{exact:true}).check();await page.getByRole('button',{name:'Send Request',exact:true}).click();
    await page.getByRole('button',{name:'Check Available Times',exact:true}).click();await page.getByRole('radio').check();
    await page.getByRole('button',{name:'Book Selected Time',exact:true}).click();await page.getByText(/Your consultation is booked for/).waitFor();assert.equal(reservations,1);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Public overflow at ${width}`);
    assert(!page.url().includes('fixture-capability'));
    assert.equal(await page.evaluate(()=>Object.values({...localStorage,...sessionStorage}).some(value=>value.includes('fixture-capability-memory-only'))),false);
    await page.screenshot({path:resolve(output,`public-${width}.png`),fullPage:true});
    assert.deepEqual(errors,[],`Browser errors at ${width}`);
    console.log(`PASS: mocked owner setup and seller intake-to-booking UI, no overflow, ${width}px`);
    await context.close();
  }
  console.log(`Screenshots: ${output}`);
} finally {await browser.close();}

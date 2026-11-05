import assert from 'node:assert/strict';
import {createHmac,randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';

// Called only after the real-auth harness verifies its generated local stack.
// API responses come from Next + local Supabase. Only a response-loss fault is
// injected; no successful API response or session is fabricated.
export async function sellerConsultationAuthAcceptance({primary,login,request,sql,origin,artifacts,browser,api,anon,signingSecret,guidedSeller=false}) {
  assert(['127.0.0.1','localhost'].includes(new URL(origin).hostname));
  const other=await login();
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  for(const account of [primary,other]) {
    const result=await request(account.page,'/api/realtor/preferences','POST',{timeZone:'America/Chicago',remindersEnabled:true,gamificationEnabled:false,celebrationsEnabled:false,hideAmountsOnToday:true,recordsStartDate:today,expectedRevision:null,requestKey:randomUUID()});
    assert.equal(result.status,200,'real owner personal setup');
  }
  const agent='consultation-acceptance';
  await sql(`INSERT INTO site_config(id,agent_id,subdomain,owner_id,status,branding,agent_profile,integration_profile,compliance_profile)
    VALUES(gen_random_uuid(),'${agent}','${agent}','${primary.userId}','active','{"siteName":"Isolated Calendar Test"}',
      '{"displayName":"Synthetic Calendar Owner","brokerageName":"Test Brokerage","email":"owner@example.test"}',
      '{"leadEmail":"owner@example.test","hotListMlsIds":["TEST-NOT-A-LISTING"]}',
      '{"footerDisclaimer":"Synthetic local test","mlsDisclaimer":"Synthetic local test"}');`);
  assert.equal((await fetch(origin+'/api/realtor/consultations')).status,401,'anonymous calendar reads denied');
  const empty=await request(other.page,'/api/realtor/consultations');assert.equal(empty.status,200);assert.deepEqual(empty.data.result.sites,[]);
  const initial=await request(primary.page,'/api/realtor/consultations');
  assert.equal(initial.status,200,`owner calendar read before rendering: ${initial.data?.error||'unexpected result'}`);
  assert.equal(initial.data.result.selected?.agentId,agent,'real owner calendar selects its owned site');
  await primary.page.goto(origin+'/consultations',{timeout:120000});
  await primary.page.getByText('No hours set. Add the times you want to offer.',{exact:true}).waitFor();
  assert.equal(await primary.page.getByLabel('Allow New Bookings',{exact:true}).isChecked(),false);
  await primary.page.getByRole('button',{name:'Add Hours',exact:true}).click();
  await primary.page.getByLabel('Start 1',{exact:true}).fill('09:00');await primary.page.getByLabel('End 1',{exact:true}).fill('12:00');
  await primary.page.getByLabel('Allow New Bookings',{exact:true}).check();
  await primary.page.getByLabel('I will keep these hours free.',{exact:false}).check();
  await primary.page.getByRole('button',{name:'Save Availability',exact:true}).click();
  await primary.page.getByText('Availability saved. New requests can book these hours once booking is configured for this environment.',{exact:true}).waitFor({timeout:30000});
  const calendar=await request(primary.page,'/api/realtor/consultations');assert.equal(calendar.status,200);assert.equal(calendar.data.result.settings.expectedRevision,1);
  const foreignSave=await request(other.page,'/api/realtor/consultations','POST',{agentId:agent,settings:{...calendar.data.result.settings,requestId:randomUUID()}});
  assert.equal(foreignSave.status,403,'another verified owner cannot modify this calendar');
  console.log('PASS: real authenticated owner sets hours through the UI; anonymous and foreign-owner calendar access is fenced.');

  const visitors=[];
  try {
    async function intake(name, guided=false) {
      const context=await browser.newContext({timezoneId:'America/Chicago'});visitors.push(context);const page=await context.newPage();
      const errors=[];page.on('pageerror',error=>errors.push(error.message));
      let intakePosts=0;page.on('request',req=>{if(new URL(req.url()).pathname==='/api/lead-magnets' && req.method()==='POST') intakePosts++;});
      await page.goto(origin+'/seller-plan'+(guided?'?utm_source=local-acceptance&requestKind=pricing_review':''),{waitUntil:'networkidle',timeout:120000});
      if (guided) {
        const next = () => page.getByRole('button',{name:'Next →',exact:true}).click();
        const choose = async (label) => { await page.getByRole('radio',{name:label,exact:true}).check(); await next(); };
        await page.getByRole('link',{name:'Start Guided Seller Plan',exact:true}).click();
        await page.getByRole('heading',{name:'What’s your next move?',exact:true}).waitFor();
        assert.equal(await page.getByText('Preview Controls',{exact:true}).count(),0);
        assert.equal(await page.getByText('Notice to Consumers',{exact:true}).count(),0,'the entry uses the focused document without global chrome');
        await choose('Sell My Home');
        const street=page.getByLabel('Street Address',{exact:true});
        try { await street.fill('100 Example Lane'); }
        catch {
          const title=await page.getByRole('heading',{level:1}).allTextContents();
          throw new Error(`Guided address did not open. Path: ${new URL(page.url()).pathname}. Heading: ${title.join(', ')}. Browser exceptions: ${errors.length}.`);
        }
        await next();
        await page.getByRole('checkbox',{name:'This Is the Home I Mean',exact:true}).check();await next();
        await page.getByRole('button',{name:'I’m Not Sure About These Details',exact:true}).click();await next();
        await choose('Leave These for Later');await choose('I Own It');await choose('3–6 Months');
        assert(await page.getByRole('radio',{name:'Discuss a Price',exact:true}).isChecked());await next();
        await choose('Yes');await page.getByLabel('Approximate Amount in Dollars',{exact:true}).fill('250000');await next();await next();
        await page.getByLabel('Your Name',{exact:true}).fill(name);
        await page.getByLabel('I’d Like a Response About My Request.',{exact:true}).check();
      } else {
        await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('heading',{name:'When are you thinking?',exact:true}).waitFor();
        await page.getByRole('button',{name:'Continue',exact:true}).click();
        await page.getByLabel('Your name',{exact:true}).fill(name);
        await page.getByLabel('I agree to be contacted to respond to this request.',{exact:true}).check();
      }
      await page.getByLabel('Email',{exact:true}).fill('seller@example.test');
      const savedResponse=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/lead-magnets' && response.request().method()==='POST',{timeout:90000});
      await page.getByRole('button',{name:'Send Request',exact:true}).click();
      let response;
      try {response=await savedResponse;}
      catch {
        const invalid=await page.locator('form').evaluate(form=>Array.from(form.elements).filter(field=>'validity' in field && !field.validity.valid).map(field=>field.name||field.type));
        await page.screenshot({path:artifacts+'consultation-intake-failure.png',fullPage:true});
        throw new Error(`Intake response timed out: ${intakePosts} POST requests; invalid fields: ${invalid.join(',')||'none'}; browser exceptions: ${errors.length}`);
      }
      const payload=await response.json();
      assert.equal(response.status(),201,`real intake must save before offering booking: ${typeof payload.message==='string'?payload.message.slice(0,160):'no message'}`);
      assert(payload.bookingOffer?.token,'new saved intake issues its scoped capability');
      await page.getByRole('button',{name:'Check Available Times',exact:true}).waitFor();
      if (guided) await page.getByRole('heading',{name:'Your Request Is Saved',exact:true}).waitFor();
      const identity=JSON.parse(Buffer.from(payload.bookingOffer.token.split('.')[0],'base64url').toString('utf8')).identity;
      return {page,errors,offer:payload.bookingOffer,identity,submission:response.request().postDataJSON()};
    }
    const first=await intake('Synthetic Booking Seller',guidedSeller);
    const replay=await request(first.page,'/api/lead-magnets','POST',first.submission);
    assert.equal(replay.status,200);assert.equal(replay.data.duplicate,true);assert(!Object.hasOwn(replay.data,'bookingOffer'),'public intake replay never refreshes booking access');
    if (guidedSeller) {
      assert.equal(first.submission.offerVersion,'3');
      assert.deepEqual(first.submission.campaign,{source:'local-acceptance'});
      assert.equal(first.submission.company,'');
      const leadId=first.identity.leadId;
      assert.match(leadId,/^[a-f0-9-]{36}$/);
      assert.equal(await sql(`SELECT count(*) FROM agent_site_leads WHERE id='${leadId}' AND metadata #>> '{sellerPlan,offerVersion}'='3' AND metadata #>> '{sellerPlan,journey,currentMortgage,amount,value}'='25000000' AND message NOT LIKE '%Example Lane%';`),'1');
      assert.equal(await sql("SELECT count(*) FROM agent_site_leads WHERE source='seller_plan' AND name='Synthetic Booking Seller';"),'1','replay keeps exactly one lead');
      assert.equal(await sql(`SELECT count(*) FROM scheduling_bookings WHERE lead_id='${leadId}';`),'0','a receipt alone does not create an appointment');
      const owned=await request(primary.page,`/api/realtor/seller-service?leadId=${leadId}`);
      assert.equal(owned.status,200);assert.equal(owned.data.result.intake.address.line1,'100 Example Lane');
      assert(!Object.hasOwn(owned.data.result.intake,'currentMortgage'));
      const foreign=await request(other.page,`/api/realtor/seller-service?leadId=${leadId}`);
      assert.equal(foreign.status,404);assert(!foreign.data.result?.intake);
      await primary.page.goto(origin+`/seller-cases/${leadId}`,{timeout:120000});
      await primary.page.getByRole('heading',{name:'Seller Request Details',exact:true}).waitFor({timeout:30000});
      assert.equal(await primary.page.getByText('100 Example Lane',{exact:true}).count(),1);
      await first.page.setViewportSize({width:390,height:900});
      assert(await first.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await first.page.screenshot({path:artifacts+'guided-seller-receipt-mobile.png',fullPage:true});
      console.log('PASS: guided form sends one v3 request, replays the saved receipt, and shows its home facts only to the owner. Booking remains separate.');
    }
    await primary.page.goto(origin+'/today',{timeout:120000});
    const dailyFocus=primary.page.getByRole('article',{name:'New request: Synthetic Booking Seller',exact:true});
    await dailyFocus.waitFor({timeout:30000});
    assert.equal(await dailyFocus.getByRole('link',{name:'Open request: Synthetic Booking Seller',exact:true}).getAttribute('href'),'/seller-inbox?leadId='+first.identity.leadId);
    for(const width of [390,1440]) {await primary.page.setViewportSize({width,height:900});assert(await primary.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await primary.page.screenshot({path:artifacts+`consultation-auth-today-${width}.png`,fullPage:true});}
    let attempt,committed;
    await first.page.route('**/api/seller-consultations/reservations',async route=>{
      attempt=route.request().postDataJSON();const response=await route.fetch();
      assert.equal(response.status(),200,'reservation commits before the injected response loss');committed=await response.json();assert.equal(committed.status,'confirmed');
      await route.abort('failed');
    },{times:1});
    const availabilityResponse=first.page.waitForResponse(response=>new URL(response.url()).pathname==='/api/seller-consultations/availability');
    await first.page.getByRole('button',{name:'Check Available Times',exact:true}).click();
    const availability=await availabilityResponse;const availabilityBody=await availability.json();
    assert.equal(availability.status(),200,`real availability: ${typeof availabilityBody.error==='string'?availabilityBody.error.slice(0,160):availabilityBody.status}`);
    await first.page.getByRole('radio').first().check();await first.page.getByRole('button',{name:'Book Selected Time',exact:true}).click();
    await first.page.getByRole('button',{name:'Check This Booking Again',exact:true}).waitFor({timeout:30000});
    assert(committed?.bookingId,'the lost response still committed a booking');
    const retryResponse=first.page.waitForResponse(response=>new URL(response.url()).pathname==='/api/seller-consultations/reservations');
    await first.page.getByRole('button',{name:'Check This Booking Again',exact:true}).click();
    const retry=await retryResponse;assert.equal(retry.status(),200);assert(JSON.stringify(retry.request().postDataJSON())===JSON.stringify(attempt),'browser retries the exact slot, capability and operation UUID');
    assert.equal((await retry.json()).bookingId,committed.bookingId);await first.page.getByText(/Your consultation is booked for/).waitFor();
    for(const table of ['scheduling_attendees','seller_consultation_claims','seller_case_booking_links']) assert.equal(await sql(`SELECT count(*) FROM ${table} WHERE booking_id='${committed.bookingId}';`),'1',`one ${table} record after retry`);
    assert.equal(await sql(`SELECT count(*) FROM realtor_planner_items WHERE source_lead_id='${first.identity.leadId}';`),'1');
    assert.equal(await sql(`SELECT count(*) FROM realtor_reminders r JOIN realtor_planner_occurrences o ON o.id=r.occurrence_id JOIN realtor_planner_items i ON i.id=o.item_id WHERE i.source_lead_id='${first.identity.leadId}' AND r.status='scheduled';`),'1');
    console.log('PASS: real public intake, lost response after commit and exact browser retry preserve one booking, attendee, case link, planner item and reminder.');

    const second=await intake('Synthetic Competing Seller');
    const conflict=await request(second.page,'/api/seller-consultations/reservations','POST',{...attempt,capability:second.offer.token,requestId:randomUUID()});
    assert.equal(conflict.status,409);assert.equal(conflict.data.status,'conflict','a second saved seller cannot claim the same interval');
    assert.equal((await request(other.page,'/api/realtor/consultations/cancel','POST',{bookingId:committed.bookingId})).status,403);
    await primary.page.goto(origin+'/consultations',{timeout:120000});
    const cancelled=primary.page.waitForResponse(response=>new URL(response.url()).pathname==='/api/realtor/consultations/cancel');
    await primary.page.getByRole('button',{name:'Cancel Consultation',exact:true}).click();assert.equal((await cancelled).status(),200);
    assert.equal(await sql(`SELECT count(*) FROM seller_consultation_claims WHERE booking_id='${committed.bookingId}';`),'0');
    assert.equal(await sql(`SELECT count(*) FROM realtor_reminders r JOIN realtor_planner_occurrences o ON o.id=r.occurrence_id JOIN realtor_planner_items i ON i.id=o.item_id WHERE i.source_lead_id='${first.identity.leadId}' AND r.status IN ('scheduled','visible');`),'0');
    const cancelledRetry=await request(first.page,'/api/seller-consultations/reservations','POST',attempt);assert.equal(cancelledRetry.status,200);assert.equal(cancelledRetry.data.status,'cancelled');
    const released=await request(second.page,'/api/seller-consultations/reservations','POST',{...attempt,capability:second.offer.token,requestId:randomUUID()});
    assert.equal(released.status,200);assert.equal(released.data.status,'confirmed','cancellation releases capacity to another saved seller');
    console.log('PASS: real cross-seller conflict, foreign cancellation denial, owner UI cancellation, reminder cleanup and released capacity.');

    const claims=JSON.parse(Buffer.from(second.offer.token.split('.')[0],'base64url').toString('utf8'));
    const sign=payload=>{const encoded=Buffer.from(JSON.stringify(payload)).toString('base64url');return encoded+'.'+createHmac('sha256',signingSecret).update(encoded).digest('base64url');};
    const window={from:new Date().toISOString(),to:new Date(Date.now()+7*86400000).toISOString(),timeZone:'America/Chicago'};
    for(const capability of [second.offer.token+'x',sign({...claims,issuedAt:claims.issuedAt-3600,expiresAt:claims.expiresAt-3600}),sign({...claims,purpose:'not_consultation'})]) assert.equal((await request(second.page,'/api/seller-consultations/availability','POST',{capability,window})).status,403);
    await sql(`UPDATE agent_site_leads SET metadata=jsonb_set(metadata,'{sellerPlan,requestedContact,revokedAt}',to_jsonb(now())) WHERE id='${second.identity.leadId}';`);
    assert.equal((await request(second.page,'/api/seller-consultations/availability','POST',{capability:second.offer.token,window})).status,403,'withdrawn contact permission invalidates booking access');
    const foreign=createClient(api,anon,{auth:{persistSession:false,autoRefreshToken:false}});
    assert.equal((await foreign.auth.signInWithPassword({email:other.email,password:other.password})).error,null);
    const denied=await foreign.from('seller_consultation_settings').select('id');assert.equal(denied.error?.code,'42501','real authenticated JWT cannot read private calendar tables directly');
    await foreign.auth.signOut();
    await primary.page.goto(origin+'/today');await primary.page.getByRole('heading',{name:'Today’s Focus',exact:true}).waitFor({timeout:30000});
    assert.equal(await primary.page.getByRole('link',{name:'Open request: Synthetic Competing Seller',exact:true}).count(),0,'withdrawn seller is not offered as a new-contact action');
    assert.deepEqual(first.errors,[]);assert.deepEqual(second.errors,[]);assert.deepEqual(primary.pageErrors,[]);assert.deepEqual(other.pageErrors,[]);
    console.log('PASS: signed token tamper/expiry/purpose, current consent and real-JWT table grants; Today renders real persisted seller data.');
  } finally {await Promise.all(visitors.map(context=>context.close()));}
}

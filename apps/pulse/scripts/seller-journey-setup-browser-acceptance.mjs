import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

/** Real UI/API/data walkthrough; only the existing generated local stack may call this. */
export async function sellerJourneySetupBrowserAcceptance({primary,client,request,sql,origin,agent,today,artifacts}) {
  const page=primary.page;
  const leadId=randomUUID(),bookingId=randomUUID();
  await sql(`INSERT INTO public.agent_site_leads(id,agent_id,site,source,name,email,message,metadata)
    VALUES('${leadId}','${agent}','seller-service','seller_plan','Journey Seller','journey@example.test','Synthetic journey request',
      jsonb_build_object('sellerPlan',jsonb_build_object('requestedContact',jsonb_build_object('granted',true,'capturedAt',now()))));`);
  const casePath=`/seller-cases/${leadId}`;
  const readCase=async()=>{
    const response=await request(page,`/api/realtor/seller-service?leadId=${leadId}`);
    assert.equal(response.status,200);return response.data.result;
  };
  const journey=page.getByRole('region',{name:'Seller relationship journey',exact:true});
  const stage=name=>journey.getByRole('listitem').filter({has:page.getByText(name,{exact:true})});

  for(const width of [390,1440]) {
    await page.setViewportSize({width,height:900});
    await page.goto(origin+casePath,{timeout:120000});
    await page.getByRole('heading',{name:'Journey Seller',exact:true}).waitFor();
    await journey.getByRole('link',{name:'Review request',exact:true}).waitFor();
    assert.equal(await journey.getByRole('link',{name:'Review request',exact:true}).getAttribute('href'),`/seller-inbox?leadId=${leadId}`);
    await stage('Request received').getByText('Recorded',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Edit preparation',exact:true}).click();
    const drawer=page.getByRole('dialog',{name:'Edit preparation',exact:true});
    const notes=drawer.getByRole('textbox',{name:'Internal notes',exact:true});
    await notes.fill('PRIVATE PREPARATION DRAFT');
    await notes.press('Escape');
    await drawer.getByRole('alertdialog').getByRole('button',{name:'Keep editing',exact:true}).click();
    assert.equal(await notes.inputValue(),'PRIVATE PREPARATION DRAFT','closing keeps the draft until an explicit decision');
    const bounds=await drawer.boundingBox();assert(bounds && bounds.x>=0 && bounds.x+bounds.width<=width);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:artifacts+`preparation-draft-${width}.png`,fullPage:true});
    await notes.press('Escape');
    await drawer.getByRole('alertdialog').getByRole('button',{name:'Discard draft',exact:true}).click();
    await drawer.waitFor({state:'hidden'});
    assert.equal((await readCase()).case,null,'opening, editing, keeping and discarding creates no saved case');
    await page.getByRole('button',{name:'Edit preparation',exact:true}).click();
    assert.equal(await notes.inputValue(),'','discard restores the saved baseline');
    await drawer.getByRole('button',{name:'Close',exact:true}).click();
    await drawer.waitFor({state:'hidden'});
  }

  await page.getByRole('button',{name:'Edit preparation',exact:true}).click();
  const preparation=page.getByRole('dialog',{name:'Edit preparation',exact:true});
  await preparation.getByRole('textbox',{name:'Internal notes',exact:true}).fill('PRIVATE SAVED PREPARATION');
  await preparation.getByRole('button',{name:'Save preparation',exact:true}).click();
  await preparation.waitFor({state:'hidden'});
  let state=await readCase();assert.equal(state.case.notes,'PRIVATE SAVED PREPARATION');
  // The existing confirmation contract accepts at most five minutes in the past.
  const startsAt=new Date(Date.now()-60_000).toISOString(),endsAt=new Date(Date.parse(startsAt)+1800_000).toISOString();
  await sql(`INSERT INTO public.scheduling_bookings(id,uid,title,start_time,end_time,status,funnel_id,lead_id,agent_id,site,appointment_type)
    VALUES('${bookingId}','${bookingId}','Synthetic journey consultation','${startsAt}','${endsAt}','accepted',gen_random_uuid(),'${leadId}','${agent}','seller-service','seller_consultation');`);
  const linked=await request(page,'/api/realtor/seller-service','POST',{leadId,expectedRevision:state.case.revision,requestKey:randomUUID(),action:'link_booking',bookingId});
  assert.equal(linked.status,200,JSON.stringify(linked.data));

  for(const width of [390,1440]) {
    await page.setViewportSize({width,height:900});await page.goto(origin+casePath,{timeout:120000});
    await stage('Consultation scheduled').getByText('Planned',{exact:true}).waitFor();
    assert.equal(Date.parse(await stage('Consultation scheduled').locator('time').getAttribute('datetime')),Date.parse(startsAt));
    await stage('Consultation held').getByText('Next to review',{exact:true}).waitFor();
    assert.equal(await stage('Consultation held').locator('time').count(),0,'a booking does not manufacture a held date');
    assert.equal(await journey.getByRole('link').count(),1,'the next action does not return to the missing older conversation');
    assert.equal(await journey.getByRole('link',{name:'Record consultation',exact:true}).getAttribute('href'),casePath+'#case-milestones');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:artifacts+`journey-planned-${width}.png`,fullPage:true});
  }
  await journey.getByRole('link',{name:'Record consultation',exact:true}).click();
  const milestones=page.locator('#case-milestones');
  if(!await milestones.evaluate(element=>element.open)) await milestones.locator('summary').click();
  await milestones.getByRole('button',{name:'Record a milestone',exact:true}).click();
  const milestone=page.getByRole('dialog',{name:'Record a milestone',exact:true});
  await milestone.getByRole('combobox',{name:'Milestone',exact:true}).selectOption('consultation_held');
  await milestone.getByLabel('Date in America/Chicago',{exact:true}).fill(today);
  await milestone.getByRole('textbox',{name:'Evidence or agreement reference',exact:true}).fill('Synthetic consultation attended by the test seller.');
  await milestone.getByRole('button',{name:'Save milestone',exact:true}).click();
  await milestone.waitFor({state:'hidden'});
  await page.reload();
  await stage('Consultation held').getByText('Recorded',{exact:true}).waitFor();
  assert.equal(await stage('Consultation held').locator('time').getAttribute('datetime'),today);
  await journey.getByRole('link',{name:'Verify agreement',exact:true}).waitFor();
  state=await readCase();
  assert(state.milestoneRecords.some(record=>record.milestone==='consultation_held' && record.occurredOn===today && record.evidence==='Synthetic consultation attended by the test seller.'));
  assert.equal(state.case.notes,'PRIVATE SAVED PREPARATION','saved preparation survives reload and later actions');
  console.log('PASS: responsive preparation keep/discard/save, real planned appointment, explicit held milestone/date/evidence and forward-only next action.');

  const preferences=(await request(client.page,'/api/realtor/preferences')).data.result;
  const preferenceUpdate=await request(client.page,'/api/realtor/preferences','POST',{
    timeZone:preferences.time_zone,remindersEnabled:false,gamificationEnabled:preferences.gamification_enabled,
    celebrationsEnabled:preferences.celebrations_enabled,hideAmountsOnToday:preferences.hide_amounts_on_today,
    recordsStartDate:preferences.records_start_date,expectedRevision:preferences.revision,requestKey:randomUUID(),
  });
  assert.equal(preferenceUpdate.status,200);
  for(const account of [primary,client]) {
    const health=(await request(account.page,'/api/realtor/seller-service/overview')).data.result.health;
    assert.equal(health.plannerConfigured,true);assert.equal(health.timeZone,'America/Chicago');
    assert.equal(health.activeSites,account===primary?1:0);assert.equal(health.remindersEnabled,account===primary);
    assert.equal(Boolean(health.lastRequest),account===primary);assert.equal(health.emailConfigured,false);
    for(const width of [390,1440]) {
      await account.page.setViewportSize({width,height:900});await account.page.goto(origin+'/seller-setup',{timeout:120000});
      await account.page.getByRole('heading',{name:'Set up your seller workflow',exact:true}).waitFor();
      const item=title=>account.page.getByRole('listitem').filter({has:account.page.getByRole('heading',{name:title,exact:true})});
      await item('1. Your day and timezone').getByText('Ready',{exact:true}).waitFor();
      await item('2. Your seller website').getByText(health.activeSites && health.intakeConfigured?'Ready':'Unavailable',{exact:true}).waitFor();
      await item('3. Your reminders').getByText(account===primary?'Ready':'Needs action',{exact:true}).waitFor();
      await item('4. Your first seller request').getByText(account===primary?'Ready':'Needs action',{exact:true}).waitFor();
      assert.equal(await item('1. Your day and timezone').getByRole('link').getAttribute('href'),'/today');
      assert.equal(await item('2. Your seller website').getByRole('link').getAttribute('href'),'/dashboard');
      assert.equal(await item('3. Your reminders').getByRole('link').getAttribute('href'),'/today');
      assert.equal(await item('4. Your first seller request').getByRole('link').getAttribute('href'),account===primary?'/seller-inbox':'/seller-plan');
      const operator=account.page.locator('details').filter({has:account.page.getByText('Operator details',{exact:true})});
      assert.equal(await operator.evaluate(element=>element.open),false);
      await account.page.getByText(/verified mailbox and record those conversations here/).waitFor();
      assert(await account.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await account.page.screenshot({path:artifacts+`setup-${account===primary?'owner':'empty'}-${width}.png`,fullPage:true});
      await operator.locator('summary').click();
      await operator.getByRole('button',{name:'Refresh saved status',exact:true}).click();
      await account.page.getByRole('heading',{name:'Set up your seller workflow',exact:true}).waitFor();
      assert.equal(await operator.evaluate(element=>element.open),false,'refresh reloads saved status with diagnostics collapsed');
    }
  }
  // Inject a failed read only; recovery must use the real authenticated API again.
  const overviewPattern='**/api/realtor/seller-service/overview';
  await page.route(overviewPattern,route=>route.abort('failed'));
  try {
    await page.reload();await page.getByRole('alert').filter({hasText:'We could not read your saved seller status.'}).waitFor();
    assert.equal(await page.getByRole('heading',{name:'1. Your day and timezone',exact:true}).count(),0,'an unreadable setup is not rendered as complete');
  } finally {await page.unroute(overviewPattern);}
  await page.getByRole('button',{name:'Refresh seller status',exact:true}).click();
  await page.getByRole('heading',{name:'1. Your day and timezone',exact:true}).waitFor();
  assert.equal((await request(page,'/api/realtor/preferences')).data.result.reminders_enabled,true,'read recovery does not change saved preferences');
  assert.deepEqual(primary.legacyHistoryReads,[]);assert.deepEqual(client.legacyHistoryReads,[]);
  console.log('PASS: responsive owner/empty-account setup, persisted reminder preference, truthful incomplete states, saved refresh, link targets and failed-read recovery.');
}

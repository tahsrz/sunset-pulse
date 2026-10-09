import assert from 'node:assert/strict';
import {randomUUID,createHmac} from 'node:crypto';
/** Only called by the disposable real-auth harness; all data and receipts are synthetic. */
export async function sellerServiceAcceptance({primary,login,request,sql,origin,artifacts}){
  const client=await login();
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  for(const account of [primary,client]){
    const setup=await request(account.page,'/api/realtor/preferences','POST',{timeZone:'America/Chicago',remindersEnabled:true,gamificationEnabled:false,celebrationsEnabled:false,hideAmountsOnToday:true,recordsStartDate:today,expectedRevision:null,requestKey:randomUUID()});assert.equal(setup.status,200);
  }
  const agent=`seller-service-${randomUUID()}`,leadId=randomUUID(),bookingId=randomUUID();
  await sql(`INSERT INTO public.site_config(id,agent_id,owner_id,status) VALUES(gen_random_uuid(),'${agent}','${primary.userId}','active');
    INSERT INTO public.agent_site_leads(id,agent_id,site,source,name,email,message,metadata) VALUES('${leadId}','${agent}','seller-service','seller_plan','Service Seller','${client.email}','Synthetic request',jsonb_build_object('sellerPlan',jsonb_build_object('requestedContact',jsonb_build_object('granted',true,'capturedAt',now()))));`);
  let state;
  const read=async()=>{const result=await request(primary.page,`/api/realtor/seller-service?leadId=${leadId}`);assert.equal(result.status,200,JSON.stringify(result.data));state=result.data.result;return state;};
  await read();assert.equal(state.case,null);
  assert.equal((await request(client.page,`/api/realtor/seller-service?leadId=${leadId}`)).status,404);
  const save={leadId,expectedRevision:1,requestKey:randomUUID(),action:'save_case',propertyId:null,notes:'PRIVATE CASE NOTE',documents:[{label:'Reviewed document',url:'https://example.test/document'}],checklist:[{id:randomUUID(),title:'Prepare photography',done:false}]};
  assert.equal((await request(primary.page,'/api/realtor/seller-service','POST',save)).status,200);
  const replay=await request(primary.page,'/api/realtor/seller-service','POST',save);assert.equal(replay.data.result.replayed,true);assert.equal(replay.data.result.revision,2);
  assert.equal((await request(primary.page,'/api/realtor/seller-service','POST',{...save,requestKey:randomUUID()})).status,409);
  await read();
  const act=async(fields)=>{const result=await request(primary.page,'/api/realtor/seller-service','POST',{leadId,expectedRevision:state.case?.revision||1,requestKey:randomUUID(),...fields});assert.equal(result.status,200,JSON.stringify(result.data));await read();return result.data.result;};
  await act({action:'milestone',milestone:'consultation_held',occurredOn:today,evidence:'Meeting held with seller.'});
  await act({action:'milestone',milestone:'listing_agreement_verified',occurredOn:today,evidence:'Executed representation agreement verified.'});
  await act({action:'publish_progress',reviewed:true,publication:{summary:'Approved progress',milestones:['consultation_held'],checklist:save.checklist,documents:save.documents}});
  assert.deepEqual((await request(client.page,'/api/seller-portal')).data.result,[]);
  await act({action:'share_progress',enabled:true});
  const shared=await request(client.page,'/api/seller-portal');assert.equal(shared.status,200);assert.equal(shared.data.result[0].publication.summary,'Approved progress');assert(!JSON.stringify(shared.data).includes('PRIVATE CASE NOTE'));assert(!JSON.stringify(shared.data).includes(client.email));
  assert.deepEqual((await request(primary.page,'/api/seller-portal')).data.result,[]);
  await act({action:'share_progress',enabled:false});assert.deepEqual((await request(client.page,'/api/seller-portal')).data.result,[]);
  await act({action:'share_progress',enabled:true});
  await sql(`UPDATE public.agent_site_leads SET email='changed@example.test' WHERE id='${leadId}';`);assert.deepEqual((await request(client.page,'/api/seller-portal')).data.result,[]);
  await sql(`UPDATE public.agent_site_leads SET email='${client.email}' WHERE id='${leadId}';`);await read();
  const startsAt=new Date(Math.ceil((Date.now()+86400_000)/60000)*60000).toISOString(),endsAt=new Date(Date.parse(startsAt)+3600000).toISOString();
  await sql(`INSERT INTO public.scheduling_bookings(id,uid,title,start_time,end_time,status,funnel_id,lead_id,agent_id,site,appointment_type) VALUES('${bookingId}','${bookingId}','Seller consultation','${startsAt}','${endsAt}','accepted',gen_random_uuid(),'${leadId}','${agent}','seller-service','seller_consultation');`);
  const linked=await act({action:'link_booking',bookingId});assert(linked.details.consultationEventId);assert.equal(state.bookings[0].linked,true);
  const contactBefore=Number(await sql(`SELECT count(*) FROM public.seller_lead_events WHERE lead_id='${leadId}' AND event_type='contact_attempted';`));
  const blockedSend=await request(primary.page,'/api/realtor/seller-service','POST',{leadId,expectedRevision:state.case.revision,requestKey:randomUUID(),action:'send_email',reviewed:true,expectedLeadRevision:state.lead.revision,subject:'Reviewed',body:'Synthetic body'});assert.equal(blockedSend.status,403);
  assert.equal(Number(await sql(`SELECT count(*) FROM public.seller_case_messages WHERE lead_id='${leadId}';`)),0);
  console.log('PASS: owner isolation, optimistic replay, evidence, client whitelist, revocation, changed-email fencing and gated email.');

  await primary.page.goto(`${origin}/seller-cases/${leadId}`,{timeout:120000});await primary.page.getByRole('heading',{name:'Service Seller',exact:true}).waitFor();
  await primary.page.getByRole('button',{name:'Open consultation in planner',exact:true}).click();
  await primary.page.getByRole('button',{name:/Schedule appointment/i}).waitFor();
  await primary.page.getByRole('button',{name:/Schedule appointment/i}).click();
  await primary.page.getByText('Saved in the existing planner and reminder infrastructure.',{exact:true}).waitFor();
  assert.equal(Number(await sql(`SELECT count(*) FROM public.realtor_planner_items WHERE source_lead_id='${leadId}';`)),1);
  await sql(`UPDATE public.scheduling_bookings SET status='cancelled' WHERE id='${bookingId}';`);
  assert.equal(Number(await sql(`SELECT count(*) FROM public.realtor_planner_occurrences o JOIN public.realtor_planner_items i ON i.id=o.item_id WHERE i.source_lead_id='${leadId}' AND o.status='pending';`)),0);
  assert.equal(Number(await sql(`SELECT count(*) FROM public.seller_lead_events WHERE lead_id='${leadId}' AND event_type='consultation_cancelled';`)),1);
  await sql(`UPDATE public.scheduling_bookings SET status='accepted',start_time=start_time+interval '1 hour',end_time=end_time+interval '1 hour' WHERE id='${bookingId}';`);
  assert.equal(Number(await sql(`SELECT count(*) FROM public.seller_lead_events WHERE lead_id='${leadId}' AND event_type='consultation_confirmed';`)),2);
  await read();assert.equal(state.events[0].kind,'booking_changed');
  console.log('PASS: accepted booking creates an exact-time existing planner appointment; cancellation fences its work; rescheduling records a fresh consultation.');

  // Exercise worker database fences with synthetic acceptance and signed delivery, without provider traffic.
  const email=await sql(`SELECT public.seller_case_action('${primary.userId}',jsonb_build_object('leadId','${leadId}','expectedRevision',${state.case.revision},'requestKey',gen_random_uuid(),'action','send_email','fromAddress','Verified <sender@example.test>','reviewed',true,'expectedLeadRevision',${state.lead.revision},'subject','Synthetic reviewed message','body','PRIVATE SYNTHETIC BODY'));`);
  const messageId=JSON.parse(email).details.messageId;
  const jobId=await sql(`SELECT job_id FROM public.seller_case_messages WHERE id='${messageId}';`);
  const lease=randomUUID();
  await sql(`UPDATE public.workflow_jobs SET status='running',lease_token='${lease}',lease_until=now()+interval '5 minutes' WHERE id='${jobId}';`);
  const prepared=JSON.parse(await sql(`SELECT public.seller_email_prepare('${jobId}','${lease}','Verified <sender@example.test>');`));assert.equal(prepared.send,true);
  assert.equal(Number(await sql(`SELECT count(*) FROM public.seller_lead_events WHERE lead_id='${leadId}' AND event_type='contact_attempted';`)),contactBefore);
  await assert.rejects(sql(`SELECT public.seller_email_accept('${jobId}','${randomUUID()}','synthetic-provider');`));
  const receiptId=`synthetic-${randomUUID()}`,secret='whsec_c2VsbGVyLXNlcnZpY2UtdGVzdC1zZWNyZXQ=';
  const body=JSON.stringify({type:'email.delivered',created_at:new Date().toISOString(),data:{email_id:receiptId}}),stamp=String(Math.floor(Date.now()/1000)),eventId=`msg_${randomUUID()}`;
  const signature=createHmac('sha256',Buffer.from(secret.slice(6),'base64')).update(`${eventId}.${stamp}.${body}`).digest('base64');
  const response=await fetch(`${origin}/api/webhooks/seller-email`,{method:'POST',headers:{'Content-Type':'application/json','svix-id':eventId,'svix-timestamp':stamp,'svix-signature':`v1,${signature}`},body});assert.equal(response.status,200);
  assert.equal((await fetch(`${origin}/api/webhooks/seller-email`,{method:'POST',headers:{'svix-id':eventId,'svix-timestamp':stamp,'svix-signature':'v1,invalid'},body})).status,401);
  await sql(`SELECT public.seller_email_accept('${jobId}','${lease}','${receiptId}');`);
  assert.equal(await sql(`SELECT status FROM public.seller_case_messages WHERE id='${messageId}';`),'delivered');
  assert.equal(await sql(`SELECT status FROM public.workflow_jobs WHERE id='${jobId}';`),'completed');
  assert.equal(Number(await sql(`SELECT count(*) FROM public.seller_lead_events WHERE lead_id='${leadId}' AND event_type='contact_attempted';`)),contactBefore+1);
  await read();
  await act({action:'record_message',direction:'inbound',subject:'Seller reply',body:'Thanks for the update.',occurredAt:new Date().toISOString()});
  assert.equal(state.messages.some((m)=>m.direction==='inbound'),true);
  await sql(`SELECT public.seller_offer_record('${agent}','seller-service','${randomUUID()}','visit','auth-acceptance');`);
  const visit=randomUUID();await sql(`SELECT public.seller_offer_record('${agent}','seller-service','${visit}','offer_click','auth-acceptance'); SELECT public.seller_offer_record('${agent}','seller-service','${visit}','offer_click','auth-acceptance');`);
  const overview=await request(primary.page,'/api/realtor/seller-service/overview');assert.equal(overview.status,200);assert.equal(overview.data.result.funnel.held,1);assert.equal(overview.data.result.funnel.signed,1);assert.equal(overview.data.result.funnel.requests,1);assert.equal(overview.data.result.funnel.offerClicks,1);assert.equal(overview.data.result.health.lastCompletedJob!==null,true);
  const outsiderOverview=await request(client.page,'/api/realtor/seller-service/overview');assert.equal(outsiderOverview.data.result.funnel.requests,0);
  console.log('PASS: shared worker lease, synthetic acceptance, signed early delivery reconciliation, actual reply capture, deduped measurement and same-cohort funnel.');

  const retryEmail=JSON.parse(await sql(`SELECT public.seller_case_action('${primary.userId}',jsonb_build_object('leadId','${leadId}','expectedRevision',${state.case.revision},'requestKey',gen_random_uuid(),'action','send_email','fromAddress','Verified <sender@example.test>','reviewed',true,'expectedLeadRevision',${state.lead.revision},'subject','Ambiguous retry','body','Synthetic retry'));`)).details.messageId;
  const retryJob=await sql(`SELECT job_id FROM public.seller_case_messages WHERE id='${retryEmail}';`),retryLease=randomUUID();
  await sql(`UPDATE public.workflow_jobs SET status='running',lease_token='${retryLease}',lease_until=now()+interval '5 minutes' WHERE id='${retryJob}'; SELECT public.seller_email_prepare('${retryJob}','${retryLease}','Verified <sender@example.test>'); UPDATE public.seller_case_messages SET attempt_started_at=now()-interval '21 hours' WHERE id='${retryEmail}';`);
  const expired=JSON.parse(await sql(`SELECT public.seller_email_prepare('${retryJob}','${retryLease}','Verified <sender@example.test>');`));assert.equal(expired.send,false);assert.equal(expired.status,'unknown');
  await assert.rejects(sql(`SELECT public.seller_email_accept('${retryJob}','${retryLease}','late-provider');`));
  const revokedLead=randomUUID();await sql(`INSERT INTO public.agent_site_leads(id,agent_id,site,source,name,email,message,metadata) VALUES('${revokedLead}','${agent}','seller-service','seller_plan','Revoked Seller','synthetic@example.test','Synthetic',jsonb_build_object('sellerPlan',jsonb_build_object('requestedContact',jsonb_build_object('granted',true,'capturedAt',now()))));`);
  const revokedMessage=JSON.parse(await sql(`SELECT public.seller_case_action('${primary.userId}',jsonb_build_object('leadId','${revokedLead}','expectedRevision',1,'requestKey',gen_random_uuid(),'action','send_email','fromAddress','Verified <sender@example.test>','reviewed',true,'expectedLeadRevision',1,'subject','Suppressed email','body','Synthetic revoked'));`)).details.messageId;
  const revokedJob=await sql(`SELECT job_id FROM public.seller_case_messages WHERE id='${revokedMessage}';`),revokedLease=randomUUID();
  await sql(`UPDATE public.agent_site_leads SET metadata=jsonb_set(metadata,'{sellerPlan,requestedContact,revokedAt}',to_jsonb(now())) WHERE id='${revokedLead}'; UPDATE public.workflow_jobs SET status='running',lease_token='${revokedLease}',lease_until=now()+interval '5 minutes' WHERE id='${revokedJob}';`);
  const suppressed=JSON.parse(await sql(`SELECT public.seller_email_prepare('${revokedJob}','${revokedLease}','Verified <sender@example.test>');`));assert.equal(suppressed.send,false);assert.equal(suppressed.status,'cancelled');
  console.log('PASS: expired ambiguous attempts never resend; revoked contact permission suppresses a queued message.');

  for(const width of [390,768,1440]){
    await primary.page.setViewportSize({width,height:900});await primary.page.goto(`${origin}/seller-cases/${leadId}`);await primary.page.getByRole('heading',{name:'Service Seller',exact:true}).waitFor();
    assert.equal(await primary.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await primary.page.screenshot({path:artifacts+`seller-case-${width}.png`,fullPage:true});
  }
  await client.page.goto(`${origin}/seller-portal`);await client.page.getByText('Approved progress',{exact:true}).waitFor();assert.equal(await client.page.getByText('PRIVATE CASE NOTE',{exact:true}).count(),0);await client.page.screenshot({path:artifacts+'seller-portal.png',fullPage:true});
  await primary.page.goto(`${origin}/business`);await primary.page.getByRole('heading',{name:'Seller acquisition funnel',exact:true}).waitFor();
  await primary.page.goto(`${origin}/today`);await primary.page.getByRole('heading',{name:'Do next',exact:true}).waitFor();
  await primary.page.goto(`${origin}/seller-setup`);await primary.page.getByRole('heading',{name:'Recorded worker activity',exact:true}).waitFor();await primary.page.screenshot({path:artifacts+'seller-setup.png',fullPage:true});
  assert.deepEqual(primary.pageErrors,[]);assert.deepEqual(client.pageErrors,[]);
  await read();const signedRecord=state.milestoneRecords.find((record)=>record.milestone==='listing_agreement_verified');assert(signedRecord);
  await act({action:'retract_milestone',eventId:signedRecord.eventId,reason:'Correct a synthetic agreement verification.'});
  assert.equal(state.case.sharing_enabled,false);assert.equal(state.case.publication,null);assert.deepEqual((await request(client.page,'/api/seller-portal')).data.result,[]);
  assert.equal((await request(primary.page,'/api/realtor/seller-service/overview')).data.result.funnel.signed,0);
  await act({action:'milestone',milestone:'listing_agreement_verified',occurredOn:today,evidence:'Corrected agreement evidence verified.'});
  assert.equal((await request(primary.page,'/api/realtor/seller-service/overview')).data.result.funnel.signed,1);
  console.log('PASS: milestone correction preserves history, updates cohort counts and withdraws shared progress.');
  // Ownership transfer removes the old owner's case and portal access and never hands private history to the new owner.
  await sql(`UPDATE public.site_config SET owner_id='${client.userId}' WHERE agent_id='${agent}';`);
  assert.equal((await request(primary.page,`/api/realtor/seller-service?leadId=${leadId}`)).status,404);assert.equal((await request(client.page,`/api/realtor/seller-service?leadId=${leadId}`)).status,404);assert.deepEqual((await request(client.page,'/api/seller-portal')).data.result,[]);
  console.log('PASS: responsive owner/client UI, Today priorities, funnel, setup health and site-transfer privacy.');
}

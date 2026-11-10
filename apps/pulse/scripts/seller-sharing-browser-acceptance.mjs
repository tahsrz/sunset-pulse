import assert from 'node:assert/strict';

/** Uses real owner/client cookie sessions supplied by the disposable harness. */
export async function sellerSharingBrowserAcceptance({primary,client,request,origin,leadId,artifacts,expectedChecklist}) {
  const owner=primary.page;
  const actions=[];
  const observe=req=>{
    if(req.method()==='POST' && new URL(req.url()).pathname==='/api/realtor/seller-service') actions.push(req.postDataJSON()?.action||'unknown');
  };
  owner.on('request',observe);
  try {
    await owner.goto(`${origin}/seller-cases/${leadId}`,{timeout:120000});
    await owner.getByRole('heading',{name:'Service Seller',exact:true}).waitFor();
    const summary=owner.locator('summary').filter({has:owner.getByRole('heading',{name:'Shared progress',exact:true})});
    await summary.click();
    await owner.getByRole('button',{name:'Review client update',exact:true}).click();
    const drawer=owner.getByRole('dialog',{name:'Review client update',exact:true});
    await drawer.getByRole('textbox',{name:'Client summary',exact:true}).fill('First preview');
    await drawer.getByRole('checkbox',{name:'Consultation held',exact:true}).check();
    await drawer.getByRole('checkbox',{name:'Prepare photography',exact:true}).check();
    await drawer.getByRole('checkbox',{name:/^Reviewed document/}).check();
    await drawer.getByRole('button',{name:'Preview exact update',exact:true}).click();
    const approval='I reviewed this exact client update and its document links.';
    const publish=drawer.getByRole('button',{name:'Publish reviewed update',exact:true});
    assert.equal(await publish.isDisabled(),true,'preview alone cannot publish');
    await drawer.getByRole('checkbox',{name:approval,exact:true}).check();
    assert.equal(await publish.isEnabled(),true);
    await drawer.getByRole('button',{name:'Back to edit',exact:true}).click();
    // Label text includes a textarea's initial text on remount; use its accessible name.
    const editor=drawer.getByRole('textbox',{name:'Client summary',exact:true});
    assert.equal(await editor.inputValue(),'First preview');
    for(const name of ['Consultation held','Prepare photography']) assert(await drawer.getByRole('checkbox',{name,exact:true}).isChecked(),'returning to edit preserves selections');
    assert(await drawer.getByRole('checkbox',{name:/^Reviewed document/}).isChecked());
    await editor.fill('Approved progress');
    await drawer.getByRole('button',{name:'Preview exact update',exact:true}).click();
    assert.equal(await drawer.getByRole('checkbox',{name:approval,exact:true}).isChecked(),false,'editing invalidates the previous review');
    assert.equal(await publish.isDisabled(),true);
    const preview=drawer.getByRole('region',{name:'Client update preview',exact:true});
    const text=await preview.innerText();
    for(const selected of ['Approved progress','Consultation held','Prepare photography','Reviewed document']) assert(text.includes(selected),'selected saved content is visible in the preview');
    for(const privateText of ['PRIVATE CASE NOTE','PRIVATE CONVERSATION','Private document','https://example.test/private-document']) assert(!text.includes(privateText),'private or unselected content is absent from the exact preview');
    assert.deepEqual(actions,[],'opening, selecting and previewing do not write');
    for(const width of [390,1440]) {
      await owner.setViewportSize({width,height:900});
      const bounds=await drawer.boundingBox();assert(bounds && bounds.x>=0 && bounds.x+bounds.width<=width,'preview drawer fits the viewport');
      assert(await owner.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await owner.screenshot({path:artifacts+`sharing-preview-${width}.png`,fullPage:true});
    }
    await drawer.getByRole('checkbox',{name:approval,exact:true}).check();
    await publish.click();await drawer.waitFor({state:'hidden'});
    assert.deepEqual(actions,['publish_progress'],'only explicit publication writes the update');
    assert.deepEqual((await request(client.page,'/api/seller-portal')).data.result,[],'publication alone does not grant access');
    await client.page.goto(origin+'/seller-portal',{timeout:120000});
    await client.page.getByText(/No progress is shared with this verified account yet/).waitFor();

    async function access(enabled) {
      await owner.getByRole('button',{name:enabled?'Review verified access':'Review revocation',exact:true}).click();
      const dialog=owner.getByRole('dialog',{name:enabled?'Enable verified seller access':'Revoke seller access',exact:true});
      await dialog.waitFor();
      const before=actions.length;
      await dialog.getByRole('button',{name:'Close',exact:true}).click();
      await dialog.waitFor({state:'hidden'});assert.equal(actions.length,before,'closing an access review makes no change');
      await owner.getByRole('button',{name:enabled?'Review verified access':'Review revocation',exact:true}).click();
      await dialog.getByRole('button',{name:enabled?'Enable verified access':'Revoke access',exact:true}).click();
      await dialog.waitFor({state:'hidden'});
      await owner.getByText(`Client access: ${enabled?'enabled':'disabled'}`,{exact:true}).waitFor();
    }
    await access(true);
    await client.page.getByRole('button',{name:'Refresh progress',exact:true}).click();
    await client.page.getByText('Approved progress',{exact:true}).waitFor();
    const shared=await request(client.page,'/api/seller-portal');assert.equal(shared.status,200);
    assert.deepEqual(shared.data.result[0].publication,{summary:'Approved progress',milestones:['consultation_held'],checklist:expectedChecklist,documents:[{label:'Reviewed document',url:'https://example.test/document'}]});
    const clientText=await client.page.locator('main').last().innerText();
    const serialized=JSON.stringify(shared.data);
    for(const privateText of ['PRIVATE CASE NOTE','PRIVATE CONVERSATION','Private document','https://example.test/private-document']) {
      assert(!clientText.includes(privateText),'client HTML excludes private content');assert(!serialized.includes(privateText),'client API excludes private content');
    }
    assert(!serialized.includes(client.email),'publication does not disclose contact details');
    assert.deepEqual((await request(primary.page,'/api/seller-portal')).data.result,[],'a different verified account cannot view this publication');
    for(const width of [390,1440]) {await client.page.setViewportSize({width,height:900});assert(await client.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await client.page.screenshot({path:artifacts+`sharing-client-${width}.png`,fullPage:true});}
    assert.deepEqual(client.legacyHistoryReads,[],'the closed dock does not read unrelated legacy chat history');
    assert.equal(await client.page.locator('nextjs-portal').getByRole('button',{name:'Open issues overlay',exact:true}).count(),0,'the client progress page has no Next development issue badge');
    await access(false);
    await client.page.getByRole('button',{name:'Refresh progress',exact:true}).click();
    await client.page.getByText(/No progress is shared with this verified account yet/).waitFor();
    assert.deepEqual((await request(client.page,'/api/seller-portal')).data.result,[]);
    const revoked=(await request(owner,`/api/realtor/seller-service?leadId=${leadId}`)).data.result.case;
    assert.equal(revoked.sharing_enabled,false);assert.deepEqual(revoked.publication,shared.data.result[0].publication,'revocation preserves the saved publication');
    await access(true); // Preserve the existing suite's enabled-access fixture.
    assert.deepEqual(actions,['publish_progress','share_progress','share_progress','share_progress']);
    console.log('PASS: real browser exact preview, edit invalidation, explicit publication, separate access/revocation, client whitelist and responsive owner/client controls.');
  } catch(error) {
    await owner.screenshot({path:artifacts+'sharing-owner-failure.png',fullPage:true}).catch(()=>{});
    console.error(`Sharing UI diagnostic: dialogs=${await owner.getByRole('dialog').count()}, summary_fields=${await owner.getByRole('textbox',{name:'Client summary',exact:true}).count()}, previews=${await owner.getByRole('region',{name:'Client update preview'}).count()}, writes=${actions.length}`);
    throw error;
  } finally {owner.off('request',observe);}
}

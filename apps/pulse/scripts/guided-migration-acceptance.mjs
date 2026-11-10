import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

export const guidedMigrationFiles = [
  '20261028120000_internal_seller_consultations.sql',
  '20261028123000_internal_seller_calendar_read_grants.sql',
  '20261103150000_profile_role_assignment_guard.sql',
  '20261105170000_guided_seller_intake_retention.sql',
  '20261105180000_guided_buyer_requests.sql',
  '20261106140000_guided_buyer_request_retention.sql',
  '20261110150000_seller_property_profiles.sql',
];

// Only the disposable runner supplies SQL and applies migrations. No remote target is accepted.
export async function rehearseGuidedMigrations({ sql, apply }) {
  const versions = new Set(guidedMigrationFiles.map(file => file.split('_')[0]));
  const readLedger = async () => (await sql('SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;')).split('\n');
  const initial = await readLedger();
  assert(initial.includes('20261007103000') && initial.every(version => !versions.has(version)), 'Expected the pre-release schema.');

  const owner = '90000000-0000-4000-8000-000000000001';
  const lead = '90000000-0000-4000-8000-000000000002';
  const action = '90000000-0000-4000-8000-000000000003';
  const request = '90000000-0000-4000-8000-000000000004';
  const buyerSite = 'guided-rehearsal';
  const replay = `public.save_guided_buyer_request('${buyerSite}','${buyerSite}','${request}',repeat('a',64),
    'Synthetic Buyer','buyer@example.test','{}','{}',false)`;

  await sql(`
    INSERT INTO auth.users(id,email) VALUES ('${owner}','rehearsal-owner@example.test');
    INSERT INTO public.site_config(agent_id,owner_id,subdomain,status) VALUES ('${buyerSite}','${owner}','${buyerSite}','active');
    INSERT INTO public.agent_site_leads(id,agent_id,site,source,name,email,message,metadata)
    VALUES ('${lead}','${buyerSite}','${buyerSite}','seller_plan','Synthetic Seller','seller@example.test','Fixture',
      '{"sellerPlan":{"offerVersion":"3","journey":{"address":"100 Fixture Lane"}}}');
    SELECT public.agent_apply_lead_action('${owner}',
      '{"id":"${lead}","expectedRevision":1,"requestKey":"${action}","action":"note","note":"Fixture"}', '{}');
  `);
  const receiptBefore = JSON.parse(await sql(`SELECT response FROM public.agent_site_lead_action_receipts WHERE request_key='${action}';`));
  assert(receiptBefore.lead.metadata.sellerPlan.journey, 'The old action receipt contains the synthetic answers.');

  await apply(guidedMigrationFiles.slice(0, -2));
  const receiptAfter = JSON.parse(await sql(`SELECT response FROM public.agent_site_lead_action_receipts WHERE request_key='${action}';`));
  delete receiptBefore.lead.metadata.sellerPlan.journey;
  assert.deepEqual(receiptAfter, receiptBefore, 'Only guided answers should be removed from the old receipt.');
  assert.equal(await sql("SELECT has_table_privilege('service_role','public.scheduling_bookings','SELECT') AND has_table_privilege('service_role','public.scheduling_availability','SELECT');"), 't');
  assert.equal(await sql(`SELECT ${replay};`), 'saved');

  await apply(guidedMigrationFiles.slice(-2));
  assert.deepEqual((await readLedger()).filter(version => !initial.includes(version)), [...versions]);
  assert.equal(await sql(`SELECT ${replay};`), 'replayed', 'A buyer row written before retention still replays after upgrade.');
  assert.equal(await sql(`SELECT count(*) FROM public.guided_buyer_requests WHERE submission_id='${request}' AND pruned_at IS NULL AND email='buyer@example.test';`), '1');
  await sql(`DELETE FROM public.guided_buyer_requests WHERE submission_id='${request}';`);
  console.log(`PASS: ${versions.size} migrations applied in order over the prior schema. Existing receipts were scrubbed and buyer replay survived the retention upgrade.`);

  for (const file of ['profile_role_assignment.sql', 'guided_seller_intake_retention.sql', 'guided_buyer_requests.sql', 'seller_property_profiles.sql']) {
    const test = await readFile(new URL(`../supabase/tests/database/${file}`, import.meta.url), 'utf8');
    const output = await sql(`SET search_path = public, extensions;\n${test}`);
    const plan = /^1\.\.(\d+)$/m.exec(output);
    assert(plan && !/^not ok\b/m.test(output) && (output.match(/^ok \d+/gm)?.length ?? 0) === Number(plan[1]), `${file} did not pass its complete pgTAP plan.`);
    console.log(`PASS: ${file} (${plan[1]} assertions)`);
  }
}

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const { Client } = pg;

const localConnectionString = process.env.DATABASE_DIRECT_URL || "postgres://postgres:postgres@localhost:54322/postgres";
const prodConnectionString = process.env.PROD_DATABASE_DIRECT_URL;

const sqlStatements = [
  // 1. Lead Pipeline Stages Enum
  `DO $$ BEGIN
      CREATE TYPE lead_stage AS ENUM ('New', 'Cultivate', 'Appointment', 'Active', 'Under Contract', 'Closed');
  EXCEPTION
      WHEN duplicate_object THEN null;
  END $$;`,

  // 2. Leads Table
  `CREATE TABLE IF NOT EXISTS public.leads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      property_id TEXT,
      budget NUMERIC DEFAULT 0,
      timeframe TEXT,
      source TEXT DEFAULT 'organic',
      stage lead_stage DEFAULT 'New',
      engagement_velocity NUMERIC DEFAULT 0,
      probability NUMERIC DEFAULT 50,
      jamie_notes TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      reengagement_hook JSONB DEFAULT '{}'::jsonb,
      last_activity TIMESTAMPTZ DEFAULT now()
  );`,

  // 3. Campaigns Table
  `CREATE TABLE IF NOT EXISTS public.campaigns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      total_touches INTEGER NOT NULL,
      cadence_days INTEGER DEFAULT 7,
      created_at TIMESTAMPTZ DEFAULT now()
  );`,

  // 4. Campaign Touches Table
  `CREATE TABLE IF NOT EXISTS public.campaign_touches (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
      touch_order INTEGER NOT NULL,
      title TEXT NOT NULL,
      channel TEXT NOT NULL,
      content_template TEXT,
      delay_days INTEGER DEFAULT 7,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(campaign_id, touch_order)
  );`,

  // 5. Lead Campaigns Table
  `CREATE TABLE IF NOT EXISTS public.lead_campaigns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
      campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
      current_touch INTEGER DEFAULT 1,
      next_touch_date DATE NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
  );`,

  // 6. Collections Table
  `CREATE TABLE IF NOT EXISTS public.collections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      property_id TEXT NOT NULL,
      name TEXT DEFAULT 'My Pulse Folder',
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(user_id, property_id)
  );`,

  // 7. Intelligence Events Table
  `CREATE TABLE IF NOT EXISTS public.intelligence_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_type TEXT NOT NULL,
      actor_id TEXT,
      actor_name TEXT,
      target_id TEXT,
      description TEXT NOT NULL,
      metadata JSONB DEFAULT '{}'::jsonb,
      severity TEXT DEFAULT 'INFO',
      created_at TIMESTAMPTZ DEFAULT now()
  );`,

  // 8. Daily Briefings Table
  `CREATE TABLE IF NOT EXISTS public.daily_briefings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMPTZ DEFAULT now(),
      timestamp TEXT,
      simulated_research_hours INTEGER,
      daily_joke TEXT,
      news_articles JSONB,
      consolidated_truth TEXT,
      ozriel_audit JSONB
  );`,

  // 9. Jamie Interactions Table
  `CREATE TABLE IF NOT EXISTS public.jamie_interactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata JSONB DEFAULT '{}'::jsonb,
      timestamp TIMESTAMPTZ DEFAULT now(),
      created_at TIMESTAMPTZ DEFAULT now()
  );`,

  // 10. Enable Row Level Security
  `ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE public.intelligence_events ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE public.daily_briefings ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE public.jamie_interactions ENABLE ROW LEVEL SECURITY;`,

  // 11. Helper functions
  `CREATE OR REPLACE FUNCTION public.is_realtor(user_id UUID)
  RETURNS BOOLEAN
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
  BEGIN
      RETURN EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = user_id AND role = 'realtor'
      );
  END;
  $$;`,

  `CREATE OR REPLACE FUNCTION public.log_intelligence_event(
      p_type TEXT,
      p_description TEXT,
      p_actor_id TEXT DEFAULT NULL,
      p_actor_name TEXT DEFAULT NULL,
      p_target_id TEXT DEFAULT NULL,
      p_metadata JSONB DEFAULT '{}'::jsonb,
      p_severity TEXT DEFAULT 'INFO'
  ) RETURNS UUID LANGUAGE plpgsql AS $$
  DECLARE
      v_event_id UUID;
  BEGIN
      INSERT INTO public.intelligence_events (
          event_type, description, actor_id, actor_name, target_id, metadata, severity
      )
      VALUES (
          p_type, p_description, p_actor_id, p_actor_name, p_target_id, p_metadata, p_severity
      )
      RETURNING id INTO v_event_id;
      
      RETURN v_event_id;
  END;
  $$;`,

  `CREATE OR REPLACE FUNCTION public.process_daily_campaign_touches()
  RETURNS void LANGUAGE plpgsql AS $$
  DECLARE
      v_lead_campaign RECORD;
      v_touch RECORD;
  BEGIN
      FOR v_lead_campaign IN 
          SELECT lc.*, l.name as lead_name 
          FROM public.lead_campaigns lc
          JOIN public.leads l ON lc.lead_id = l.id
          WHERE lc.next_touch_date <= CURRENT_DATE 
          AND lc.status = 'active'
      LOOP
          SELECT * INTO v_touch 
          FROM public.campaign_touches 
          WHERE campaign_id = v_lead_campaign.campaign_id 
          AND touch_order = v_lead_campaign.current_touch;

          IF FOUND THEN
              INSERT INTO public.tasks (
                  title, 
                  description, 
                  priority, 
                  status, 
                  metadata
              )
              VALUES (
                  'Touch #' || v_touch.touch_order || ': ' || v_touch.title || ' for ' || v_lead_campaign.lead_name,
                  v_touch.content_template,
                  'Critical',
                  'Pending',
                  jsonb_build_object(
                      'lead_id', v_lead_campaign.lead_id,
                      'campaign_id', v_lead_campaign.campaign_id,
                      'channel', v_touch.channel
                  )
              );

              IF v_lead_campaign.current_touch < 8 THEN
                  UPDATE public.lead_campaigns SET
                      current_touch = current_touch + 1,
                      next_touch_date = CURRENT_DATE + COALESCE((SELECT delay_days FROM public.campaign_touches WHERE campaign_id = v_lead_campaign.campaign_id AND touch_order = v_lead_campaign.current_touch + 1), 7),
                      updated_at = now()
                  WHERE id = v_lead_campaign.id;
              ELSE
                  UPDATE public.lead_campaigns SET
                      status = 'completed',
                      updated_at = now()
                  WHERE id = v_lead_campaign.id;
              END IF;
          END IF;
      END LOOP;
  END;
  $$;`,

  // 12. RLS POLICIES
  // Leads Policies
  `DROP POLICY IF EXISTS "Consumers see own leads" ON public.leads;`,
  `CREATE POLICY "Consumers see own leads" ON public.leads
      FOR SELECT USING (
          email = (SELECT email FROM public.profiles WHERE id = auth.uid())
      );`,

  `DROP POLICY IF EXISTS "Realtors see all leads" ON public.leads;`,
  `CREATE POLICY "Realtors see all leads" ON public.leads
      FOR ALL USING (
          public.is_realtor(auth.uid())
      );`,

  // Collections Policies
  `DROP POLICY IF EXISTS "Users manage own collections" ON public.collections;`,
  `CREATE POLICY "Users manage own collections" ON public.collections
      FOR ALL USING (user_id = auth.uid());`,

  `DROP POLICY IF EXISTS "Realtors view all collections" ON public.collections;`,
  `CREATE POLICY "Realtors view all collections" ON public.collections
      FOR SELECT USING (
          public.is_realtor(auth.uid())
      );`,

  // Intelligence Events Policies
  `DROP POLICY IF EXISTS "Realtors view intelligence events" ON public.intelligence_events;`,
  `CREATE POLICY "Realtors view intelligence events" ON public.intelligence_events
      FOR SELECT USING (
          public.is_realtor(auth.uid())
      );`,

  // Daily Briefings Policies
  `DROP POLICY IF EXISTS "Allow public read access for daily_briefings" ON public.daily_briefings;`,
  `CREATE POLICY "Allow public read access for daily_briefings" ON public.daily_briefings FOR SELECT USING (true);`,

  `DROP POLICY IF EXISTS "Allow service_role full access for daily_briefings" ON public.daily_briefings;`,
  `CREATE POLICY "Allow service_role full access for daily_briefings" ON public.daily_briefings TO service_role USING (true) WITH CHECK (true);`,

  // Jamie Interactions Policies
  `DROP POLICY IF EXISTS "Users can view own jamie_interactions" ON public.jamie_interactions;`,
  `CREATE POLICY "Users can view own jamie_interactions" ON public.jamie_interactions
      FOR SELECT USING (auth.uid() = user_id);`,

  `DROP POLICY IF EXISTS "Users can insert own jamie_interactions" ON public.jamie_interactions;`,
  `CREATE POLICY "Users can insert own jamie_interactions" ON public.jamie_interactions
      FOR INSERT WITH CHECK (auth.uid() = user_id);`,

  `DROP POLICY IF EXISTS "Allow service_role full access for jamie_interactions" ON public.jamie_interactions;`,
  `CREATE POLICY "Allow service_role full access for jamie_interactions" ON public.jamie_interactions 
      TO service_role USING (true) WITH CHECK (true);`,

  // 13. Default Campaign Seed
  `INSERT INTO public.campaigns (name, description, total_touches, cadence_days)
  SELECT '8x8 New Lead Drip', '8 high-value touches over 8 weeks to convert a new lead.', 8, 7
  WHERE NOT EXISTS (
      SELECT 1 FROM public.campaigns WHERE name = '8x8 New Lead Drip'
  );`,

  `WITH c_id AS (SELECT id FROM public.campaigns WHERE name = '8x8 New Lead Drip' LIMIT 1)
  INSERT INTO public.campaign_touches (campaign_id, touch_order, title, channel, content_template, delay_days)
  SELECT c_id.id, touch.touch_order, touch.title, touch.channel, touch.content_template, touch.delay_days
  FROM c_id, (
    SELECT 1 as touch_order, 'Initial Value Drop' as title, 'Email' as channel, 'Market report for their corridor.' as content_template, 0 as delay_days UNION ALL
    SELECT 2, 'Follow-up Call', 'Call', 'Checking if they saw the report.', 7 UNION ALL
    SELECT 3, 'Tactical SMS', 'SMS', 'Found a similar asset offline.', 7 UNION ALL
    SELECT 4, 'Neighborhood Intel', 'Email', 'School ratings and development pings.', 7 UNION ALL
    SELECT 5, 'Mid-point Check', 'Call', 'Refining their budget/timeframe.', 7 UNION ALL
    SELECT 6, 'Vendor List', 'Email', 'My trusted inspectors and lenders.', 7 UNION ALL
    SELECT 7, 'Social Connection', 'SMS', 'Invite to private client group.', 7 UNION ALL
    SELECT 8, 'Final Transition', 'Call', 'Move to 33-touch sphere or close.', 7
  ) as touch
  WHERE NOT EXISTS (
    SELECT 1 FROM public.campaign_touches ct
    WHERE ct.campaign_id = c_id.id AND ct.touch_order = touch.touch_order
  );`
];

async function runDeploy(connectionString: string, label: string) {
  console.log(`\n🚀 [DEPLOY - ${label}] Starting database schema parity deployment...`);
  const client = new Client({ connectionString, connectionTimeoutMillis: 10000 });
  try {
    await client.connect();
    console.log(`✅ [DEPLOY - ${label}] Connected successfully.`);

    let executed = 0;
    let errors = 0;

    for (let i = 0; i < sqlStatements.length; i++) {
      const stmt = sqlStatements[i].trim();
      try {
        await client.query(stmt);
        executed++;
      } catch (err: any) {
        // Safe to ignore duplicate table or type error codes if they occur
        const isDuplicate = err.message.includes('already exists') || err.code === '42P07' || err.code === '42710';
        if (isDuplicate) {
          executed++; // Count as handled/skipped successfully
        } else {
          errors++;
          console.error(`❌ [DEPLOY - ${label}] Error executing statement #${i + 1}:`, err.message);
          console.error(`Statement context:\n${stmt.substring(0, 200)}...`);
        }
      }
    }

    console.log(`📊 [DEPLOY - ${label}] Completed: ${executed} statements processed successfully, ${errors} non-duplicate errors.`);
  } catch (err: any) {
    console.error(`❌ [DEPLOY - ${label}] Connection or critical execution error:`, err.message);
  } finally {
    await client.end();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const runLocal = args.includes('--local') || args.includes('-l');
  const runProd = args.includes('--production') || args.includes('-p');

  if (!runLocal && !runProd) {
    console.log('⚠️ Please specify target: --local (-l) and/or --production (-p)');
    console.log('Example: npx tsx apps/pulse/scripts/deploy-missing-tables.ts --local --production');
    process.exit(1);
  }

  if (runLocal) {
    await runDeploy(localConnectionString, 'LOCAL');
  }

  if (runProd) {
    await runDeploy(prodConnectionString, 'PRODUCTION');
  }
}

main();

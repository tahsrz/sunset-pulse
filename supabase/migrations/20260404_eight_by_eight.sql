-- 1. Create Lead Pipeline Stages Enum
DO $$ BEGIN
    CREATE TYPE lead_stage AS ENUM ('New', 'Cultivate', 'Appointment', 'Active', 'Under Contract', 'Closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Leads Table (Mirrors MongoDB but optimized for SQL + Pipeline)
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    property_id TEXT, -- Reference to property
    budget NUMERIC DEFAULT 0,
    timeframe TEXT,
    source TEXT DEFAULT 'organic',
    stage lead_stage DEFAULT 'New',
    engagement_velocity NUMERIC DEFAULT 0,
    probability NUMERIC DEFAULT 50,
    jamie_notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Campaigns Table (e.g., "8x8 New Lead", "33 Touch Sphere")
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    total_touches INTEGER NOT NULL,
    cadence_days INTEGER DEFAULT 7, -- Default interval
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create Campaign Touches (The actual "8 items")
CREATE TABLE IF NOT EXISTS public.campaign_touches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    touch_order INTEGER NOT NULL, -- 1 to 8
    title TEXT NOT NULL,
    channel TEXT NOT NULL, -- SMS, Email, Call, Hand-written Note
    content_template TEXT, -- The "Script" for Jamie to follow
    delay_days INTEGER DEFAULT 7, -- Days from previous touch
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create Lead Campaigns (Tracking progress)
CREATE TABLE IF NOT EXISTS public.lead_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    current_touch INTEGER DEFAULT 1,
    next_touch_date DATE NOT NULL,
    status TEXT DEFAULT 'active', -- active, paused, completed
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Insert Default 8x8 Campaign
INSERT INTO public.campaigns (name, description, total_touches, cadence_days)
VALUES ('8x8 New Lead Drip', '8 high-value touches over 8 weeks to convert a new lead.', 8, 7)
ON CONFLICT DO NOTHING;

-- Seed the 8 touches for the first campaign (assuming UUIDs are handled, but for migration we use a subquery)
WITH c_id AS (SELECT id FROM public.campaigns WHERE name = '8x8 New Lead Drip' LIMIT 1)
INSERT INTO public.campaign_touches (campaign_id, touch_order, title, channel, content_template, delay_days)
SELECT id, 1, 'Initial Value Drop', 'Email', 'Market report for their corridor.', 0 FROM c_id UNION ALL
SELECT id, 2, 'Follow-up Call', 'Call', 'Checking if they saw the report.', 7 FROM c_id UNION ALL
SELECT id, 3, 'Tactical SMS', 'SMS', 'Found a similar asset offline.', 7 FROM c_id UNION ALL
SELECT id, 4, 'Neighborhood Intel', 'Email', 'School ratings and development pings.', 7 FROM c_id UNION ALL
SELECT id, 5, 'Mid-point Check', 'Call', 'Refining their budget/timeframe.', 7 FROM c_id UNION ALL
SELECT id, 6, 'Vendor List', 'Email', 'My trusted inspectors and lenders.', 7 FROM c_id UNION ALL
SELECT id, 7, 'Social Connection', 'SMS', 'Invite to private client group.', 7 FROM c_id UNION ALL
SELECT id, 8, 'Final Transition', 'Call', 'Move to 33-touch sphere or close.', 7 FROM c_id
ON CONFLICT DO NOTHING;

-- 7. Automated Task Creation (Jamie's To-Do Queue)
-- This function finds touches due today and injects them into the tasks table
CREATE OR REPLACE FUNCTION public.process_daily_campaign_touches()
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    v_lead_campaign RECORD;
    v_touch RECORD;
    v_sprint_id UUID;
BEGIN
    FOR v_lead_campaign IN 
        SELECT lc.*, l.name as lead_name 
        FROM public.lead_campaigns lc
        JOIN public.leads l ON lc.lead_id = l.id
        WHERE lc.next_touch_date <= CURRENT_DATE 
        AND lc.status = 'active'
    LOOP
        -- Get the specific touch details
        SELECT * INTO v_touch 
        FROM public.campaign_touches 
        WHERE campaign_id = v_lead_campaign.campaign_id 
        AND touch_order = v_lead_campaign.current_touch;

        IF FOUND THEN
            -- Inject into tasks table as a Critical priority action for Jamie
            -- We assume a "Global Campaign Sprint" exists or we create one
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

            -- Update lead_campaign for next touch
            IF v_lead_campaign.current_touch < 8 THEN
                UPDATE public.lead_campaigns SET
                    current_touch = current_touch + 1,
                    next_touch_date = CURRENT_DATE + (SELECT delay_days FROM public.campaign_touches WHERE campaign_id = v_lead_campaign.campaign_id AND touch_order = v_lead_campaign.current_touch + 1),
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
$$;

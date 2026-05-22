-- Tenant site subscription foundation
-- Supports word.sunsetpulse.app routing and stores the customer-owned site config.

-- Fix for enum mismatch: Ensure 'role' is TEXT to support 'operator' and 'admin'
-- This resolves: invalid input value for enum user_role: "operator"
DO $$ 
BEGIN
    -- Only attempt conversion if the column exists and is of the custom enum type
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'role' 
        AND udt_name = 'user_role'
    ) THEN
        -- Drop dependent policies first
        DROP POLICY IF EXISTS "Realtors can view all profiles" ON public.profiles;
        DROP POLICY IF EXISTS "Realtors see all leads" ON public.leads;
        DROP POLICY IF EXISTS "Realtor full access to workflows" ON public.workflows;
        DROP POLICY IF EXISTS "Realtor full access to sprints" ON public.sprints;
        DROP POLICY IF EXISTS "Realtor full access to tasks" ON public.tasks;
        DROP POLICY IF EXISTS "Realtors view all collections" ON public.collections;
        DROP POLICY IF EXISTS "Realtors manage all comments" ON public.property_comments;
        DROP POLICY IF EXISTS "Realtors view intelligence events" ON public.intelligence_events;

        -- Alter the column
        ALTER TABLE public.profiles ALTER COLUMN role TYPE TEXT;
        ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'consumer';
        
        -- Add check constraint for allowed roles
        ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('consumer', 'realtor', 'operator', 'admin'));

        -- Recreate policies
        CREATE POLICY "Realtors can view all profiles" ON public.profiles
            FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'realtor'));
        
        CREATE POLICY "Realtors see all leads" ON public.leads
            FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'realtor'));
            
        CREATE POLICY "Realtor full access to workflows" ON public.workflows 
            FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'realtor'));
            
        CREATE POLICY "Realtor full access to sprints" ON public.sprints 
            FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'realtor'));
            
        CREATE POLICY "Realtor full access to tasks" ON public.tasks 
            FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'realtor'));
            
        CREATE POLICY "Realtors view all collections" ON public.collections
            FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'realtor'));

        CREATE POLICY "Realtors manage all comments" ON public.property_comments
            FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'realtor'));

        CREATE POLICY "Realtors view intelligence events" ON public.intelligence_events
            FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'realtor'));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.site_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    agent_id TEXT UNIQUE NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    owner_name TEXT,
    subdomain TEXT,
    custom_domain TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('active', 'draft', 'suspended')),
    subscription_tier TEXT DEFAULT 'site' CHECK (subscription_tier IN ('free', 'starter', 'site', 'atlas', 'enterprise')),
    branding JSONB DEFAULT '{}'::jsonb,
    hero JSONB DEFAULT '{}'::jsonb,
    intelligence JSONB DEFAULT '{}'::jsonb,
    sections JSONB DEFAULT '[]'::jsonb,
    jamie_system_prompt TEXT,
    abidan_prompts JSONB DEFAULT '{}'::jsonb,
    model_matrix JSONB DEFAULT '{}'::jsonb,
    operational_settings JSONB DEFAULT '{}'::jsonb,
    last_modified_by TEXT DEFAULT 'Jamie'
);

ALTER TABLE public.site_config ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.site_config ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE public.site_config ADD COLUMN IF NOT EXISTS subdomain TEXT;
ALTER TABLE public.site_config ADD COLUMN IF NOT EXISTS custom_domain TEXT;
ALTER TABLE public.site_config ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE public.site_config ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'site';
ALTER TABLE public.site_config ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.site_config ADD COLUMN IF NOT EXISTS hero JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.site_config ADD COLUMN IF NOT EXISTS intelligence JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.site_config ADD COLUMN IF NOT EXISTS sections JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.site_config ADD COLUMN IF NOT EXISTS jamie_system_prompt TEXT;
ALTER TABLE public.site_config ADD COLUMN IF NOT EXISTS abidan_prompts JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.site_config ADD COLUMN IF NOT EXISTS model_matrix JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.site_config ADD COLUMN IF NOT EXISTS operational_settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.site_config ADD COLUMN IF NOT EXISTS last_modified_by TEXT DEFAULT 'Jamie';

CREATE UNIQUE INDEX IF NOT EXISTS site_config_subdomain_unique_idx
ON public.site_config (lower(subdomain))
WHERE subdomain IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS site_config_custom_domain_unique_idx
ON public.site_config (lower(custom_domain))
WHERE custom_domain IS NOT NULL;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS site_subdomain TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_site_subdomain_unique_idx
ON public.profiles (lower(site_subdomain))
WHERE site_subdomain IS NOT NULL;

ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_site_config_updated_at ON public.site_config;
CREATE TRIGGER set_site_config_updated_at
BEFORE UPDATE ON public.site_config
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS "Site config is publicly readable" ON public.site_config;
CREATE POLICY "Site config is publicly readable"
ON public.site_config
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Owners and operators can insert site config" ON public.site_config;
CREATE POLICY "Owners and operators can insert site config"
ON public.site_config
FOR INSERT
TO authenticated
WITH CHECK (
    owner_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('realtor', 'operator', 'admin')
    )
);

DROP POLICY IF EXISTS "Owners and operators can update site config" ON public.site_config;
CREATE POLICY "Owners and operators can update site config"
ON public.site_config
FOR UPDATE
TO authenticated
USING (
    owner_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('realtor', 'operator', 'admin')
    )
)
WITH CHECK (
    owner_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('realtor', 'operator', 'admin')
    )
);

DROP POLICY IF EXISTS "Service role can manage site config" ON public.site_config;
CREATE POLICY "Service role can manage site config"
ON public.site_config
TO service_role
USING (true)
WITH CHECK (true);

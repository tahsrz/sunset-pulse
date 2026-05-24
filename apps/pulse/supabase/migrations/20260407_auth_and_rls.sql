-- 1. Role Enum
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('consumer', 'realtor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    username TEXT,
    full_name TEXT,
    avatar_url TEXT,
    role user_role DEFAULT 'consumer',
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);
-- Enable RLS on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- 3. Automatic Profile Creation Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, avatar_url, role)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'user_name', 
    new.raw_user_meta_data->>'avatar_url',
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'consumer')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- 4. RLS POLICIES

-- Helper to check if a user is a realtor (SECURITY DEFINER to bypass RLS recursion on profiles)
CREATE OR REPLACE FUNCTION public.is_realtor(user_id UUID)
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
$$;

-- Profiles: Users can view their own profile, Realtors can view all profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Realtors can view all profiles" ON public.profiles;
CREATE POLICY "Realtors can view all profiles" ON public.profiles
    FOR SELECT USING (
        public.is_realtor(auth.uid())
    );
-- Leads: Consumers can see leads matching their email, Realtors see all
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Consumers see own leads" ON public.leads;
CREATE POLICY "Consumers see own leads" ON public.leads
    FOR SELECT USING (
        email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    );
DROP POLICY IF EXISTS "Realtors see all leads" ON public.leads;
CREATE POLICY "Realtors see all leads" ON public.leads
    FOR ALL USING (
        public.is_realtor(auth.uid())
    );
-- Workflows/Sprints/Tasks: Realtor Only
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Realtor full access to workflows" ON public.workflows;
CREATE POLICY "Realtor full access to workflows" ON public.workflows FOR ALL USING (public.is_realtor(auth.uid()));
DROP POLICY IF EXISTS "Realtor full access to sprints" ON public.sprints;
CREATE POLICY "Realtor full access to sprints" ON public.sprints FOR ALL USING (public.is_realtor(auth.uid()));
DROP POLICY IF EXISTS "Realtor full access to tasks" ON public.tasks;
CREATE POLICY "Realtor full access to tasks" ON public.tasks FOR ALL USING (public.is_realtor(auth.uid()));
-- Collections: Users see own, Realtors see all (for recon)
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own collections" ON public.collections;
CREATE POLICY "Users manage own collections" ON public.collections
    FOR ALL USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Realtors view all collections" ON public.collections;
CREATE POLICY "Realtors view all collections" ON public.collections
    FOR SELECT USING (
        public.is_realtor(auth.uid())
    );
-- Comments: Users see all on property, but manage own. Realtors full access.
ALTER TABLE public.property_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone authenticated can view comments" ON public.property_comments;
CREATE POLICY "Anyone authenticated can view comments" ON public.property_comments
    FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users manage own comments" ON public.property_comments;
CREATE POLICY "Users manage own comments" ON public.property_comments
    FOR ALL USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Realtors manage all comments" ON public.property_comments;
CREATE POLICY "Realtors manage all comments" ON public.property_comments
    FOR ALL USING (
        public.is_realtor(auth.uid())
    );
-- Intelligence Events: Realtor Only
ALTER TABLE public.intelligence_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Realtors view intelligence events" ON public.intelligence_events;
CREATE POLICY "Realtors view intelligence events" ON public.intelligence_events
    FOR SELECT USING (
        public.is_realtor(auth.uid())
    );

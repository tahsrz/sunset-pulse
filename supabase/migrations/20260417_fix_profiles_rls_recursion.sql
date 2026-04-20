-- Migration: Fix Recursive RLS on Profiles and Align Column Names
-- This resolves the 500 Internal Server Error when querying profiles

-- 1. Create a security definer function to check role without recursion
CREATE OR REPLACE FUNCTION public.check_is_realtor()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'realtor'
  );
END;
$$;

-- 2. Drop the problematic recursive policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Realtors can view all profiles" ON public.profiles;

-- 3. Re-create non-recursive policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Realtors can view all profiles" ON public.profiles
    FOR SELECT USING (public.check_is_realtor());

-- 4. Ensure column consistency (Fixing the user_name vs username confusion)
-- We standardized on 'username' in initial migrations, but some used 'user_name'
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='user_name') THEN
    -- If user_name exists, sync data to username and potentially drop it or keep as alias
    UPDATE public.profiles SET username = COALESCE(username, user_name);
  ELSE
    -- Ensure username exists
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
  END IF;
END $$;

-- 5. Fix other potential recursive policies in related tables
DROP POLICY IF EXISTS "Realtors see all leads" ON public.leads;
CREATE POLICY "Realtors see all leads" ON public.leads
    FOR ALL USING (public.check_is_realtor());

DROP POLICY IF EXISTS "Realtor full access to workflows" ON public.workflows;
CREATE POLICY "Realtor full access to workflows" ON public.workflows 
    FOR ALL USING (public.check_is_realtor());

DROP POLICY IF EXISTS "Realtor full access to sprints" ON public.sprints;
CREATE POLICY "Realtor full access to sprints" ON public.sprints 
    FOR ALL USING (public.check_is_realtor());

DROP POLICY IF EXISTS "Realtor full access to tasks" ON public.tasks;
CREATE POLICY "Realtor full access to tasks" ON public.tasks 
    FOR ALL USING (public.check_is_realtor());

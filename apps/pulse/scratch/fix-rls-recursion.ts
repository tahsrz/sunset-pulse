import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../apps/.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// OVERRIDE to connect to Supabase's main postgres database instead of calendso
process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:54322/postgres";
process.env.DATABASE_DIRECT_URL = "postgresql://postgres:postgres@localhost:54322/postgres";

async function fix() {
  try {
    const prismaModule = await import('../lib/core/prisma');
    const prisma = prismaModule.prisma;

    console.log('🔗 [RLS_FIX] Connecting to Supabase postgres database...');

    const queries = [
      // 1. Create is_realtor helper function as SECURITY DEFINER
      `
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
      `,

      // 2. Drop the old recursive profiles policy
      `DROP POLICY IF EXISTS "Realtors can view all profiles" ON public.profiles;`,

      // 3. Recreate profiles policy using the helper function to avoid infinite recursion
      `
      CREATE POLICY "Realtors can view all profiles" ON public.profiles
          FOR SELECT TO authenticated USING (
              public.is_realtor(auth.uid())
          );
      `,

      // 4. Update the other policies referencing profiles table for select/all
      `DROP POLICY IF EXISTS "Realtors see all leads" ON public.leads;`,
      `
      CREATE POLICY "Realtors see all leads" ON public.leads
          FOR ALL USING (
              public.is_realtor(auth.uid())
          );
      `,

      `DROP POLICY IF EXISTS "Realtor full access to workflows" ON public.workflows;`,
      `
      CREATE POLICY "Realtor full access to workflows" ON public.workflows FOR ALL USING (
          public.is_realtor(auth.uid())
      );
      `,

      `DROP POLICY IF EXISTS "Realtor full access to sprints" ON public.sprints;`,
      `
      CREATE POLICY "Realtor full access to sprints" ON public.sprints FOR ALL USING (
          public.is_realtor(auth.uid())
      );
      `,

      `DROP POLICY IF EXISTS "Realtor full access to tasks" ON public.tasks;`,
      `
      CREATE POLICY "Realtor full access to tasks" ON public.tasks FOR ALL USING (
          public.is_realtor(auth.uid())
      );
      `,

      `DROP POLICY IF EXISTS "Realtors view all collections" ON public.collections;`,
      `
      CREATE POLICY "Realtors view all collections" ON public.collections
          FOR SELECT USING (
              public.is_realtor(auth.uid())
          );
      `,

      `DROP POLICY IF EXISTS "Realtors manage all comments" ON public.property_comments;`,
      `
      CREATE POLICY "Realtors manage all comments" ON public.property_comments
          FOR ALL USING (
              public.is_realtor(auth.uid())
          );
      `,

      `DROP POLICY IF EXISTS "Realtors view intelligence events" ON public.intelligence_events;`,
      `
      CREATE POLICY "Realtors view intelligence events" ON public.intelligence_events
          FOR SELECT USING (
              public.is_realtor(auth.uid())
          );
      `
    ];

    for (let i = 0; i < queries.length; i++) {
      console.log(`⚡ [RLS_FIX] Executing query ${i + 1}/${queries.length}...`);
      await prisma.$executeRawUnsafe(queries[i]);
    }

    console.log('✅ [RLS_FIX] Recursion fixes successfully executed on local Supabase postgres database.');
  } catch (error) {
    console.error('❌ [RLS_FIX] Failed to apply RLS policy recursion fixes:', error);
  }
}

fix();

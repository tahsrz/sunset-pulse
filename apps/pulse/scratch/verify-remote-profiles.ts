import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabaseAnon = createClient(supabaseUrl, anonKey);
const supabaseService = createClient(supabaseUrl, serviceKey);

async function verify() {
  console.log('🔗 [VERIFY] Connecting to remote Supabase REST API...');
  console.log('🔗 URL:', supabaseUrl);

  try {
    // 1. Fetch profiles using Service Role Key (bypasses RLS) to see who exists
    console.log('\n--- 1. Fetching profiles with SERVICE_ROLE key ---');
    const { data: allProfiles, error: serviceError } = await supabaseService
      .from('profiles')
      .select('id, email, role')
      .limit(5);

    if (serviceError) {
      console.error('❌ Service role error:', serviceError.message);
      return;
    }

    console.log(`✅ Found ${allProfiles?.length} profiles in remote database:`);
    console.log(allProfiles);

    if (!allProfiles || allProfiles.length === 0) {
      console.log('ℹ️ No profiles found in remote database. Testing with non-existent ID using Anon Key...');
    } else {
      // 2. Try fetching the first existing profile using the Anon Key
      const testId = allProfiles[0].id;
      console.log(`\n--- 2. Fetching profile ID ${testId} with ANON key ---`);
      
      const { data: anonProfile, error: anonError } = await supabaseAnon
        .from('profiles')
        .select('*')
        .eq('id', testId)
        .maybeSingle();

      if (anonError) {
        console.error('❌ Anon key error:', anonError.message);
        if (anonError.message.includes('recursion')) {
          console.error('🚨 Infinite recursion is STILL detected!');
        }
      } else {
        console.log('✅ Fetch completed successfully with Anon Key!');
        console.log('👤 Profile Data:', anonProfile);
      }
    }
  } catch (err) {
    console.error('❌ Catch block error:', err);
  }
}

verify();

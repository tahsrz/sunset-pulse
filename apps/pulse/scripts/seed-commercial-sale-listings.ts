import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { commercialSaleListings } from '../config/commercial_sale_listings';
import { soldClydeListingMlsId } from '../config/tour_hot_list';

async function main() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('The Supabase URL and service role key are required.');

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { error: importError } = await supabase
    .from('properties')
    .upsert(commercialSaleListings, { onConflict: 'mls_id', ignoreDuplicates: true });
  if (importError) throw importError;

  const { error: soldError } = await supabase
    .from('properties')
    .update({ listing_status: 'Sold', is_featured: false })
    .eq('mls_id', soldClydeListingMlsId)
    .in('listing_status', ['Active', 'Active Under Contract', 'Coming Soon'])
    .is('deleted_at', null);
  if (soldError) throw soldError;

  console.log('Commercial-sale listings imported. Existing listing records were preserved.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

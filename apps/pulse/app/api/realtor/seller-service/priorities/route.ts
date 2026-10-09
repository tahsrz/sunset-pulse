import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { realtorApi } from '@/lib/realtor-workspace/http.server';
import { throwRealtorRpcError } from '@/lib/realtor-workspace/access.server';
import { sellerPrioritiesSchema } from '@/lib/realtor-workspace/sellerOverviewContract';
export const dynamic='force-dynamic';
export function GET(request:NextRequest){return realtorApi(request,async(actor)=>{const {data,error}=await supabaseAdmin.rpc('seller_service_priorities',{p_actor_id:actor});if(error)throwRealtorRpcError(error.code);return sellerPrioritiesSchema.parse(data);});}

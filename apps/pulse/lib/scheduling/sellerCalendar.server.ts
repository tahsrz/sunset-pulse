import 'server-only';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { requirePersonalRealtorWorkspace, RealtorWorkspaceError, throwRealtorRpcError } from '@/lib/realtor-workspace/access.server';
import { sellerCalendarSettingsSchema } from './sellerConsultationContract';

const siteRow = z.object({ agent_id:z.string(),subdomain:z.string().nullable().optional() });
const configRow = z.object({ id:z.string().guid(),schedule_id:z.string().guid(),enabled:z.boolean(),time_zone:z.string(),duration_minutes:z.number(),notice_minutes:z.number(),horizon_days:z.number(),revision:z.number() });
const bookingRows = z.array(z.object({ id:z.string().guid(),lead_id:z.string().guid().nullable(),start_time:z.string(),end_time:z.string(),status:z.enum(['accepted','cancelled']) })).max(50);

function siteKey(row: z.infer<typeof siteRow>) {
  const configured = process.env.KELLER_WESTLAKE_AGENT_SITE?.trim().toLowerCase();
  return configured && [row.agent_id,row.subdomain,`${configured}-site`===row.agent_id?configured:null].includes(configured)
    ? configured : row.subdomain || row.agent_id;
}

async function ownedCalendar(actorId: string, requestedAgent?: string) {
  const {preferences} = await requirePersonalRealtorWorkspace(actorId);
  const {data,error} = await supabaseAdmin.from('site_config').select('agent_id,subdomain').eq('owner_id',actorId).eq('status','active').limit(50);
  if (error) throw new RealtorWorkspaceError('FAILED');
  const sites = z.array(siteRow).max(50).parse(data || []).map(row=>({agentId:row.agent_id,site:siteKey(row)}));
  const selected = requestedAgent ? sites.find(site=>site.agentId===requestedAgent) : sites[0];
  if (requestedAgent && !selected) throw new RealtorWorkspaceError('FORBIDDEN');
  return { sites,selected,preferences };
}

export async function readSellerCalendar(actorId: string, requestedAgent?: string) {
  const {sites,selected,preferences} = await ownedCalendar(actorId,requestedAgent);
  if (!selected) return {sites,selected:null,settings:null,bookings:[]};
  const {data,error} = await supabaseAdmin.from('seller_consultation_settings').select('id,schedule_id,enabled,time_zone,duration_minutes,notice_minutes,horizon_days,revision')
    .eq('agent_id',selected.agentId).eq('site',selected.site).eq('owner_id',actorId).maybeSingle();
  if (error) throw new RealtorWorkspaceError('FAILED');
  const cfg = data ? configRow.parse(data) : null;
  let windows: Array<{weekday:number;start:string;end:string}> = [];
  if (cfg) {
    const {data:availability,error:availabilityError} = await supabaseAdmin.from('scheduling_availability').select('days,start_time,end_time').eq('schedule_id',cfg.schedule_id).limit(22);
    if (availabilityError) throw new RealtorWorkspaceError('FAILED');
    const rows = z.array(z.object({days:z.array(z.number().int().min(0).max(6)),start_time:z.string(),end_time:z.string()})).max(21).parse(availability || []);
    windows = rows.flatMap(row=>row.days.map(weekday=>({weekday,start:row.start_time.slice(0,5),end:row.end_time.slice(0,5)})));
  }
  const settings = sellerCalendarSettingsSchema.parse({requestId:randomUUID(),expectedRevision:cfg?.revision??null,enabled:cfg?.enabled??false,
    timeZone:cfg?.time_zone||preferences.time_zone||'America/Chicago',durationMinutes:cfg?.duration_minutes??30,noticeMinutes:cfg?.notice_minutes??120,
    horizonDays:cfg?.horizon_days??30,internalCalendarAcknowledged:cfg?.enabled??false,windows});
  const {data:bookings,error:bookingsError} = await supabaseAdmin.from('scheduling_bookings').select('id,lead_id,start_time,end_time,status')
    .eq('agent_id',selected.agentId).eq('site',selected.site).eq('metadata->>sellerConsultationVersion','1')
    .gte('start_time',new Date(Date.now()-7*86400000).toISOString()).order('start_time',{ascending:true}).limit(50);
  if (bookingsError) throw new RealtorWorkspaceError('FAILED');
  return {sites,selected,settings,bookings:bookingRows.parse(bookings||[])};
}

const updateSchema = z.object({agentId:z.string().trim().min(1).max(120),settings:sellerCalendarSettingsSchema}).strict();
export async function saveSellerCalendar(actorId: string, value: unknown) {
  const input = updateSchema.parse(value);
  const {selected} = await ownedCalendar(actorId,input.agentId);
  if (!selected) throw new RealtorWorkspaceError('FORBIDDEN');
  const {data,error} = await supabaseAdmin.rpc('seller_consultation_configure',{p_actor_id:actorId,p_agent_id:selected.agentId,p_site:selected.site,p_input:input.settings});
  if (error?.code==='23P01') throw new RealtorWorkspaceError('CONFLICT');
  if (error) throwRealtorRpcError(error.code);
  return z.object({revision:z.number().int().positive()}).parse(data);
}

export async function cancelSellerConsultation(actorId: string, value: unknown) {
  await requirePersonalRealtorWorkspace(actorId);
  const {bookingId} = z.object({bookingId:z.string().guid()}).strict().parse(value);
  const {data,error} = await supabaseAdmin.rpc('seller_consultation_cancel',{p_actor_id:actorId,p_booking_id:bookingId});
  if (error) throwRealtorRpcError(error.code);
  return z.object({status:z.literal('cancelled')}).parse(data);
}

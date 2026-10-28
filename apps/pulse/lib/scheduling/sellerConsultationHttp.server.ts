import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { applyPublicApiRateLimit } from '@/lib/core/publicApiRateLimit';
import { readBoundedJson, RequestBodyError } from '@/lib/core/readBoundedJson';
import { verifySellerBookingCapability } from './sellerBookingCapability.server';
import { sellerAvailabilityWindowSchema } from './sellerConsultationContract';
import { resolveSellerConsultationAuthority, SellerConsultationAccessError } from './sellerConsultationAuthority.server';

const availabilityBody = z.object({ capability: z.string().min(1).max(4096), window: sellerAvailabilityWindowSchema }).strict();
const reservationBody = z.object({ capability: z.string().min(1).max(4096), slotId: z.string().trim().min(1).max(200), requestId: z.string().guid() }).strict();
const headers = { 'Cache-Control': 'private, no-store' };
const reply = (body: unknown,status=200) => NextResponse.json(body,{status,headers});

export async function sellerConsultationHttp(request: Request, kind: 'availability'|'reservation') {
  if (request.headers.get('origin') !== new URL(request.url).origin) return reply({ error: 'Same-origin request required.' },403);
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return reply({ error: 'JSON request required.' },415);
  const secret = process.env.SELLER_BOOKING_CAPABILITY_SECRET || '';
  if (Buffer.byteLength(secret,'utf8') < 32) return reply({ status:'unavailable',reason:'not_configured' },503);
  let raw: unknown;
  try { raw = await readBoundedJson(request, 12*1024); }
  catch (error) { return reply({ error:'Invalid consultation request.' },error instanceof RequestBodyError ? error.status : 400); }
  const parsed = kind==='availability' ? availabilityBody.safeParse(raw) : reservationBody.safeParse(raw);
  if (!parsed.success) return reply({ error:'Invalid consultation request.' },400);
  const claims = verifySellerBookingCapability(parsed.data.capability,secret);
  if (!claims) return reply({ error:'Booking access expired or is invalid.' },403);
  const limited = await applyPublicApiRateLimit(request,`seller-consultation-${kind}`,kind==='availability'?20:5,60,{requireDistributed:true});
  if (limited) { limited.headers.set('Cache-Control','private, no-store'); return limited; }
  try {
    const authority = await resolveSellerConsultationAuthority(claims.identity);
    if (!authority) return reply({ status:'unavailable',reason:'not_configured' },503);
    if ('window' in parsed.data) {
      const result = await authority.listSlots({ identity:claims.identity,...parsed.data.window });
      return reply(result,result.status==='available'?200:503);
    }
    const result = await authority.reserve({ identity:claims.identity,slotId:parsed.data.slotId,requestId:parsed.data.requestId });
    return reply(result,result.status==='uncertain'?202:result.status==='conflict'?409:result.status==='unavailable'?503:200);
  } catch (error) {
    if (error instanceof SellerConsultationAccessError) return reply({ error:'Saved request is no longer available for booking.' },403);
    return kind==='reservation' ? reply({status:'uncertain'},202) : reply({status:'unavailable',reason:'provider_unavailable'},503);
  }
}

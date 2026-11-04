import {homeFactsLookupInputSchema} from '@/lib/marketing/homeFactsLookup';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});

export async function POST(request:Request) {
  if(process.env.NODE_ENV!=='development') return json({error:'Not found.'},404);
  const origin=request.headers.get('origin');
  // Next dev may normalize request.url to localhost even when the browser uses
  // 127.0.0.1. Compare with the actual incoming authority, never a forwarded host.
  const expectedOrigin=new URL(request.url);
  const host=request.headers.get('host');if(host) expectedOrigin.host=host;
  if(origin&&origin!==expectedOrigin.origin) return json({error:'Origin not allowed.'},403);
  let input;
  try {
    // Bound the stream even when Content-Length is absent. No address in a URL or log.
    const reader=request.body?.getReader();if(!reader) return json({error:'Invalid lookup.'},400);
    const chunks:Uint8Array[]=[];let size=0;
    try {while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>1024){await reader.cancel();return json({error:'Lookup too large.'},413);}chunks.push(value);}}
    finally {reader.releaseLock();}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
    const parsed=homeFactsLookupInputSchema.safeParse(JSON.parse(new TextDecoder().decode(bytes)));
    if(!parsed.success) return json({error:'Enter a street address.'},400);input=parsed.data;
  } catch {return json({error:'Invalid lookup.'},400);}
  try {
    const service=await import('@/lib/marketing/homeFactsLookup.server');
    if(input.examples) return json(service.lookupExampleHomeFacts(input.query));
    const signal=AbortSignal.any([request.signal,AbortSignal.timeout(4000)]);
    return json(await service.lookupSavedHomeFacts(input.query,signal));
  } catch {return json({status:'unavailable'});}
}

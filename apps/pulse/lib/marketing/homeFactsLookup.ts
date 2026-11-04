import {z} from 'zod';

export const homeFactsSchema=z.object({
  bedrooms:z.number().int().min(0).max(30).optional(),
  fullBaths:z.number().int().min(0).max(30).optional(),
  halfBaths:z.number().int().min(0).max(30).optional(),
  stories:z.number().int().min(1).max(100).optional(),
  yearBuilt:z.number().int().min(1600).max(new Date().getFullYear()+2).optional(),
  squareFeet:z.number().int().min(1).max(1_000_000).optional(),
}).strict();
export const homeFactsRecordSchema=z.object({
  id:z.string().min(1).max(128),
  address:z.object({line1:z.string().min(1).max(180),city:z.string().max(100),region:z.string().max(32),postalCode:z.string().max(20)}).strict(),
  facts:homeFactsSchema,
  totalBathrooms:z.number().min(0).max(60).nullable(),
  source:z.enum(['MLS','Internal','Example']),
  recordedAt:z.string().datetime().nullable(),
}).strict();
export type HomeFactsRecord=z.infer<typeof homeFactsRecordSchema>;
export const homeFactsLookupSchema=z.discriminatedUnion('status',[
  z.object({status:z.literal('matched'),property:homeFactsRecordSchema}).strict(),
  z.object({status:z.literal('multiple'),candidates:z.array(homeFactsRecordSchema).min(2).max(5),moreMatches:z.boolean()}).strict(),
  z.object({status:z.literal('not_found')}).strict(),
  z.object({status:z.literal('refine')}).strict(),
  z.object({status:z.literal('unavailable')}).strict(),
]);
export type HomeFactsLookupResult=z.infer<typeof homeFactsLookupSchema>;
export const homeFactsLookupInputSchema=z.object({query:z.string().trim().min(1).max(180).refine(value=>!/[\u0000-\u001f\u007f]/.test(value)),examples:z.boolean().default(false)}).strict();

const aliases:Record<string,string>={STREET:'ST',ROAD:'RD',DRIVE:'DR',LANE:'LN',AVENUE:'AVE',BOULEVARD:'BLVD',COURT:'CT',TRAIL:'TRL',PARKWAY:'PKWY',NORTH:'N',SOUTH:'S',EAST:'E',WEST:'W',APARTMENT:'APT',SUITE:'STE'};
export function normalizeHomeAddress(value:string) {
  return value.normalize('NFKC').toUpperCase().replace(/[.,#]/g,' ').trim().split(/\s+/).map(word=>aliases[word]||word).join(' ');
}
/** Narrow SQL by house number and first street word; final matching is conservative. */
export function homeAddressSearchPrefix(query:string):string|null {
  const match=/^(\d+[A-Za-z]?)\s+([A-Za-z0-9]+)(?:\s|\.|,|$)/.exec(query.trim());
  if(!match) return null;
  const word=aliases[match[2].toUpperCase()]||match[2];
  // A direction is not a useful name prefix (and could be stored in full).
  return /^(N|S|E|W)$/.test(word)?`${match[1]} `:`${match[1]} ${match[2]}`;
}
export function homeAddressLabel(record:HomeFactsRecord) {
  return [record.address.line1,record.address.city,record.address.region,record.address.postalCode].filter(Boolean).join(', ');
}
export function homeAddressRefinement(query:string):{city?:string;postalCode?:string} {
  const postalCode=/\b(\d{5})(?:-\d{4})?\s*$/.exec(query)?.[1];
  const city=query.split(',').slice(1).join(' ').replace(/\b\d{5}(?:-\d{4})?\s*$/,'').trim().replace(/(?:^|\s)[A-Za-z]{2}$/,'').trim();
  return {...(city&&city.length<=100&&/^[\p{L} .'-]+$/u.test(city)?{city}:{}),...(postalCode?{postalCode}:{})};
}
export function matchHomeFacts(query:string,records:HomeFactsRecord[],truncated=false):HomeFactsLookupResult {
  if(truncated) return {status:'refine'};
  const needle=normalizeHomeAddress(query);
  const byAddress=new Map<string,HomeFactsRecord>();
  // Never combine conflicting facts across historical records. Prefer the newest whole record.
  const newest=[...records].sort((a,b)=>(Date.parse(b.recordedAt||'')||0)-(Date.parse(a.recordedAt||'')||0)||a.id.localeCompare(b.id));
  for(const record of newest) {
    const street=normalizeHomeAddress(record.address.line1),full=normalizeHomeAddress(homeAddressLabel(record));
    const {city,region,postalCode}=record.address;
    const contexts=[city,[city,region].join(' '),[city,region,postalCode].join(' '),[city,postalCode].join(' '),[region,postalCode].join(' '),postalCode,region].map(normalizeHomeAddress).filter(Boolean);
    const context=needle.startsWith(street+' ')?needle.slice(street.length+1):'';
    if(needle!==street && needle!==full && !contexts.includes(context)) continue;
    if(!byAddress.has(full)) byAddress.set(full,record);
  }
  const candidates=[...byAddress.values()];
  if(candidates.length===0) return {status:'not_found'};
  if(candidates.length===1) return {status:'matched',property:candidates[0]};
  return {status:'multiple',candidates:candidates.slice(0,5),moreMatches:candidates.length>5};
}

/** Only public canonical columns are accepted here, never arbitrary metadata. */
export type PublicHomeFactsRow={id:unknown;street:unknown;city:unknown;state:unknown;zip:unknown;beds:unknown;baths:unknown;sqft:unknown;source:unknown;last_updated:unknown;display_public:unknown;is_demo:unknown};
export function projectHomeFacts(row:PublicHomeFactsRow):HomeFactsRecord|null {
  if(row.display_public!==true||row.is_demo!==false) return null;
  const facts:HomeFactsRecord['facts']={};
  if(typeof row.beds==='number'&&Number.isInteger(row.beds)&&row.beds>=0&&row.beds<=30) facts.bedrooms=row.beds;
  if(typeof row.sqft==='number'&&Number.isInteger(row.sqft)&&row.sqft>0&&row.sqft<=1_000_000) facts.squareFeet=row.sqft;
  const timestamp=typeof row.last_updated==='string'?Date.parse(row.last_updated):NaN;
  const parsed=homeFactsRecordSchema.safeParse({
    id:row.id,address:{line1:row.street,city:row.city||'',region:row.state||'',postalCode:row.zip||''},facts,
    totalBathrooms:typeof row.baths==='number'&&Number.isFinite(row.baths)&&row.baths>=0&&row.baths<=60?row.baths:null,
    source:row.source,recordedAt:Number.isFinite(timestamp)?new Date(timestamp).toISOString():null,
  });
  return parsed.success?parsed.data:null;
}

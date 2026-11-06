import 'server-only';
import {homeAddressRefinement,homeAddressSearchPrefix,matchHomeFacts,projectHomeFacts,type HomeFactsLookupResult,type HomeFactsRecord} from './homeFactsLookup';

export async function lookupSavedHomeFacts(query:string,signal:AbortSignal):Promise<HomeFactsLookupResult> {
  const prefix=homeAddressSearchPrefix(query);
  if(!prefix) return {status:'not_found'};
  const {searchPublicHomeFactsRows}=await import('@/lib/data/listingRepository');
  const rows=await searchPublicHomeFactsRows(prefix,signal,homeAddressRefinement(query));
  const records=rows.map(projectHomeFacts).filter((record):record is HomeFactsRecord=>record!==null);
  return matchHomeFacts(query,records,rows.length>=31);
}

/** Explicit local examples, never used by the saved-record reader or a production route. */
export function lookupExampleHomeFacts(query:string):HomeFactsLookupResult {
  const common={address:{line1:'100 Example Lane',city:'Keller',region:'TX',postalCode:'76248'},source:'Example' as const,recordedAt:'2026-11-04T12:00:00.000Z'};
  return matchHomeFacts(query,[
    {...common,id:'example-keller',facts:{bedrooms:3,squareFeet:2100},totalBathrooms:2.5},
    {...common,id:'example-arlington',address:{...common.address,city:'Arlington',postalCode:'76013'},facts:{bedrooms:4,squareFeet:2400},totalBathrooms:3},
  ]);
}

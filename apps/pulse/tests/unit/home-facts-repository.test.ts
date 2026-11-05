import {beforeEach,expect,it,vi} from 'vitest';
const {from,query}=vi.hoisted(()=>{
  const query={select:vi.fn(),eq:vi.fn(),is:vi.fn(),ilike:vi.fn(),order:vi.fn(),limit:vi.fn(),abortSignal:vi.fn()};
  return {from:vi.fn(()=>query),query};
});
vi.mock('@/lib/supabase',()=>({supabaseAdmin:{from}}));
import {searchPublicHomeFactsRows} from '@/lib/data/listingRepository';
beforeEach(()=>{vi.clearAllMocks();for(const method of [query.select,query.eq,query.is,query.ilike,query.order,query.limit]) method.mockReturnValue(query);query.abortSignal.mockResolvedValue({data:[],error:null});});
it('filters private, deleted and demo rows before a bounded public-column-only read',async()=>{
  const signal=new AbortController().signal;await searchPublicHomeFactsRows('100 Example',signal);
  expect(from).toHaveBeenCalledWith('properties');expect(query.eq).toHaveBeenCalledWith('display_public',true);expect(query.eq).toHaveBeenCalledWith('is_demo',false);expect(query.is).toHaveBeenCalledWith('deleted_at',null);
  expect(query.select).toHaveBeenCalledWith('id,street,city,state,zip,beds,baths,sqft,source,last_updated,display_public,is_demo');
  expect(query.ilike).toHaveBeenCalledWith('street','100 Example%');expect(query.limit).toHaveBeenCalledWith(31);expect(query.abortSignal).toHaveBeenCalledWith(signal);
  await searchPublicHomeFactsRows('100 Example',signal,{city:'Keller',postalCode:'76248'});
  expect(query.ilike).toHaveBeenCalledWith('city','Keller');expect(query.ilike).toHaveBeenCalledWith('zip','76248%');
});
it('rejects wildcard/filter syntax and reports database failure with a generic message',async()=>{
  expect(await searchPublicHomeFactsRows('100 %',new AbortController().signal)).toEqual([]);expect(from).not.toHaveBeenCalled();
  query.abortSignal.mockResolvedValueOnce({data:null,error:{message:'private error'}});
  await expect(searchPublicHomeFactsRows('100 Example',new AbortController().signal)).rejects.toThrow('Saved property lookup unavailable.');
});

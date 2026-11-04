import React from 'react';
import '@testing-library/jest-dom/vitest';
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import GuidedJourneyPrototype from '@/components/lead-capture/journey/GuidedJourneyPrototype';
import type {HomeFactsRecord} from '@/lib/marketing/homeFactsLookup';

const record:HomeFactsRecord={id:'home-a',address:{line1:'100 Example Lane',city:'Keller',region:'TX',postalCode:'76248'},facts:{bedrooms:3,squareFeet:2100},totalBathrooms:2.5,source:'MLS',recordedAt:'2026-11-04T12:00:00.000Z'};
const response=(body:unknown)=>({ok:true,json:async()=>body}) as Response;
const next=()=>fireEvent.click(screen.getByRole('button',{name:'Next →'}));
function enterAddress(query='100 Example Lane') {
  fireEvent.click(screen.getByRole('radio',{name:'Sell My Home'}));next();
  fireEvent.change(screen.getByLabelText('Street Address'),{target:{value:query}});next();
}
async function confirmHome() {
  await waitFor(()=>expect(screen.getByRole('heading',{level:1})).toHaveTextContent('Have we got the right home?'));
  fireEvent.click(screen.getByRole('checkbox',{name:'This Is the Home I Mean'}));next();
}
beforeEach(()=>vi.stubGlobal('fetch',vi.fn()));
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.useRealTimers();});

it('loads a match, shows record context, leaves missing details blank and supports corrections',async()=>{
  vi.mocked(fetch).mockResolvedValue(response({status:'matched',property:record}));
  render(<GuidedJourneyPrototype/>);enterAddress();await confirmHome();
  expect(fetch).toHaveBeenCalledWith('/api/seller-plan/preview/property-lookup',expect.objectContaining({method:'POST',body:JSON.stringify({query:'100 Example Lane',examples:false}),cache:'no-store',signal:expect.any(AbortSignal)}));
  expect(screen.getByLabelText('Bedrooms')).toHaveValue(3);expect(screen.getByLabelText('Square Feet')).toHaveValue(2100);
  expect(screen.getByLabelText('Full Bathrooms')).toHaveValue(null);expect(screen.getByLabelText('Half Bathrooms')).toHaveValue(null);expect(screen.getByLabelText('Year Built')).toHaveValue(null);
  expect(screen.getByText(/2.5 bathrooms in total/)).toBeVisible();expect(screen.getByText('From a Saved MLS Record')).toBeVisible();
  fireEvent.click(screen.getByRole('button',{name:'Increase Bedrooms'}));expect(screen.getByLabelText('Bedrooms')).toHaveValue(4);
  fireEvent.click(screen.getByRole('button',{name:'← Back'}));fireEvent.click(screen.getByRole('button',{name:'← Back'}));next();next();
  expect(screen.getByLabelText('Bedrooms')).toHaveValue(4);expect(fetch).toHaveBeenCalledTimes(1);
});
it('requires an explicit selection for ambiguous addresses before applying any facts',async()=>{
  const other={...record,id:'home-b',address:{...record.address,city:'Arlington',postalCode:'76013'},facts:{bedrooms:4}};
  vi.mocked(fetch).mockResolvedValue(response({status:'multiple',candidates:[record,other],moreMatches:false}));
  render(<GuidedJourneyPrototype/>);enterAddress();
  await waitFor(()=>expect(screen.getByRole('radio',{name:'100 Example Lane, Arlington, TX, 76013'})).toBeVisible());
  next();expect(screen.getByRole('alert')).toHaveTextContent('Choose a home');
  fireEvent.click(screen.getByRole('radio',{name:'100 Example Lane, Arlington, TX, 76013'}));next();await confirmHome();
  expect(screen.getByLabelText('Bedrooms')).toHaveValue(4);expect(screen.getByLabelText('Square Feet')).toHaveValue(null);
});
it('preserves the typed address and permits manual entry after no match or unavailability',async()=>{
  vi.mocked(fetch).mockResolvedValue(response({status:'not_found'}));
  render(<GuidedJourneyPrototype/>);enterAddress('200 Example Street');
  await waitFor(()=>expect(screen.getByRole('button',{name:'Enter Details Myself'})).toBeVisible());
  expect(screen.getByLabelText('Street Address')).toHaveValue('200 Example Street');
  vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'));
  fireEvent.click(screen.getByRole('button',{name:'Try Lookup Again'}));
  await waitFor(()=>expect(screen.getByText(/Property lookup is unavailable right now/)).toBeVisible());
  fireEvent.click(screen.getByRole('button',{name:'Enter Details Myself'}));await confirmHome();
  expect(screen.getByLabelText('Bedrooms')).toHaveValue(null);expect(screen.queryByText('From a Saved MLS Record')).toBeNull();
});
it('prevents duplicate lookups and aborts pending work on unmount',async()=>{
  let resolve!:(value:Response)=>void;
  vi.mocked(fetch).mockImplementation(()=>new Promise(done=>{resolve=done;}));
  const {unmount}=render(<GuidedJourneyPrototype/>);enterAddress();
  const loading=screen.getByRole('button',{name:'Loading…'});expect(loading).toBeDisabled();expect(screen.getByLabelText('Street Address')).toBeDisabled();
  fireEvent.click(loading);expect(fetch).toHaveBeenCalledTimes(1);
  const signal=vi.mocked(fetch).mock.calls[0][1]!.signal!;
  unmount();expect(signal.aborted).toBe(true);
  await act(async()=>{resolve(response({status:'matched',property:record}));});
});
it('clears a previous home’s prefilled facts and requires fresh confirmation after an address edit',async()=>{
  vi.mocked(fetch).mockResolvedValueOnce(response({status:'matched',property:record})).mockResolvedValueOnce(response({status:'not_found'}));
  render(<GuidedJourneyPrototype/>);enterAddress();await confirmHome();
  fireEvent.click(screen.getByRole('button',{name:'← Back'}));fireEvent.click(screen.getByRole('button',{name:'Edit Address'}));
  fireEvent.change(screen.getByLabelText('Street Address'),{target:{value:'200 Other Street'}});next();
  await waitFor(()=>expect(screen.getByRole('button',{name:'Enter Details Myself'})).toBeVisible());
  fireEvent.click(screen.getByRole('button',{name:'Enter Details Myself'}));
  expect(screen.getByRole('checkbox',{name:'This Is the Home I Mean'})).not.toBeChecked();
  await confirmHome();expect(screen.getByLabelText('Bedrooms')).toHaveValue(null);expect(screen.getByLabelText('Square Feet')).toHaveValue(null);
});
it('treats invalid response shape as unavailable instead of rendering unvalidated facts',async()=>{
  vi.mocked(fetch).mockResolvedValue(response({status:'matched',property:{...record,facts:{bedrooms:1000}}}));
  render(<GuidedJourneyPrototype/>);enterAddress();
  await waitFor(()=>expect(screen.getByText(/Property lookup is unavailable right now/)).toBeVisible());
  expect(screen.getByLabelText('Street Address')).toHaveValue('100 Example Lane');
});

import React from 'react';
import {webcrypto} from 'node:crypto';
import '@testing-library/jest-dom/vitest';
import {act,cleanup,fireEvent,render,renderHook,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {createValidBothJourneyFixture} from '../fixtures/guidedJourneyFixture';
import * as requestHelpers from '@/lib/marketing/guidedJourneyRequest';
import useSellerJourneySubmission,{type SellerJourneyTransport} from '@/components/lead-capture/journey/useSellerJourneySubmission';
import GuidedJourneyPrototype from '@/components/lead-capture/journey/GuidedJourneyPrototype';

const firstId='11111111-1111-4111-8111-111111111111',secondId='22222222-2222-4222-8222-222222222222';
function deferred<T>() {let resolve!:(value:T)=>void;const promise=new Promise<T>(done=>{resolve=done;});return {resolve,promise};}
const accepted={ok:true,body:{success:true,accepted:true}};
beforeEach(()=>{
  vi.stubGlobal('crypto',{subtle:webcrypto.subtle,randomUUID:vi.fn().mockReturnValueOnce(firstId).mockReturnValue(secondId)});
  vi.stubGlobal('fetch',vi.fn());
});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();});

it('prepares a validated summary without a transport or personal answers in state',async()=>{
  const {result}=renderHook(()=>useSellerJourneySubmission());
  await act(async()=>{expect((await result.current.submit(createValidBothJourneyFixture())).status).toBe('prepared');});
  expect(result.current.state).toMatchObject({status:'prepared',summary:{version:'3',submissionId:firstId}});
  expect(JSON.stringify(result.current.state)).not.toMatch(/Taylor|Example Lane|25000000|example\.test|journey|campaign/);
  expect(fetch).not.toHaveBeenCalled();
});
it('acquires its synchronous guard before hashing and rejects reset/duplicate submit while preparing',async()=>{
  const fixture=createValidBothJourneyFixture(),prepared=await requestHelpers.prepareSellerJourneyAttempt(fixture);
  const gate=deferred<typeof prepared>();const prepare=vi.spyOn(requestHelpers,'prepareSellerJourneyAttempt').mockReturnValueOnce(gate.promise);
  const transport=vi.fn<SellerJourneyTransport>().mockResolvedValue(accepted);
  const {result}=renderHook(()=>useSellerJourneySubmission({transport}));
  let first!:ReturnType<typeof result.current.submit>;
  act(()=>{first=result.current.submit(fixture);expect(result.current.reset()).toBe(false);});
  await act(async()=>{expect(await result.current.submit(fixture)).toEqual({status:'ignored'});});
  expect(prepare).toHaveBeenCalledTimes(1);expect(transport).not.toHaveBeenCalled();
  await act(async()=>{gate.resolve(prepared);await first;});expect(transport).toHaveBeenCalledTimes(1);expect(result.current.state.status).toBe('accepted');
});
it('retains the ID on uncertain delivery and prevents another save after a valid receipt',async()=>{
  const transport=vi.fn<SellerJourneyTransport>().mockRejectedValueOnce(new Error('private provider failure')).mockResolvedValueOnce({...accepted,body:{success:true,accepted:true,duplicate:true}});
  const {result}=renderHook(()=>useSellerJourneySubmission({transport}));const draft=createValidBothJourneyFixture();
  await act(async()=>{await result.current.submit(draft);});expect(result.current.state).toMatchObject({status:'error'});
  expect(JSON.stringify(result.current.state)).not.toContain('private provider');
  await act(async()=>{await result.current.submit(draft);});
  expect(transport.mock.calls.map(([request])=>request.submissionId)).toEqual([firstId,firstId]);
  expect(result.current.state).toMatchObject({status:'accepted',receipt:{accepted:true,duplicate:true}});
  await act(async()=>{expect(await result.current.submit(draft)).toEqual({status:'ignored'});});expect(transport).toHaveBeenCalledTimes(2);
});
it('uses a new identity after a material edit following failure',async()=>{
  const transport=vi.fn<SellerJourneyTransport>().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(accepted);
  const {result}=renderHook(()=>useSellerJourneySubmission({transport}));const draft=createValidBothJourneyFixture();
  await act(async()=>{await result.current.submit(draft);});draft.facts.bedrooms={state:'answered',value:4};
  await act(async()=>{await result.current.submit(draft);});
  expect(transport.mock.calls.map(([request])=>request.submissionId)).toEqual([firstId,secondId]);
});
it('requires both HTTP success and a valid accepted receipt, preserving identity on either failure',async()=>{
  const transport=vi.fn<SellerJourneyTransport>().mockResolvedValueOnce({ok:false,status:503,body:{success:true,accepted:true}})
    .mockResolvedValueOnce({ok:true,body:{success:true}}).mockResolvedValueOnce(accepted);
  const {result}=renderHook(()=>useSellerJourneySubmission({transport}));
  for(let index=0;index<3;index++) await act(async()=>{await result.current.submit(createValidBothJourneyFixture());});
  expect(transport.mock.calls.map(([request])=>request.submissionId)).toEqual([firstId,firstId,firstId]);expect(result.current.state.status).toBe('accepted');
});
it('keeps the accepted state when the existing optional booking validator throws',async()=>{
  const transport=vi.fn<SellerJourneyTransport>().mockResolvedValue({...accepted,body:{success:true,accepted:true,bookingOffer:{token:'private-token'}}});
  const {result}=renderHook(()=>useSellerJourneySubmission({transport,parseBookingOffer:()=>{throw new Error('bad offer');}}));
  await act(async()=>{await result.current.submit(createValidBothJourneyFixture());});expect(result.current.state).toEqual({status:'accepted',receipt:{accepted:true,duplicate:false}});
  await act(async()=>{await result.current.submit(createValidBothJourneyFixture());});expect(transport).toHaveBeenCalledTimes(1);
});
it('passes only the existing validator’s accepted booking object into the receipt',async()=>{
  const transport=vi.fn<SellerJourneyTransport>().mockResolvedValue({...accepted,body:{success:true,accepted:true,bookingOffer:{token:'opaque'}}});
  const validated={token:'validated-example'};const validator=vi.fn(()=>validated);
  const {result}=renderHook(()=>useSellerJourneySubmission({transport,parseBookingOffer:validator}));
  await act(async()=>{await result.current.submit(createValidBothJourneyFixture());});
  expect(result.current.state).toEqual({status:'accepted',receipt:{accepted:true,duplicate:false,bookingOffer:validated}});expect(validator).toHaveBeenCalledWith({token:'opaque'});
});
it('aborts on unmount and discards a late result even when the adapter ignores the signal',async()=>{
  const gate=deferred<Awaited<ReturnType<SellerJourneyTransport>>>();const transport=vi.fn<SellerJourneyTransport>().mockReturnValue(gate.promise);
  const {result,unmount}=renderHook(()=>useSellerJourneySubmission({transport}));let pending!:ReturnType<typeof result.current.submit>;
  act(()=>{pending=result.current.submit(createValidBothJourneyFixture());});await waitFor(()=>expect(transport).toHaveBeenCalledOnce());
  const signal=transport.mock.calls[0][1].signal;unmount();expect(signal.aborted).toBe(true);
  expect(await pending).toEqual({status:'ignored'});gate.resolve(accepted);
});
it('times out ignored cancellation without hanging or clearing the retained attempt',async()=>{
  const fixture=createValidBothJourneyFixture(),prepared=await requestHelpers.prepareSellerJourneyAttempt(fixture);
  vi.spyOn(requestHelpers,'prepareSellerJourneyAttempt').mockResolvedValue(prepared);vi.useFakeTimers();
  const gate=deferred<Awaited<ReturnType<SellerJourneyTransport>>>();const transport=vi.fn<SellerJourneyTransport>().mockReturnValueOnce(gate.promise).mockResolvedValueOnce(accepted);
  const {result}=renderHook(()=>useSellerJourneySubmission({transport,timeoutMs:1000}));let pending!:ReturnType<typeof result.current.submit>;
  await act(async()=>{pending=result.current.submit(fixture);});expect(transport).toHaveBeenCalledOnce();
  await act(async()=>{vi.advanceTimersByTime(1000);await pending;});expect(result.current.state.status).toBe('error');expect(transport.mock.calls[0][1].signal.aborted).toBe(true);
  await act(async()=>{await result.current.submit(fixture);});expect(transport.mock.calls.map(([request])=>request.submissionId)).toEqual([firstId,firstId]);
  gate.resolve(accepted);
});
it('requires explicit reset before preparing a new request after acceptance',async()=>{
  const transport=vi.fn<SellerJourneyTransport>().mockResolvedValue(accepted);const {result}=renderHook(()=>useSellerJourneySubmission({transport}));
  await act(async()=>{await result.current.submit(createValidBothJourneyFixture());});act(()=>{expect(result.current.reset()).toBe(true);});
  await act(async()=>{await result.current.submit(createValidBothJourneyFixture());});expect(transport.mock.calls.map(([request])=>request.submissionId)).toEqual([firstId,secondId]);
});
it('does not invoke a transport for incomplete or buyer-only seller submissions',async()=>{
  const transport=vi.fn<SellerJourneyTransport>();const {result}=renderHook(()=>useSellerJourneySubmission({transport}));
  const draft=createValidBothJourneyFixture();draft.contact.requestedContact=false;
  await act(async()=>{await result.current.submit(draft);});expect(result.current.state.status).toBe('error');
  await act(async()=>{await result.current.submit({...createValidBothJourneyFixture(),mode:'buy'});});expect(transport).not.toHaveBeenCalled();
});

it('rehearses seller preparation in the actual form, freezes pending inputs and reuses the ID on retry',async()=>{
  render(<GuidedJourneyPrototype/>);
  const next=()=>fireEvent.click(screen.getByRole('button',{name:'Next →'}));
  const choose=(label:string)=>{fireEvent.click(screen.getByRole('radio',{name:label}));next();};
  choose('Sell My Home');fireEvent.click(screen.getByRole('button',{name:'Use a Fictional Sample Home'}));next();
  fireEvent.click(screen.getByRole('checkbox',{name:'This Is the Home I Mean'}));next();next();choose('Leave These for Later');
  for(const label of ['I Own It','I’m Still Exploring','Work Out My Options','No']) choose(label);
  next();fireEvent.change(screen.getByLabelText('Your Name'),{target:{value:'Taylor Example'}});fireEvent.change(screen.getByLabelText('Email'),{target:{value:'taylor@example.test'}});
  fireEvent.click(screen.getByRole('checkbox',{name:'I’d Like a Response About My Request.'}));fireEvent.change(screen.getByLabelText('Final Step Response'),{target:{value:'error'}});
  fireEvent.click(screen.getByRole('button',{name:'Preview My Request'}));expect(screen.getByLabelText('Email')).toBeDisabled();
  await waitFor(()=>expect(screen.getByLabelText('Last Prepared Request ID')).toHaveTextContent(firstId));
  await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('Preview error'),{timeout:2500});
  expect(screen.getByLabelText('Email')).toHaveValue('taylor@example.test');expect(screen.getByLabelText('Email')).not.toBeDisabled();
  fireEvent.change(screen.getByLabelText('Final Step Response'),{target:{value:'instant'}});fireEvent.click(screen.getByRole('button',{name:'Preview My Request'}));
  await waitFor(()=>expect(screen.getByRole('heading',{level:1})).toHaveTextContent('Your next move, in view.'));
  expect(screen.getByLabelText('Last Prepared Request ID')).toHaveTextContent(firstId);expect(fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Review My Answers'}));next();
  fireEvent.change(screen.getByLabelText('Email'),{target:{value:'changed@example.test'}});fireEvent.click(screen.getByRole('button',{name:'Preview My Request'}));
  await waitFor(()=>expect(screen.getByLabelText('Last Prepared Request ID')).toHaveTextContent(secondId));expect(fetch).not.toHaveBeenCalled();
});

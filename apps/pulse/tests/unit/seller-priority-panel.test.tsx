import React from 'react';
import {act,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {SellerPriorityPanel} from '@/components/realtor/SellerPriorityPanel';
import {sellerDailyFixture} from '../fixtures/sellerDailyFixture';
afterEach(()=>vi.unstubAllGlobals());
it('preserves known daily actions during failed priority reads, then retries without overlapping requests',async()=>{
  let complete!:(value:Response)=>void;
  const fetcher=vi.fn<typeof fetch>().mockImplementationOnce(()=>new Promise((resolve)=>{complete=resolve;})).mockResolvedValueOnce(Response.json({ok:true,result:{items:[],hasMore:false}}));vi.stubGlobal('fetch',fetcher);
  render(<SellerPriorityPanel daily={sellerDailyFixture()} result={null}/>);
  expect(screen.queryByText('No actions in the loaded seller queue.')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Retry case priorities'}));expect(screen.getByRole('button',{name:'Reloading case priorities…'})).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'Reloading case priorities…'}));expect(fetcher).toHaveBeenCalledOnce();
  await act(async()=>complete(Response.json({ok:false},{status:503})));expect(screen.getByText(/Case and reply priorities are unavailable/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Retry case priorities'}));await screen.findByText('No actions in the loaded seller queue.');expect(fetcher).toHaveBeenCalledTimes(2);
});
it('does not issue another read when Today supplied a valid priority result',()=>{
  const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
  render(<SellerPriorityPanel daily={sellerDailyFixture()} result={{items:[{id:'reply:1',leadId:'11111111-1111-4111-8111-111111111111',title:'Reply seller',reason:'No pending response',score:80,dueAt:'2026-10-09T10:00:00Z'}],hasMore:false}}/>);
  expect(screen.getByRole('link',{name:/Reply seller/})).toHaveAttribute('href','/seller-cases/11111111-1111-4111-8111-111111111111');expect(fetcher).not.toHaveBeenCalled();
});
it('ignores a delayed retry after fresh parent data arrives',async()=>{
  let complete!:(value:Response)=>void;vi.stubGlobal('fetch',vi.fn<typeof fetch>().mockImplementation(()=>new Promise((resolve)=>{complete=resolve;})));
  const view=render(<SellerPriorityPanel daily={sellerDailyFixture()} result={null}/>);fireEvent.click(screen.getByRole('button',{name:'Retry case priorities'}));
  view.rerender(<SellerPriorityPanel daily={sellerDailyFixture()} result={{items:[],hasMore:false}}/>);
  await act(async()=>complete(Response.json({ok:true,result:{items:[{id:'old',leadId:'11111111-1111-4111-8111-111111111111',title:'Old reply',reason:'Old',score:80,dueAt:null}],hasMore:false}})));
  await waitFor(()=>expect(screen.queryByText('Old reply')).not.toBeInTheDocument());expect(screen.getByText('No actions in the loaded seller queue.')).toBeInTheDocument();
});

import React from 'react';
import {act,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
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
it('keeps the urgent planner destination and reveals additional people without another read or write',()=>{
  const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
  const requests=Array.from({length:6},(_,index)=>({id:`${index+1}1111111-1111-4111-8111-111111111111`,name:`Seller ${index+1}`,revision:1,created_at:`2026-10-0${index+1}T10:00:00Z`,timing:null}));
  render(<SellerPriorityPanel daily={sellerDailyFixture({unscheduledRequests:requests,overdueActions:[{occurrence_id:'11111111-1111-4111-8111-111111111111',lead_id:requests[0].id,name:'Taylor Seller',effective_date:'2026-09-30',title_snapshot:'Call back'}]})} result={{items:[],hasMore:false}}/>);
  expect(screen.getByRole('link',{name:'Open scheduled action: Taylor Seller'})).toHaveAttribute('href','/planner?date=2026-09-30');
  expect(screen.getByRole('link',{name:'Open request: Seller 1'})).toHaveAttribute('href',`/seller-inbox?leadId=${requests[0].id}`);
  expect(screen.getByRole('link',{name:'Open request: Seller 6'}).closest('details')).not.toHaveAttribute('open');
  fireEvent.click(screen.getByText('More next actions (4)'));
  expect(screen.getByRole('link',{name:'Open request: Seller 6'}).closest('details')).toHaveAttribute('open');
  expect(screen.getByRole('link',{name:'Open request: Seller 6'})).toHaveAttribute('href',`/seller-inbox?leadId=${requests[5].id}`);
  expect(fetcher).not.toHaveBeenCalled();
});
it('shows one primary focus from saved priority order and keeps its explanation behind a disclosure',()=>{
  const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
  const overdue={occurrence_id:'11111111-1111-4111-8111-111111111111',lead_id:'22222222-2222-4222-8222-222222222222',name:'Taylor Seller',effective_date:'2026-10-20',title_snapshot:'Discuss preparation'};
  render(<SellerPriorityPanel daily={sellerDailyFixture({overdueActions:[overdue],unscheduledRequests:[{id:'33333333-3333-4333-8333-333333333333',name:'Morgan Seller',revision:1,created_at:'2026-10-27T12:00:00Z',timing:'exploring'}]})} result={{items:[],hasMore:false}} />);
  const focus=screen.getByRole('article',{name:'Follow up: Taylor Seller'});
  expect(within(focus).getAllByRole('link')).toHaveLength(1);
  expect(within(focus).getByRole('link',{name:'Open scheduled action: Taylor Seller'})).toHaveAttribute('href','/planner?date=2026-10-20');
  const details=within(focus).getByText('Action Details').closest('details')!;
  expect(details).not.toHaveAttribute('open');fireEvent.click(within(focus).getByText('Action Details'));
  expect(details).toHaveAttribute('open');expect(within(focus).getByText(/Discuss preparation/)).toBeVisible();
  expect(screen.getByRole('article',{name:'New request: Morgan Seller'})).toBeInTheDocument();
  expect(fetcher).not.toHaveBeenCalled();
});
it('does not turn a checklist task title into a person identity',()=>{
  render(<SellerPriorityPanel daily={sellerDailyFixture()} result={{items:[{id:'checklist:1',leadId:'11111111-1111-4111-8111-111111111111',title:'Review preparation',reason:'A saved checklist task is pending.',score:20,dueAt:null}],hasMore:false}} />);
  const action=screen.getByRole('article',{name:'Preparation: Review preparation'});
  expect(within(action).getByRole('link',{name:'Open preparation: Review preparation'})).toHaveAttribute('href','/seller-cases/11111111-1111-4111-8111-111111111111');
  expect(within(action).queryByText('RP')).not.toBeInTheDocument();
});

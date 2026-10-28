import React from 'react';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import SellerConsultationPicker from '@/components/lead-capture/SellerConsultationPicker';
const offer=()=>({token:'private-memory-only-capability',expiresAt:new Date(Date.now()+900000).toISOString()});
const slot={id:'slot-1',startsAt:'2026-11-01T18:00:00Z',endsAt:'2026-11-01T18:30:00Z',timeZone:'America/Chicago'};
const response=(body:unknown,status=200)=>({ok:status>=200&&status<300,status,json:async()=>body});
async function select() {fireEvent.click(screen.getByRole('button',{name:'Check Available Times'}));await screen.findByRole('radio');fireEvent.click(screen.getByRole('radio'));}
beforeEach(()=>vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response({status:'available',slots:[slot]}))));
describe('internal consultation picker',()=>{
  it('keeps the exact request after an uncertain outcome and confirms only a validated receipt',async()=>{
    vi.mocked(fetch).mockResolvedValueOnce(response({status:'available',slots:[slot]}) as Response)
      .mockRejectedValueOnce(new Error('lost response'))
      .mockResolvedValueOnce(response({status:'confirmed',bookingId:'booking-one',startsAt:slot.startsAt,endsAt:slot.endsAt,timeZone:slot.timeZone}) as Response);
    const storage=vi.spyOn(Storage.prototype,'setItem');
    const location=window.location.href;
    render(<SellerConsultationPicker offer={offer()} />);await select();
    fireEvent.click(screen.getByRole('button',{name:'Book Selected Time'}));
    await screen.findByRole('button',{name:'Check This Booking Again'});
    expect(screen.queryByRole('button',{name:'Refresh Times'})).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'Check This Booking Again'}));
    await screen.findByText(/Your consultation is booked/);
    const calls=vi.mocked(fetch).mock.calls;
    expect(calls[1][1]?.body).toBe(calls[2][1]?.body);
    expect(JSON.parse(String(calls[1][1]?.body))).toMatchObject({slotId:slot.id,requestId:expect.any(String)});
    expect(storage).not.toHaveBeenCalled();expect(window.location.href).toBe(location);
  });
  it('retains the same attempt after a server 503 and ignores repeated clicks while saving',async()=>{
    let resolve!:(value:Response)=>void;
    vi.mocked(fetch).mockResolvedValueOnce(response({status:'available',slots:[slot]}) as Response).mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));
    render(<SellerConsultationPicker offer={offer()} />);await select();
    const button=screen.getByRole('button',{name:'Book Selected Time'});fireEvent.click(button);fireEvent.click(button);
    expect(fetch).toHaveBeenCalledTimes(2);
    resolve(response({status:'unavailable',reason:'provider_unavailable'},503) as Response);
    await screen.findByRole('button',{name:'Check This Booking Again'});
    expect(screen.queryByRole('radio')).toBeNull();
  });
  it('clears the old choice only after a definitive conflict',async()=>{
    vi.mocked(fetch).mockResolvedValueOnce(response({status:'available',slots:[slot]}) as Response).mockResolvedValueOnce(response({status:'conflict'},409) as Response);
    render(<SellerConsultationPicker offer={offer()} />);await select();fireEvent.click(screen.getByRole('button',{name:'Book Selected Time'}));
    await screen.findByText(/That time is no longer available/);expect(screen.queryByText(/is booked for/)).toBeNull();
    expect(screen.getByRole('button',{name:'Check Available Times'})).toBeEnabled();
  });
  it('offers no invented slots and retains the saved-request fallback',async()=>{
    vi.mocked(fetch).mockResolvedValue(response({status:'available',slots:[]}) as Response);
    render(<SellerConsultationPicker offer={offer()} />);fireEvent.click(screen.getByRole('button',{name:'Check Available Times'}));
    await screen.findByText(/No times are available/);expect(screen.getByText(/Your request is already saved/)).toBeVisible();
    expect(screen.queryByRole('button',{name:'Book Selected Time'})).toBeNull();
  });
  it('blocks an expired offer and aborts work on unmount',async()=>{
    const view=render(<SellerConsultationPicker offer={{...offer(),expiresAt:new Date(Date.now()-1000).toISOString()}} />);
    await waitFor(()=>expect(screen.getByText(/Booking access has ended/)).toBeVisible());expect(fetch).not.toHaveBeenCalled();view.unmount();
    vi.mocked(fetch).mockImplementation(()=>new Promise(()=>{}));
    const pending=render(<SellerConsultationPicker offer={offer()} />);fireEvent.click(screen.getByRole('button',{name:'Check Available Times'}));
    const signal=vi.mocked(fetch).mock.calls[0][1]?.signal;pending.unmount();expect(signal?.aborted).toBe(true);
  });
});

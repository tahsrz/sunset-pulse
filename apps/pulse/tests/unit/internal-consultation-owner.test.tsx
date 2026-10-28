import React from 'react';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import SellerConsultationCalendar from '@/components/realtor/SellerConsultationCalendar';
import {sellerCalendarSettingsSchema} from '@/lib/scheduling/sellerConsultationContract';
const settings={requestId:'dc953f78-07fb-4196-9e61-c83f1c4d185a',expectedRevision:null,enabled:false,timeZone:'America/Chicago',durationMinutes:30,noticeMinutes:120,horizonDays:30,internalCalendarAcknowledged:false,windows:[]};
const data={sites:[{agentId:'test-site',site:'test'}],selected:{agentId:'test-site',site:'test'},settings,bookings:[]};
const response=(result:unknown,status=200)=>({ok:status===200,status,json:async()=>status===200?{ok:true,result}:{ok:false,error:'This record changed. Reload it before saving.'}});
beforeEach(()=>vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response(data))));
describe('internal calendar owner controls',()=>{
  it('starts without invented hours and requires an acknowledged calendar before enabling',async()=>{
    expect(sellerCalendarSettingsSchema.safeParse(settings).success).toBe(true);
    expect(sellerCalendarSettingsSchema.safeParse({...settings,enabled:true}).success).toBe(false);
    render(<SellerConsultationCalendar />);await screen.findByText('No hours set. Add the times you want to offer.');
    expect(screen.getByLabelText('Allow New Bookings')).not.toBeChecked();
    fireEvent.click(screen.getByLabelText('Allow New Bookings'));fireEvent.click(screen.getByRole('button',{name:'Save Availability'}));
    await screen.findByText('Choose availability and confirm this calendar before enabling bookings.');expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('preserves exact settings on an uncertain save, and changes the request ID only after an edit',async()=>{
    vi.mocked(fetch).mockResolvedValueOnce(response(data) as Response).mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValueOnce(response({revision:1}) as Response).mockResolvedValueOnce(response({revision:2}) as Response);
    render(<SellerConsultationCalendar />);await screen.findByRole('button',{name:'Save Availability'});
    fireEvent.click(screen.getByRole('button',{name:'Save Availability'}));await screen.findByText('Connection lost');
    fireEvent.click(screen.getByRole('button',{name:'Save Availability'}));await screen.findByText('Availability saved. New bookings are disabled.');
    expect(vi.mocked(fetch).mock.calls[1][1]?.body).toBe(vi.mocked(fetch).mock.calls[2][1]?.body);
    fireEvent.change(screen.getByLabelText('Minimum Notice (Minutes)'),{target:{value:'180'}});
    fireEvent.click(screen.getByRole('button',{name:'Save Availability'}));await waitFor(()=>expect(fetch).toHaveBeenCalledTimes(4));
    const last=JSON.parse(String(vi.mocked(fetch).mock.calls[3][1]?.body));expect(last.settings.expectedRevision).toBe(1);expect(last.settings.requestId).not.toBe(settings.requestId);
  });
  it('keeps an edited draft on a stale revision and never renders failed reads as an empty calendar',async()=>{
    vi.mocked(fetch).mockResolvedValueOnce(response(data) as Response).mockResolvedValueOnce(response(null,409) as Response);
    const view=render(<SellerConsultationCalendar />);await screen.findByLabelText('Minimum Notice (Minutes)');
    fireEvent.change(screen.getByLabelText('Minimum Notice (Minutes)'),{target:{value:'180'}});fireEvent.click(screen.getByRole('button',{name:'Save Availability'}));
    await screen.findByText('This record changed. Reload it before saving.');expect(screen.getByLabelText('Minimum Notice (Minutes)')).toHaveValue(180);view.unmount();
    vi.mocked(fetch).mockRejectedValue(new Error('offline'));render(<SellerConsultationCalendar />);
    await screen.findByRole('alert');expect(screen.queryByText('No consultations booked.')).toBeNull();
  });
});

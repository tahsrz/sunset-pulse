'use client';

import React from 'react';
import type { SellerCaseResult } from '@/lib/realtor-workspace/sellerServiceContract';

type Booking = SellerCaseResult['bookings'][number];
const buttonClass = 'mt-3 rounded-lg border border-cyan-300/30 px-4 py-2 text-sm font-semibold text-cyan-100 disabled:opacity-50';

export function sellerAppointmentStatus(status: string): string {
  switch (status.toLowerCase()) {
    case 'accepted': return 'Accepted';
    case 'pending': return 'Waiting for a response';
    case 'declined': return 'Declined';
    case 'cancelled':
    case 'canceled': return 'Cancelled';
    case 'expired': return 'Expired';
    case 'completed': return 'Completed';
    default: return `Status: ${status.replaceAll('_', ' ')}`;
  }
}

function formatAppointmentTime(value: string, timeZone: string): string {
  return new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZone, timeZoneName: 'short' });
}

export function SellerAppointmentStep({
  bookings,
  timeZone,
  disabled,
  onLink,
}: {
  bookings: Booking[];
  timeZone: string;
  disabled: boolean;
  onLink: (bookingId: string) => void;
}) {
  return <section aria-label="Appointment bookings">
    <p className="mt-2 text-xs text-slate-400">Accepted bookings can be added to the planner at the exact time the seller chose. Changes and cancellations invalidate the old consultation task.</p>
    {bookings.length ? <ul className="mt-4 space-y-3">{bookings.map((booking) => <li key={booking.id} className="fieldbook-record rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-cyan-100">{sellerAppointmentStatus(booking.status)}</p>
      <p className="mt-2 text-sm"><time dateTime={booking.start_time}>{new Date(booking.start_time).toLocaleDateString(undefined, { dateStyle: 'medium', timeZone })}</time></p>
      <p className="mt-1 text-base font-semibold"><time dateTime={booking.start_time}>{formatAppointmentTime(booking.start_time, timeZone)}</time><span aria-hidden="true"> – </span><time dateTime={booking.end_time}>{formatAppointmentTime(booking.end_time, timeZone)}</time></p>
      <p className="mt-1 text-xs text-slate-400">{booking.linked ? 'Linked to this case' : 'Not yet linked to this case'}</p>
      {booking.status === 'accepted' && !booking.linked ? <button type="button" disabled={disabled} className={buttonClass} onClick={() => onLink(booking.id)}>Link booking and open planner</button> : null}
      {booking.status === 'accepted' && booking.linked ? <p className="mt-3 text-sm text-slate-300">This appointment is linked. Its final time and reminders are managed in your planner.</p> : null}
    </li>)}</ul> : <p className="mt-4 text-sm text-slate-400">No consultation bookings yet. The seller can request a time through your existing booking link.</p>}
  </section>;
}

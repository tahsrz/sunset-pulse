import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SellerAppointmentStep, sellerAppointmentStatus } from '@/components/realtor/SellerAppointmentStep';

afterEach(() => cleanup());

const acceptedBooking = {
  id: 'booking-1', start_time: '2026-10-22T14:00:00Z', end_time: '2026-10-22T14:30:00Z', status: 'accepted', linked: false,
};

describe('seller appointment step', () => {
  it('shows the chosen time range and routes accepted bookings through the existing link action', () => {
    const onLink = vi.fn();
    const { container } = render(<SellerAppointmentStep bookings={[acceptedBooking]} timeZone="America/Chicago" disabled={false} onLink={onLink} />);

    expect(screen.getByText('Accepted')).toBeInTheDocument();
    expect(screen.getByText('Not yet linked to this case')).toBeInTheDocument();
    expect(container.querySelectorAll('time')).toHaveLength(3);
    expect(container.querySelector(`time[datetime="${acceptedBooking.start_time}"]`)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Link booking and open planner' }));
    expect(onLink).toHaveBeenCalledWith('booking-1');
  });

  it('does not offer the planner handoff for pending bookings and labels known states plainly', () => {
    render(<SellerAppointmentStep bookings={[{ ...acceptedBooking, status: 'pending' }]} timeZone="America/Chicago" disabled={false} onLink={vi.fn()} />);
    expect(screen.getByText('Waiting for a response')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Link booking and open planner' })).not.toBeInTheDocument();
    expect(sellerAppointmentStatus('cancelled')).toBe('Cancelled');
    expect(sellerAppointmentStatus('provider_review')).toBe('Status: provider review');
  });
});

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PremiumPage from '@/app/premium/page';

const authMocks = vi.hoisted(() => ({
  user: { id: 'user-1', email: 'buyer@example.test' } as unknown,
}));

const toastMocks = vi.hoisted(() => ({
  error: vi.fn(),
  info: vi.fn(),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: authMocks.user }),
}));

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn().mockResolvedValue({
    redirectToCheckout: vi.fn(),
  }),
}));

vi.mock('react-toastify', () => ({
  toast: toastMocks,
}));

describe('Premium checkout UI', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    authMocks.user = { id: 'user-1', email: 'buyer@example.test' };
    toastMocks.error.mockReset();
    toastMocks.info.mockReset();
    vi.stubGlobal('fetch', vi.fn());
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: 'https://www.sunsetpulse.app/premium' },
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('redirects a signed-in buyer using the standard checkout response envelope', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          sessionId: 'cs_test_site',
          url: 'https://checkout.stripe.test/site',
        },
      }),
    } as Response);

    render(<PremiumPage />);
    fireEvent.click(screen.getByRole('button', { name: /claim your site/i }));

    await waitFor(() => {
      expect(window.location.href).toBe('https://checkout.stripe.test/site');
    });
    expect(fetch).toHaveBeenCalledWith('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('keeps anonymous buyers out of Stripe checkout', () => {
    authMocks.user = null;

    render(<PremiumPage />);
    fireEvent.click(screen.getByRole('button', { name: /claim your site/i }));

    expect(fetch).not.toHaveBeenCalled();
    expect(toastMocks.error).toHaveBeenCalledWith('Please login to upgrade to Premium.');
  });

  it('opens existing setup when checkout is blocked by an active site subscription', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        error: true,
        message: 'You already have a site subscription.',
        details: {
          reason: 'existing_site_subscription',
          site: {
            setupUrl: '/onboarding/site/setup?session_id=cs_existing_site',
          },
        },
      }),
    } as Response);

    render(<PremiumPage />);
    fireEvent.click(screen.getByRole('button', { name: /claim your site/i }));

    await waitFor(() => {
      expect(window.location.href).toBe('/onboarding/site/setup?session_id=cs_existing_site');
    });
    expect(toastMocks.info).toHaveBeenCalledWith('You already have a site. Opening your setup workspace.');
    expect(toastMocks.error).not.toHaveBeenCalled();
  });
});

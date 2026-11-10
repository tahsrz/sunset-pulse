import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SellerAccessConfirmation } from '@/components/realtor/SellerAccessConfirmation';

afterEach(() => cleanup());

describe('seller access confirmation', () => {
  it('explains verified account access and waits for explicit enable confirmation', async () => {
    const onConfirm = vi.fn(async () => true);
    render(<SellerAccessConfirmation enabled={false} verifiedEmail="seller@example.com" busy={false} saveBlocked={false} error="" onClose={vi.fn()} onConfirm={onConfirm} />);

    expect(screen.getByText(/read-only access/)).toBeInTheDocument();
    expect(screen.getByText(/seller@example.com/)).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Enable verified access' })); });
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('makes revocation consequences clear before the access change', () => {
    render(<SellerAccessConfirmation enabled verifiedEmail="seller@example.com" busy={false} saveBlocked={false} error="" onClose={vi.fn()} onConfirm={vi.fn(async () => true)} />);
    expect(screen.getByText(/stops the seller from viewing the published update/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Revoke access' })).toBeInTheDocument();
  });
});

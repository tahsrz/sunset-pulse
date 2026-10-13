import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider, useTheme } from '@/context/ThemeProvider';
import { CartProvider, useCart } from '@/context/CartContext';

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: null }) }));

const quadrant = { background: '#060913', color: '#ffffff' };
const branding = {
  primaryColor: '#ffffff', fontFamily: 'Inter', borderRadius: '12px',
  quadrants: { topLeft: quadrant, topRight: quadrant, bottomLeft: quadrant, bottomRight: quadrant },
};

function Controls() {
  const theme = useTheme();
  const cart = useCart();
  return (
    <>
      <p>Left hand: {String(theme.isLefthandMode)}</p>
      <p>Cart items: {cart.cart.length}</p>
      <button onClick={() => theme.setLefthandMode(true)}>Change preference</button>
      <button onClick={() => cart.addToCart({ id: 'test-item', name: 'Test item', price: 5 })}>Add item</button>
      <button onClick={() => cart.clearCart()}>Clear cart</button>
    </>
  );
}
function renderProviders() {
  return render(<ThemeProvider branding={branding}><CartProvider><Controls /></CartProvider></ThemeProvider>);
}

beforeEach(() => window.localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('shared providers with optional browser persistence', () => {
  it('keeps defaults and in-memory controls usable when accessing localStorage throws', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new DOMException('Denied', 'SecurityError'); });
    expect(renderProviders).not.toThrow();
    expect(screen.getByText('Left hand: false')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Change preference' }));
    expect(screen.getByText('Left hand: true')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
    expect(screen.getByText('Cart items: 1')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Clear cart' }));
    expect(screen.getByText('Cart items: 0')).toBeTruthy();
  });

  it('retains in-memory updates when saves and removals throw', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError'); });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new DOMException('Denied', 'SecurityError'); });
    expect(renderProviders).not.toThrow();
    fireEvent.click(screen.getByRole('button', { name: 'Change preference' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
    expect(screen.getByText('Left hand: true')).toBeTruthy();
    expect(screen.getByText('Cart items: 1')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Clear cart' }));
    expect(screen.getByText('Cart items: 0')).toBeTruthy();
  });

  it('still restores and saves existing preferences and cart formats', () => {
    window.localStorage.setItem('jamie_lefthand_mode', 'true');
    window.localStorage.setItem('sunset_cart', '[{"id":"existing","name":"Existing","price":5,"quantity":1}]');
    renderProviders();
    expect(screen.getByText('Left hand: true')).toBeTruthy();
    expect(screen.getByText('Cart items: 1')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Clear cart' }));
    expect(window.localStorage.getItem('sunset_cart')).toBe('[]');
  });
});

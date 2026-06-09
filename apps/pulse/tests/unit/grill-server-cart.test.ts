import { describe, expect, it } from 'vitest';
import { sanitizeCartItemsWithCatalog } from '@/lib/grill/serverCart';

describe('server-side grill cart sanitization', () => {
  const catalog = [
    {
      _id: 'menu-cheeseburger',
      name: 'Cheeseburger Basket',
      price: 10.59,
      isAvailable: true,
    },
  ];

  it('uses server menu name and price instead of browser-supplied values', () => {
    const items = sanitizeCartItemsWithCatalog([
      {
        id: 'menu-cheeseburger',
        name: 'Free Lobster',
        price: 0.01,
        quantity: 2,
        customization: {
          sauces: ['Mayo', 'mayo', 'Mustard'],
          allTheWay: true,
          removedVegetables: ['Pickles'],
        },
      },
    ], catalog);

    expect(items).toEqual([
      expect.objectContaining({
        id: 'menu-cheeseburger',
        name: 'Cheeseburger Basket',
        price: 10.59,
        quantity: 2,
        customization: {
          sauces: ['mayo', 'mustard'],
          vegetables: [],
          allTheWay: true,
          removedVegetables: ['pickles'],
        },
      }),
    ]);
  });

  it('rejects items that are not in the active menu catalog', () => {
    expect(() => sanitizeCartItemsWithCatalog([
      {
        id: 'not-real',
        name: 'Fake Burger',
        price: 1,
        quantity: 1,
      },
    ], catalog)).toThrow(/unavailable or invalid/i);
  });

  it('allows the fixed delivery fee without trusting browser price', () => {
    const items = sanitizeCartItemsWithCatalog([
      {
        id: 'delivery-fee',
        name: 'Free Delivery',
        price: 0,
        quantity: 1,
      },
    ], catalog);

    expect(items).toEqual([
      {
        id: 'delivery-fee',
        name: 'Mailbox Delivery Fee',
        price: 10,
        quantity: 1,
        discountEligible: false,
      },
    ]);
  });
});

import { describe, expect, it } from 'vitest';
import {
  buildDefaultBurgerCustomization,
  generateEmployeeTicket,
  generatePhoneCallScript,
  type CartItem,
} from '@/lib/grill/orderRelay';

describe('AI phone relay deterministic order formatting', () => {
  it('formats two cheeseburger baskets with different customizations for ticket and phone relay', () => {
    const cartItems: CartItem[] = [
      {
        id: 'cheeseburger-basket-1',
        name: 'Cheeseburger Basket',
        quantity: 1,
        customization: {
          sauces: ['mayo', 'mustard'],
          allTheWay: true,
          removedVegetables: ['pickles'],
        },
      },
      {
        id: 'cheeseburger-basket-2',
        name: 'Cheeseburger Basket',
        quantity: 1,
        customization: {
          sauces: ['mayo'],
          allTheWay: true,
        },
      },
    ];

    expect(generateEmployeeTicket(cartItems).ticket).toBe(`ORDER: 2 Cheeseburger Baskets

#1 Cheeseburger Basket
Sauce: Mayo, Mustard
Vegetables: Lettuce, Onions, Tomato
Removed: Pickles

#2 Cheeseburger Basket
Sauce: Mayo
Vegetables: Pickles, Lettuce, Onions, Tomato`);

    const callScript = generatePhoneCallScript(cartItems);

    expect(callScript.madeDifferent).toBe(true);
    expect(callScript.script).toBe(`Hi, this is Jamie, an automated order assistant calling in a pickup order.
Are you ready for the order?

Thank you. The order is two cheeseburger baskets. They are made different.

First cheeseburger basket:
Sauce: mayo and mustard.
Vegetables: lettuce, onions, and tomato.
No pickles.
Second cheeseburger basket:
Sauce: mayo.
Vegetables: pickles, lettuce, onions, and tomato.

Please read that back when you are ready.
It should be two cheeseburger baskets.
First one: mayo and mustard, lettuce, onions, tomato, no pickles.
Second one: mayo, pickles, lettuce, onions, and tomato.
If anything sounded unclear, I can repeat it.`);
  });

  it('defaults menu items to all the way and turns notes into structured removals', () => {
    const cartItems: CartItem[] = [
      {
        id: 'hamburger-basket',
        name: 'Hamburger Basket',
        quantity: 1,
        customization: buildDefaultBurgerCustomization(),
      },
      {
        id: 'cheeseburger-basket',
        name: 'Cheeseburger Basket',
        quantity: 1,
        customization: buildDefaultBurgerCustomization('no pickles, no onions'),
      },
      {
        id: 'plain-burger',
        name: 'Burger',
        quantity: 1,
        customization: buildDefaultBurgerCustomization('plain'),
      },
    ];

    expect(generateEmployeeTicket(cartItems).ticket).toBe(`ORDER: 1 Hamburger Basket, 1 Cheeseburger Basket, 1 Burger

#1 Hamburger Basket
Sauce: None
Vegetables: Pickles, Lettuce, Onions, Tomato

#2 Cheeseburger Basket
Sauce: None
Vegetables: Lettuce, Tomato
Removed: Pickles, Onions

#3 Burger
Sauce: None
Vegetables: None
Removed: Pickles, Lettuce, Onions, Tomato`);
  });
});

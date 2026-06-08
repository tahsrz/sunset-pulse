'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { calculateCartPricing, normalizeCouponCode } from '@/lib/grill/deals';

const CartContext = createContext();

const getCartLineKey = (item) => {
  const itemIdentifier = item._id || item.id;
  const customizationKey = JSON.stringify(item.customization || {});
  return `${itemIdentifier}:${customizationKey}`;
};

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [couponCode, setCouponCode] = useState('');
  const [lastOrder, setLastOrder] = useState(null);

  // 1. Load cart from local storage on initial mount
  useEffect(() => {
    const savedCart = localStorage.getItem('sunset_cart');
    const savedCouponCode = localStorage.getItem('sunset_coupon_code');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (error) {
        console.error('Error parsing cart data', error);
        setCart([]);
      }
    }
    if (savedCouponCode) {
      setCouponCode(normalizeCouponCode(savedCouponCode));
    }

    const savedLastOrder = localStorage.getItem('sunset_last_order');
    if (savedLastOrder) {
      try {
        setLastOrder(JSON.parse(savedLastOrder));
      } catch (error) {
        console.error('Error parsing last order data', error);
        localStorage.removeItem('sunset_last_order');
      }
    }
  }, []);

  // 2. Save cart to local storage whenever it changes
  useEffect(() => {
    localStorage.setItem('sunset_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const normalized = normalizeCouponCode(couponCode);
    if (normalized) {
      localStorage.setItem('sunset_coupon_code', normalized);
    } else {
      localStorage.removeItem('sunset_coupon_code');
    }
  }, [couponCode]);

  // 3. Logic to add item or increment quantity
  const addToCart = (item) => {
    setCart((prevCart) => {
      // Use _id to match the data coming from your MongoDB menu
      const itemKey = getCartLineKey(item);
      const existingItem = prevCart.find((i) => getCartLineKey(i) === itemKey);
      
      if (existingItem) {
        return prevCart.map((i) =>
          getCartLineKey(i) === itemKey
            ? { ...i, quantity: i.quantity + 1 } 
            : i
        );
      }
      // Add new item with a starting quantity of 1
      return [...prevCart, { ...item, quantity: 1 }];
    });
  };

  // 4. Remove specific item from cart using the MongoDB _id
  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => (item._id || item.id) !== id));
  };

  // 5. Clear the entire tray (used after a successful order)
  const clearCart = () => {
    setCart([]);
    setCouponCode('');
    localStorage.removeItem('sunset_cart');
    localStorage.removeItem('sunset_coupon_code');
  };

  const saveLastOrder = (items = cart, code = couponCode) => {
    const grillItems = (items || []).filter((item) => item.id !== 'delivery-fee' && item.name !== 'Mailbox Delivery Fee');
    if (grillItems.length === 0) return;

    const orderSnapshot = {
      items: grillItems,
      couponCode: normalizeCouponCode(code),
      savedAt: new Date().toISOString(),
    };

    setLastOrder(orderSnapshot);
    localStorage.setItem('sunset_last_order', JSON.stringify(orderSnapshot));
  };

  const reorderLastOrder = () => {
    if (!lastOrder?.items?.length) return false;
    setCart(lastOrder.items);
    setCouponCode(normalizeCouponCode(lastOrder.couponCode));
    return true;
  };

  // 6. Calculate total price
  const pricing = calculateCartPricing(cart, couponCode);
  const cartSubtotal = pricing.subtotalAmount;
  const cartDiscount = pricing.discountAmount;
  const cartTotal = pricing.totalAmount;
  const appliedDeal = pricing.appliedDeal;

  const applyCoupon = (code) => {
    setCouponCode(normalizeCouponCode(code));
  };

  const removeCoupon = () => {
    setCouponCode('');
  };

  return (
    <CartContext.Provider 
      value={{ 
        cart, 
        addToCart, 
        removeFromCart, 
        clearCart, 
        cartSubtotal,
        cartDiscount,
        cartTotal,
        couponCode,
        appliedDeal,
        applyCoupon,
        removeCoupon,
        lastOrder,
        saveLastOrder,
        reorderLastOrder
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

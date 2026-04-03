'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);

  // 1. Load cart from local storage on initial mount
  useEffect(() => {
    const savedCart = localStorage.getItem('sunset_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (error) {
        console.error('Error parsing cart data', error);
        setCart([]);
      }
    }
  }, []);

  // 2. Save cart to local storage whenever it changes
  useEffect(() => {
    localStorage.setItem('sunset_cart', JSON.stringify(cart));
  }, [cart]);

  // 3. Logic to add item or increment quantity
  const addToCart = (item) => {
    setCart((prevCart) => {
      // Use _id to match the data coming from your MongoDB menu
      const itemIdentifier = item._id || item.id;
      const existingItem = prevCart.find((i) => (i._id || i.id) === itemIdentifier);
      
      if (existingItem) {
        return prevCart.map((i) =>
          (i._id || i.id) === itemIdentifier 
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
    localStorage.removeItem('sunset_cart');
  };

  // 6. Calculate total price
  const cartTotal = cart.reduce(
    (acc, item) => acc + item.price * item.quantity, 
    0
  );

  return (
    <CartContext.Provider 
      value={{ 
        cart, 
        addToCart, 
        removeFromCart, 
        clearCart, 
        cartTotal 
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

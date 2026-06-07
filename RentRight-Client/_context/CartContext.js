import { createContext, useContext, useState } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [bookings, setBookings] = useState([]);

  const addToCart = (item) => {
    const normalizedItem = {
      ...item,
      id: item._id || item.id,
      image: item.imageUrl || item.image,
      price: item.price == null ? 0 : Number(item.price),
      variant: item.variant || item.category || item.tag || `$${item.price}`,
    };

    setCartItems((prev) => {
      const existingItem = prev.find((cartItem) => cartItem.id === normalizedItem.id);

      if (existingItem) {
        return prev.map((cartItem) =>
          cartItem.id === normalizedItem.id
            ? { ...cartItem, qty: cartItem.qty + 1 }
            : cartItem
        );
      }

      return [...prev, { ...normalizedItem, qty: 1 }];
    });
  };

  const removeFromCart = (id) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const incrementQty = (id) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, qty: item.qty + 1 } : item
      )
    );
  };

  const decrementQty = (id) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === id && item.qty > 1
          ? { ...item, qty: item.qty - 1 }
          : item
      )
    );
  };

  const updateCartItem = (id, patch) => {
    setCartItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const addBookings = (items) => {
    if (!Array.isArray(items) || items.length === 0) return;

    setBookings((prev) => {
      const newBookings = items.map((item) => ({
        ...item,
        bookedAt: new Date().toISOString(),
      }));
      return [...newBookings, ...prev];
    });
  };

  const removeBooking = (id) => {
    setBookings((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const value = {
    cartItems,
    bookings,
    addToCart,
    addBookings,
    removeFromCart,
    removeBooking,
    incrementQty,
    decrementQty,
    updateCartItem,
    clearCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

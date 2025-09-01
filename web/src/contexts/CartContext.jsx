import React, { createContext, useContext, useState, useEffect } from 'react';
import { message } from 'antd';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cartVisible, setCartVisible] = useState(false);

  // Load cart from localStorage on component mount
  useEffect(() => {
    const savedCart = localStorage.getItem('shopping_cart');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
        localStorage.removeItem('shopping_cart');
      }
    }
  }, []);

  // Save cart to localStorage whenever cartItems changes
  useEffect(() => {
    if (cartItems.length > 0) {
      localStorage.setItem('shopping_cart', JSON.stringify(cartItems));
    } else if (cartItems.length === 0) {
      localStorage.removeItem('shopping_cart');
    }
  }, [cartItems]);

  const addToCart = async (product, quantity = 1, options = {}) => {
    try {
      setLoading(true);
      
      // Create a unique identifier that includes variant information
      const itemKey = `${product.id}_${options.variant_id || 'no_variant'}`;
      
      const existingItemIndex = cartItems.findIndex(
        item => `${item.id}_${item.options?.variant_id || 'no_variant'}` === itemKey
      );

      if (existingItemIndex > -1) {
        // Update existing item quantity
        const updatedItems = [...cartItems];
        updatedItems[existingItemIndex].quantity += quantity;
        setCartItems(updatedItems);
        
        const variantText = options.variant_name && options.variant_value ? 
          ` (${options.variant_name}: ${options.variant_value})` : '';
        message.success(`Updated ${product.title_en || product.name}${variantText} quantity in cart`);
      } else {
        // Calculate final price including variant modifier
        const basePrice = product.final_price || product.base_price || product.price || 0;
        const variantModifier = options.price_modifier || 0;
        const finalPrice = basePrice + variantModifier;
        
        // Add new item to cart
        const cartItem = {
          id: product.id,
          title: product.title_en || product.name_en || product.name || 'Unnamed Product',
          price: finalPrice,
          image: product.main_image,
          quantity,
          options,
          stock_status: product.stock_status || 'in_stock'
        };
        
        setCartItems(prev => [...prev, cartItem]);
        
        const variantText = options.variant_name && options.variant_value ? 
          ` (${options.variant_name}: ${options.variant_value})` : '';
        message.success(`Added ${product.title_en || product.name}${variantText} to cart`);
      }
      
      // Show cart drawer briefly
      setCartVisible(true);
      setTimeout(() => setCartVisible(false), 2000);
      
    } catch (error) {
      console.error('Error adding to cart:', error);
      message.error('Failed to add item to cart');
    } finally {
      setLoading(false);
    }
  };

  const updateCartItem = (itemId, variantId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(itemId, variantId);
      return;
    }

    const itemKey = `${itemId}_${variantId || 'no_variant'}`;
    setCartItems(prev =>
      prev.map(item =>
        `${item.id}_${item.options?.variant_id || 'no_variant'}` === itemKey ? { ...item, quantity } : item
      )
    );
  };

  const removeFromCart = (itemId, variantId = null) => {
    const itemKey = `${itemId}_${variantId || 'no_variant'}`;
    setCartItems(prev => prev.filter(item => 
      `${item.id}_${item.options?.variant_id || 'no_variant'}` !== itemKey
    ));
    message.success('Item removed from cart');
  };

  const clearCart = () => {
    setCartItems([]);
    message.success('Cart cleared');
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getCartItemsCount = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const toggleCartVisibility = () => {
    setCartVisible(!cartVisible);
  };

  const value = {
    cartItems,
    loading,
    cartVisible,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    getCartTotal,
    getCartItemsCount,
    toggleCartVisibility,
    setCartVisible
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

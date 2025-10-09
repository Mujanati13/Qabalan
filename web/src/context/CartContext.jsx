import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const isBrowser = typeof window !== 'undefined';

  const loadCartFromStorage = useCallback(() => {
    if (!isBrowser) {
      return [];
    }

    try {
      const savedCart = window.localStorage.getItem('cart');
      if (!savedCart) {
        return [];
      }

      const parsed = JSON.parse(savedCart);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('❌ Error loading cart from localStorage:', error);
      window.localStorage.removeItem('cart');
      return [];
    }
  }, [isBrowser]);

  const calculateCartCount = useCallback((items) => (
    Array.isArray(items)
      ? items.reduce((total, item) => total + (item.quantity || 0), 0)
      : 0
  ), []);

  const [cart, setCart] = useState(() => loadCartFromStorage());
  const [cartCount, setCartCount] = useState(() => calculateCartCount(loadCartFromStorage()));

  useEffect(() => {
    if (!isBrowser) {
      return;
    }

    try {
      window.localStorage.setItem('cart', JSON.stringify(cart));
    } catch (error) {
      console.error('❌ Error saving cart to localStorage:', error);
    }

    setCartCount(calculateCartCount(cart));
  }, [cart, calculateCartCount, isBrowser]);

  useEffect(() => {
    if (!isBrowser) {
      return;
    }

    const handleStorageChange = (event) => {
      if (event.key === 'cart' && event.newValue !== null) {
        try {
          const parsed = JSON.parse(event.newValue);
          if (Array.isArray(parsed)) {
            setCart(parsed);
          }
        } catch (error) {
          console.error('❌ Error syncing cart from storage event:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isBrowser]);

  const addToCart = (product, quantity = 1, variant = null, specialInstructions = '') => {
    console.log('🛒 Adding to cart:', { product, quantity, variant, specialInstructions });
    
    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex((item) => {
        // Normalize variant IDs for comparison
        const itemVariantId = item.variant?.id ?? null;
        const targetVariantId = variant?.id ?? null;
        return item.id === product.id && itemVariantId === targetVariantId;
      });

      if (existingItemIndex > -1) {
        const updatedCart = [...prevCart];
        updatedCart[existingItemIndex].quantity += quantity;
        // Update special instructions if provided
        if (specialInstructions) {
          updatedCart[existingItemIndex].special_instructions = specialInstructions;
        }
        console.log('✅ Updated existing item in cart:', updatedCart);
        return updatedCart;
      }

      // Add unit_price for consistent pricing
      const unitPrice = variant ? variant.price : (product.final_price || product.sale_price || product.base_price || 0);

      const newCart = [...prevCart, { 
        ...product, 
        quantity, 
        variant, 
        special_instructions: specialInstructions || '',
        unit_price: unitPrice
      }];
      
      console.log('✅ Added new item to cart:', newCart);
      return newCart;
    });
  };

  const removeFromCart = (productId, variantId = null) => {
    console.log('🗑️ Removing from cart:', { productId, variantId });
    setCart((prevCart) => {
      const newCart = prevCart.filter((item) => {
        // Normalize variant IDs: treat undefined, null, and 0 as equivalent
        const itemVariantId = item.variant?.id ?? null;
        const targetVariantId = variantId ?? null;
        
        // Item matches if product ID is different OR variant ID is different
        const matches = item.id === productId && itemVariantId === targetVariantId;
        return !matches;
      });
      console.log('✅ Cart after removal:', newCart);
      return newCart;
    });
  };

  const updateQuantity = (productId, quantity, variantId = null) => {
    if (quantity <= 0) {
      removeFromCart(productId, variantId);
      return;
    }

    setCart((prevCart) =>
      prevCart.map((item) => {
        // Normalize variant IDs
        const itemVariantId = item.variant?.id ?? null;
        const targetVariantId = variantId ?? null;
        
        if (item.id === productId && itemVariantId === targetVariantId) {
          return { ...item, quantity };
        }
        return item;
      })
    );
  };

  const updateItemInstructions = (productId, variantId = null, instructions = '') => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        // Normalize variant IDs
        const itemVariantId = item.variant?.id ?? null;
        const targetVariantId = variantId ?? null;
        
        if (item.id === productId && itemVariantId === targetVariantId) {
          return { ...item, special_instructions: instructions };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
    if (isBrowser) {
      window.localStorage.removeItem('cart');
    }
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => {
      // Parse numeric values safely
      const parseNumericValue = (value) => {
        if (value === null || value === undefined) return 0;
        if (typeof value === 'number') {
          return Number.isNaN(value) ? 0 : value;
        }
        const parsed = parseFloat(String(value));
        return Number.isNaN(parsed) ? 0 : parsed;
      };

      // Use unit_price if available, otherwise calculate from item data
      let price = 0;
      if (item.unit_price !== undefined && item.unit_price !== null) {
        price = parseNumericValue(item.unit_price);
      } else if (item.variant && item.variant.price !== undefined) {
        price = parseNumericValue(item.variant.price);
      } else {
        price = parseNumericValue(
          item.final_price ?? item.sale_price ?? item.base_price ?? 0
        );
      }

      const quantity = parseNumericValue(item.quantity);
      return total + (price * quantity);
    }, 0);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        addToCart,
        removeFromCart,
        updateQuantity,
        updateItemInstructions,
        clearCart,
        getCartTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

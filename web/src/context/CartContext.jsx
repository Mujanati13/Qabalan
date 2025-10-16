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

  const addToCart = (product, quantity = 1, variants = null, specialInstructions = '') => {
    console.log('🛒 Adding to cart:', { product, quantity, variants, specialInstructions });
    
    // Handle both single variant (backward compatibility) and array of variants
    const variantsArray = Array.isArray(variants) ? variants : (variants ? [variants] : []);
    
    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex((item) => {
        // Compare product ID
        if (item.id !== product.id) return false;
        
        // Compare variants array (order-independent)
        const itemVariants = Array.isArray(item.variants) ? item.variants : (item.variant ? [item.variant] : []);
        const targetVariants = variantsArray;
        
        if (itemVariants.length !== targetVariants.length) return false;
        
        // Check if all variant IDs match (order-independent)
        const itemVariantIds = itemVariants.map(v => v.id).sort();
        const targetVariantIds = targetVariants.map(v => v.id).sort();
        
        return JSON.stringify(itemVariantIds) === JSON.stringify(targetVariantIds);
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

      // Calculate unit_price for multi-variant - consider price_behavior
      let unitPrice = parseFloat(product.final_price || product.sale_price || product.base_price || 0);
      
      if (variantsArray.length > 0) {
        // Separate override and add variants
        const overrideVariants = variantsArray.filter(v => {
          const behavior = v.price_behavior || v.pricing_behavior;
          return behavior === 'override';
        });
        
        const addVariants = variantsArray.filter(v => {
          const behavior = v.price_behavior || v.pricing_behavior;
          return behavior !== 'override'; // treat null/undefined as 'add'
        });
        
        // Sort override variants by priority (lower number = higher priority)
        const sortedOverrides = overrideVariants.sort((a, b) => {
          const priorityA = a.override_priority !== null && a.override_priority !== undefined ? a.override_priority : Infinity;
          const priorityB = b.override_priority !== null && b.override_priority !== undefined ? b.override_priority : Infinity;
          return priorityA - priorityB;
        });
        
        // Apply the first override variant (highest priority)
        if (sortedOverrides.length > 0) {
          const winningOverride = sortedOverrides[0];
          unitPrice = parseFloat(winningOverride.price || winningOverride.price_modifier || 0);
        }
        
        // Add all "add" variants
        addVariants.forEach(variant => {
          const variantModifier = parseFloat(variant.price || variant.price_modifier || 0);
          unitPrice += variantModifier;
        });
      }

      const newCart = [...prevCart, { 
        ...product, 
        quantity, 
        variants: variantsArray, // Store as array
        variant: variantsArray.length === 1 ? variantsArray[0] : null, // Backward compatibility
        special_instructions: specialInstructions || '',
        unit_price: unitPrice
      }];
      
      console.log('✅ Added new item to cart:', newCart);
      return newCart;
    });
  };

  const removeFromCart = (productId, variantsOrVariantId = null) => {
    console.log('🗑️ Removing from cart:', { productId, variantsOrVariantId });
    setCart((prevCart) => {
      const newCart = prevCart.filter((item) => {
        if (item.id !== productId) return true; // Keep items with different product ID
        
        // Handle both array of variants and single variant ID for backward compatibility
        const targetVariants = Array.isArray(variantsOrVariantId) 
          ? variantsOrVariantId 
          : (variantsOrVariantId ? [{ id: variantsOrVariantId }] : []);
        
        const itemVariants = Array.isArray(item.variants) 
          ? item.variants 
          : (item.variant ? [item.variant] : []);
        
        // If no target variants specified, remove all items with this product ID
        if (targetVariants.length === 0 && itemVariants.length === 0) {
          return false; // Remove this item
        }
        
        // Compare variant IDs
        const itemVariantIds = itemVariants.map(v => v.id).sort();
        const targetVariantIds = targetVariants.map(v => v.id).sort();
        
        const matches = JSON.stringify(itemVariantIds) === JSON.stringify(targetVariantIds);
        return !matches; // Keep items that don't match
      });
      console.log('✅ Cart after removal:', newCart);
      return newCart;
    });
  };

  const updateQuantity = (productId, quantity, variantsOrVariantId = null) => {
    if (quantity <= 0) {
      removeFromCart(productId, variantsOrVariantId);
      return;
    }

    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.id !== productId) return item;
        
        // Handle both array of variants and single variant ID for backward compatibility
        const targetVariants = Array.isArray(variantsOrVariantId) 
          ? variantsOrVariantId 
          : (variantsOrVariantId ? [{ id: variantsOrVariantId }] : []);
        
        const itemVariants = Array.isArray(item.variants) 
          ? item.variants 
          : (item.variant ? [item.variant] : []);
        
        // Compare variant IDs
        const itemVariantIds = itemVariants.map(v => v.id).sort();
        const targetVariantIds = targetVariants.map(v => v.id).sort();
        
        if (JSON.stringify(itemVariantIds) === JSON.stringify(targetVariantIds)) {
          return { ...item, quantity };
        }
        return item;
      })
    );
  };

  const updateItemInstructions = (productId, variantsOrVariantId = null, instructions = '') => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.id !== productId) return item;
        
        // Handle both array of variants and single variant ID for backward compatibility
        const targetVariants = Array.isArray(variantsOrVariantId) 
          ? variantsOrVariantId 
          : (variantsOrVariantId ? [{ id: variantsOrVariantId }] : []);
        
        const itemVariants = Array.isArray(item.variants) 
          ? item.variants 
          : (item.variant ? [item.variant] : []);
        
        // Compare variant IDs
        const itemVariantIds = itemVariants.map(v => v.id).sort();
        const targetVariantIds = targetVariants.map(v => v.id).sort();
        
        if (JSON.stringify(itemVariantIds) === JSON.stringify(targetVariantIds)) {
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

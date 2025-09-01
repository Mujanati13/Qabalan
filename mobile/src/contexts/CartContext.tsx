import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartItem, Product } from '../services/apiService';

interface CartState {
  items: CartItem[];
  itemCount: number;
  totalAmount: number;
  loading: boolean;
}

interface CartContextType extends CartState {
  addToCart: (product: Product, quantity?: number, variant_id?: number, special_instructions?: string) => void;
  removeFromCart: (product_id: number, variant_id?: number) => void;
  updateQuantity: (product_id: number, quantity: number, variant_id?: number) => void;
  clearCart: () => void;
  clearGuestCart: () => Promise<void>; // New method to clear guest cart data
  getCartItem: (product_id: number, variant_id?: number) => CartItem | undefined;
  switchToGuestMode: () => Promise<void>; // Switch cart to guest mode
  switchToAuthMode: () => Promise<void>; // Switch cart to authenticated mode
}

type CartAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CART'; payload: CartItem[] }
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: { product_id: number; variant_id?: number } }
  | { type: 'UPDATE_QUANTITY'; payload: { product_id: number; quantity: number; variant_id?: number } }
  | { type: 'CLEAR_CART' };

const CartContext = createContext<CartContextType | undefined>(undefined);

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_CART':
      const totalAmount = action.payload.reduce((sum, item) => {
        const price = parseFloat(item.product?.final_price?.toString() || item.product?.sale_price?.toString() || item.product?.base_price?.toString() || '0');
        return sum + (price * item.quantity);
      }, 0);
      
      return {
        ...state,
        items: action.payload,
        itemCount: action.payload.reduce((sum, item) => sum + item.quantity, 0),
        totalAmount,
        loading: false,
      };

    case 'ADD_ITEM': {
      const existingItemIndex = state.items.findIndex(
        item => item.product_id === action.payload.product_id && 
                 item.variant_id === action.payload.variant_id
      );

      let newItems: CartItem[];
      if (existingItemIndex >= 0) {
        // Update existing item quantity
        newItems = state.items.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: item.quantity + action.payload.quantity }
            : item
        );
      } else {
        // Add new item
        newItems = [...state.items, action.payload];
      }

      const newTotalAmount = newItems.reduce((sum, item) => {
        const price = parseFloat(item.product?.final_price?.toString() || item.product?.sale_price?.toString() || item.product?.base_price?.toString() || '0');
        return sum + (price * item.quantity);
      }, 0);

      return {
        ...state,
        items: newItems,
        itemCount: newItems.reduce((sum, item) => sum + item.quantity, 0),
        totalAmount: newTotalAmount,
      };
    }

    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(
        item => !(item.product_id === action.payload.product_id && 
                 item.variant_id === action.payload.variant_id)
      );

      const newTotalAmount = newItems.reduce((sum, item) => {
        const price = parseFloat(item.product?.final_price?.toString() || item.product?.sale_price?.toString() || item.product?.base_price?.toString() || '0');
        return sum + (price * item.quantity);
      }, 0);

      return {
        ...state,
        items: newItems,
        itemCount: newItems.reduce((sum, item) => sum + item.quantity, 0),
        totalAmount: newTotalAmount,
      };
    }

    case 'UPDATE_QUANTITY': {
      if (action.payload.quantity <= 0) {
        // Remove item if quantity is 0 or negative
        return cartReducer(state, {
          type: 'REMOVE_ITEM',
          payload: { 
            product_id: action.payload.product_id, 
            variant_id: action.payload.variant_id 
          }
        });
      }

      const newItems = state.items.map(item =>
        item.product_id === action.payload.product_id && 
        item.variant_id === action.payload.variant_id
          ? { ...item, quantity: action.payload.quantity }
          : item
      );

      const newTotalAmount = newItems.reduce((sum, item) => {
        const price = parseFloat(item.product?.final_price?.toString() || item.product?.sale_price?.toString() || item.product?.base_price?.toString() || '0');
        return sum + (price * item.quantity);
      }, 0);

      return {
        ...state,
        items: newItems,
        itemCount: newItems.reduce((sum, item) => sum + item.quantity, 0),
        totalAmount: newTotalAmount,
      };
    }

    case 'CLEAR_CART':
      return {
        ...state,
        items: [],
        itemCount: 0,
        totalAmount: 0,
      };

    default:
      return state;
  }
};

const initialState: CartState = {
  items: [],
  itemCount: 0,
  totalAmount: 0,
  loading: true,
};

const CART_STORAGE_KEY = '@cart_items';
const GUEST_CART_STORAGE_KEY = '@guest_cart_items';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const [isGuestMode, setIsGuestMode] = React.useState(false);

  // Load cart from AsyncStorage on initialization
  useEffect(() => {
    loadCart();
  }, [isGuestMode]);

  // Save cart to AsyncStorage whenever items change
  useEffect(() => {
    if (!state.loading) {
      saveCart();
    }
  }, [state.items, state.loading, isGuestMode]);

  const getCurrentStorageKey = () => {
    return isGuestMode ? GUEST_CART_STORAGE_KEY : CART_STORAGE_KEY;
  };

  const loadCart = async () => {
    try {
      const storageKey = getCurrentStorageKey();
      const cartData = await AsyncStorage.getItem(storageKey);
      if (cartData) {
        const items: CartItem[] = JSON.parse(cartData);
        dispatch({ type: 'SET_CART', payload: items });
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    } catch (error) {
      console.error('Error loading cart:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const saveCart = async () => {
    try {
      const storageKey = getCurrentStorageKey();
      await AsyncStorage.setItem(storageKey, JSON.stringify(state.items));
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  };

  const addToCart = (
    product: Product, 
    quantity: number = 1, 
    variant_id?: number, 
    special_instructions?: string
  ) => {
    const cartItem: CartItem = {
      product_id: product.id,
      variant_id,
      quantity,
      special_instructions,
      product, // Store product data for easy access
    };

    dispatch({ type: 'ADD_ITEM', payload: cartItem });
  };

  const removeFromCart = (product_id: number, variant_id?: number) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { product_id, variant_id } });
  };

  const updateQuantity = (product_id: number, quantity: number, variant_id?: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { product_id, quantity, variant_id } });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const clearGuestCart = async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(GUEST_CART_STORAGE_KEY);
      console.log('✅ Guest cart data cleared');
    } catch (error) {
      console.error('❌ Failed to clear guest cart:', error);
    }
  };

  const switchToGuestMode = async (): Promise<void> => {
    setIsGuestMode(true);
    // Load guest cart data
    await loadCart();
  };

  const switchToAuthMode = async (): Promise<void> => {
    setIsGuestMode(false);
    // Load authenticated user cart data
    await loadCart();
  };

  const getCartItem = (product_id: number, variant_id?: number): CartItem | undefined => {
    return state.items.find(
      item => item.product_id === product_id && item.variant_id === variant_id
    );
  };

  const value: CartContextType = {
    ...state,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    clearGuestCart,
    switchToGuestMode,
    switchToAuthMode,
    getCartItem,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;

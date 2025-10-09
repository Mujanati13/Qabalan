import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useEffect } from 'react';
import { getImageUrl } from '../services/api';
import './Cart.css';

const Cart = () => {
  const { cart, removeFromCart, updateQuantity, getCartTotal, clearCart } = useCart();

  // Debug: Check cart state and localStorage on component mount
  useEffect(() => {
    console.log('🛒 Cart Component Mounted');
    console.log('📊 Current cart state:', cart);
    console.log('📦 localStorage cart:', localStorage.getItem('cart'));
    
    // Test if localStorage is working
    try {
      localStorage.setItem('test', 'working');
      const testValue = localStorage.getItem('test');
      console.log('✅ localStorage test:', testValue);
      localStorage.removeItem('test');
    } catch (e) {
      console.error('❌ localStorage is NOT working:', e);
    }
  }, []);

  // Debug: Monitor cart changes
  useEffect(() => {
    console.log('🔄 Cart changed:', cart);
  }, [cart]);

  // Get product image with fallback
  const getProductImage = (item) => {
    // Use the helper function from api.js
    return getImageUrl(item.main_image || item.image) || '/assets/images/placeholder.svg';
  };

  // Parse numeric values safely - match mobile implementation
  const parseNumericValue = (value) => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') {
      return Number.isNaN(value) ? 0 : value;
    }
    const parsed = parseFloat(String(value));
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  // Resolve unit price - match mobile CartScreen logic
  const resolveUnitPrice = (item) => {
    // If item has explicit unit_price, use it
    if (typeof item.unit_price === 'number' && !Number.isNaN(item.unit_price)) {
      return item.unit_price;
    }

    // Get base price from product
    const base = parseNumericValue(
      item.final_price ?? item.sale_price ?? item.base_price
    );

    // If variant exists and has price adjustments, apply them
    if (item.variant) {
      const variantPrice = parseNumericValue(item.variant.price);
      if (variantPrice > 0) {
        return variantPrice;
      }
      // Could add variant price adjustments here if needed
    }

    return base;
  };

  const handleQuantityChange = (productId, newQuantity, variantId) => {
    if (newQuantity > 0) {
      updateQuantity(productId, newQuantity, variantId);
    } else {
      // If quantity is 0 or less, remove item - match mobile behavior
      removeFromCart(productId, variantId);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="cart-page">
        <div className="container">
          <div className="empty-cart">
            <h1>Your Cart is Empty</h1>
            <p>Add some delicious items to get started!</p>
            <Link to="/shop" className="continue-shopping-btn">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="container">
        <div className="cart-content">
          <div className="cart-items">
            {cart.map((item) => {
              // Calculate prices like mobile CartScreen
              const unitPrice = resolveUnitPrice(item);
              const basePrice = parseNumericValue(
                item.base_price ?? item.final_price ?? item.sale_price
              );
              const hasDiscount = basePrice > 0 && unitPrice > 0 && unitPrice < basePrice;
              const discountPercentage = hasDiscount
                ? Math.round(((basePrice - unitPrice) / basePrice) * 100)
                : 0;
              const itemTotal = unitPrice * item.quantity;

              return (
                <div key={`${item.id}-${item.variant?.id || 'default'}`} className="cart-item">
                  <div className="item-image">
                    <img
                      src={getProductImage(item)}
                      alt={item.title_en || item.title_ar || 'Product'}
                      onError={(e) => {
                        e.target.onerror = null; // Prevent infinite loop
                        e.target.src = '/assets/images/placeholder.svg';
                      }}
                    />
                    {hasDiscount && (
                      <div className="discount-badge">
                        -{discountPercentage}%
                      </div>
                    )}
                  </div>
                  <div className="item-details">
                    <h3>{item.title_en || item.title_ar || 'Unnamed Product'}</h3>
                    {item.variant && (
                      <p className="item-variant">
                        {item.variant.title_en || item.variant.title_ar || item.variant.title}
                      </p>
                    )}
                    <div className="price-container">
                      <p className="item-price">{unitPrice.toFixed(2)} JOD</p>
                      {hasDiscount && (
                        <p className="original-price">{basePrice.toFixed(2)} JOD</p>
                      )}
                    </div>
                    {item.special_instructions && (
                      <p className="special-instructions">
                        Note: {item.special_instructions}
                      </p>
                    )}
                  </div>
                  <div className="item-quantity">
                    <button
                      onClick={() =>
                        handleQuantityChange(
                          item.id,
                          item.quantity - 1,
                          item.variant?.id
                        )
                      }
                      className="qty-btn"
                    >
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      onClick={() =>
                        handleQuantityChange(
                          item.id,
                          item.quantity + 1,
                          item.variant?.id
                        )
                      }
                      className="qty-btn"
                    >
                      +
                    </button>
                  </div>
                  <div className="item-total">
                    {itemTotal.toFixed(2)} JOD
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id, item.variant?.id)}
                    className="remove-btn"
                  >
                    <i className="fa fa-trash"></i>
                  </button>
                </div>
              );
            })}
          </div>

          <div className="cart-summary">
            <h2>Order Summary</h2>
            <div className="summary-row">
              <span>Subtotal</span>
              <span>{getCartTotal().toFixed(2)} JOD</span>
            </div>
            <div className="summary-row">
              <span>Delivery Fee</span>
              <span>Calculated at checkout</span>
            </div>
            <div className="summary-row total">
              <span>Total</span>
              <span>{getCartTotal().toFixed(2)} JOD</span>
            </div>
            <Link to="/checkout" className="checkout-btn">
              Proceed to Checkout
            </Link>
            <button onClick={clearCart} className="clear-cart-btn">
              Clear Cart
            </button>
            <Link to="/shop" className="continue-shopping">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;

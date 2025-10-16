import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { useEffect } from 'react';
import { getImageUrl } from '../services/api';
import './Cart.css';

const Cart = () => {
  const { cart, removeFromCart, updateQuantity, getCartTotal, clearCart } = useCart();
  const { t, isArabic } = useLanguage();

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

  // Resolve unit price - match mobile CartScreen logic with multi-variant support
  const resolveUnitPrice = (item) => {
    // If item has explicit unit_price, use it
    if (typeof item.unit_price === 'number' && !Number.isNaN(item.unit_price)) {
      return item.unit_price;
    }

    // Get base price from product
    let base = parseNumericValue(
      item.final_price ?? item.sale_price ?? item.base_price
    );

    // Handle multiple variants
    const variantsArray = item.variants && item.variants.length > 0 
      ? item.variants 
      : (item.variant ? [item.variant] : []);

    if (variantsArray.length > 0) {
      // Separate override and add variants
      const overrideVariants = variantsArray.filter(v => {
        const behavior = v.price_behavior || v.pricing_behavior;
        return behavior === 'override';
      });
      
      const addVariants = variantsArray.filter(v => {
        const behavior = v.price_behavior || v.pricing_behavior;
        return behavior !== 'override';
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
        base = parseNumericValue(winningOverride.price || winningOverride.price_modifier || 0);
      }
      
      // Add all "add" variants
      addVariants.forEach(variant => {
        const variantModifier = parseNumericValue(variant.price || variant.price_modifier || 0);
        base += variantModifier;
      });
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
            <h1>{t('emptyCart')}</h1>
            <p>{isArabic ? 'أضف بعض المنتجات اللذيذة للبدء!' : 'Add some delicious items to get started!'}</p>
            <Link to="/shop" className="continue-shopping-btn">
              {t('continueShopping')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Helper function to get product title
  const getProductTitle = (item) => {
    return isArabic ? (item.title_ar || item.title_en || item.name) : (item.title_en || item.title_ar || item.name);
  };

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
              
              // Generate unique key for cart item
              const variantKey = item.variants && item.variants.length > 0
                ? item.variants.map(v => v.id).sort().join('-')
                : (item.variant?.id || 'default');

              return (
                <div key={`${item.id}-${variantKey}`} className="cart-item">
                  <div className="item-image">
                    <img
                      src={getProductImage(item)}
                      alt={getProductTitle(item)}
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
                    <h3>{getProductTitle(item)}</h3>
                    {/* Display multiple variants */}
                    {item.variants && item.variants.length > 0 ? (
                      <div className="item-variants">
                        {item.variants.map((variant, idx) => (
                          <p key={idx} className="item-variant">
                            {variant.title_en || variant.title_ar || variant.title}
                          </p>
                        ))}
                      </div>
                    ) : item.variant ? (
                      <p className="item-variant">
                        {item.variant.title_en || item.variant.title_ar || item.variant.title}
                      </p>
                    ) : null}
                    <div className="price-container">
                      <p className="item-price">{unitPrice.toFixed(2)} JOD</p>
                      {hasDiscount && (
                        <p className="original-price">{basePrice.toFixed(2)} JOD</p>
                      )}
                    </div>
                    {item.special_instructions && (
                      <p className="special-instructions">
                        {t('note')}: {item.special_instructions}
                      </p>
                    )}
                  </div>
                  <div className="item-quantity">
                    <button
                      onClick={() => {
                        const variants = item.variants && item.variants.length > 0 ? item.variants : null;
                        handleQuantityChange(
                          item.id,
                          item.quantity - 1,
                          variants || item.variant?.id
                        );
                      }}
                      className="qty-btn"
                    >
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      onClick={() => {
                        const variants = item.variants && item.variants.length > 0 ? item.variants : null;
                        handleQuantityChange(
                          item.id,
                          item.quantity + 1,
                          variants || item.variant?.id
                        );
                      }}
                      className="qty-btn"
                    >
                      +
                    </button>
                  </div>
                  <div className="item-total">
                    {itemTotal.toFixed(2)} JOD
                  </div>
                  <button
                    onClick={() => {
                      const variants = item.variants && item.variants.length > 0 ? item.variants : null;
                      removeFromCart(item.id, variants || item.variant?.id);
                    }}
                    className="remove-btn"
                  >
                    <i className="fa fa-trash"></i>
                  </button>
                </div>
              );
            })}
          </div>

          <div className="cart-summary">
            <h2>{t('orderSummary')}</h2>
            <div className="summary-row">
              <span>{t('subtotal')}</span>
              <span>{getCartTotal().toFixed(2)} JOD</span>
            </div>
            <div className="summary-row">
              <span>{t('deliveryFee')}</span>
              <span>{t('calculatedAtCheckout')}</span>
            </div>
            <div className="summary-row total">
              <span>{t('total')}</span>
              <span>{getCartTotal().toFixed(2)} JOD</span>
            </div>
            <Link to="/checkout" className="checkout-btn">
              {t('proceedToCheckout')}
            </Link>
            <button onClick={clearCart} className="clear-cart-btn">
              {t('clearCart')}
            </button>
            <Link to="/shop" className="continue-shopping">
              {t('continueShopping')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;

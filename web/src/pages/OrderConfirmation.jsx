import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ordersAPI, paymentsAPI, getImageUrl } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import './OrderConfirmation.css';

const OrderConfirmation = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { t, isArabic } = useLanguage();
  const { clearCart } = useCart();
  const [order, setOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState(null);

  // Helper function to safely parse numeric values
  const safeParseFloat = (value, defaultValue = 0) => {
    if (value === null || value === undefined || value === '') {
      return defaultValue;
    }
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  };

  useEffect(() => {
    // Clear cart when order confirmation page is loaded (only once on mount)
    clearCart();
    console.log('🛒 Cart cleared on order confirmation');
  }, []); // Empty dependency array - only run once on mount

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
      checkPaymentStatus();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      // First, try to get order from API (for logged-in users)
      const response = await ordersAPI.getById(orderId);
      console.log('📦 Order response:', response.data);
      // Backend returns { success: true, data: { order, order_items, status_history } }
      const orderData = response.data.data?.order || response.data.order || response.data;
      const items = response.data.data?.order_items || response.data.order_items || [];
      console.log('📦 Order data:', orderData);
      console.log('📦 Order items:', items);
      setOrder(orderData);
      setOrderItems(items);
    } catch (err) {
      console.error('Error fetching order:', err);
      
      // If API call fails (guest user not authenticated), try localStorage
      if (err.response?.status === 401 || err.response?.status === 403) {
        console.log('🔍 Auth failed, checking localStorage for guest order...');
        const guestOrderInfo = localStorage.getItem('guestOrderInfo');
        
        if (guestOrderInfo) {
          const guestOrder = JSON.parse(guestOrderInfo);
          console.log('💾 Guest order found in localStorage:', guestOrder);
          
          // Check if this is the correct order and it's recent (within 24 hours)
          if (guestOrder.orderId == orderId && (Date.now() - guestOrder.timestamp) < 24 * 60 * 60 * 1000) {
            // Create a simplified order object for display
            setOrder({
              id: guestOrder.orderId,
              order_number: guestOrder.orderNumber,
              customer_name: guestOrder.customerName,
              customer_phone: guestOrder.customerPhone,
              customer_email: guestOrder.customerEmail,
              order_type: guestOrder.orderType,
              payment_method: guestOrder.paymentMethod,
              subtotal: guestOrder.subtotal || 0,
              delivery_fee: guestOrder.deliveryFee || 0,
              discount_amount: guestOrder.discount || 0,
              total_amount: guestOrder.total,
              created_at: new Date().toISOString(), // Use current time for guest orders
              order_status: 'pending',
              payment_status: guestOrder.paymentMethod === 'cash' ? 'pending' : 'unpaid',
              branch_name: guestOrder.branchName,
              isGuestOrder: true // Flag to indicate this is from localStorage
            });
          } else {
            console.log('⚠️ Guest order expired or wrong ID');
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    try {
      const response = await paymentsAPI.checkStatus(orderId);
      setPaymentStatus(response.data);
    } catch (err) {
      console.error('Error checking payment status:', err);
    }
  };

  const handleRetryPayment = async () => {
    try {
      setLoading(true);
      console.log('🔄 Retrying payment for order:', orderId);
      
      const response = await paymentsAPI.createSession(orderId);
      console.log('💳 Full payment session response:', response);
      console.log('💳 Response data:', response.data);
      console.log('💳 Response data success:', response.data.success);
      console.log('💳 Response data checkoutUrl:', response.data.checkoutUrl);
      console.log('💳 Response data redirectUrl:', response.data.redirectUrl);
      
      if (response.data && response.data.success) {
        // Backend returns checkoutUrl directly in response.data
        const checkoutUrl = response.data.checkoutUrl || response.data.redirectUrl;
        
        console.log('💳 Final checkoutUrl:', checkoutUrl);
        
        if (checkoutUrl) {
          console.log('✅ Redirecting to payment:', checkoutUrl);
          window.location.href = checkoutUrl;
        } else {
          console.error('❌ No checkout URL in response:', response.data);
          alert('Failed to initialize payment. No checkout URL received.');
        }
      } else {
        console.error('❌ Response not successful:', response.data);
        alert(response.data?.message || 'Failed to create payment session');
      }
    } catch (error) {
      console.error('❌ Error retrying payment:', error);
      console.error('❌ Error response:', error.response);
      alert('Failed to retry payment. Please check console for details.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="order-confirmation-page">
        <div className="container">
          <div className="loading-message">Loading order details...</div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="order-confirmation-page">
        <div className="container">
          <div className="error-message">
            <h2>{t('error')}</h2>
            <p>{t('somethingWentWrong')}</p>
            <Link to="/shop" className="btn-primary">{t('continueShopping')}</Link>
          </div>
        </div>
      </div>
    );
  }

  const getPaymentStatusDisplay = () => {
    // For cash/COD orders, show COD confirmation
    if (order?.payment_method === 'cash' || order?.payment_method === 'cod') {
      return (
        <div className="payment-status cash">
          <div className="status-icon">💵</div>
          <h3>{t('cashOnDelivery')}</h3>
          <p>{t('paymentAmount')}: <strong>{safeParseFloat(order.total_amount || order.total).toFixed(2)} {t('jod')}</strong></p>
          <p className="helper-text">
            <i className="fa fa-info-circle"></i> {t('willBeCollectedUponDelivery')}
          </p>
        </div>
      );
    }

    // Check paymentStatus from API first, then fall back to order.payment_status
    const status = paymentStatus?.status || order?.payment_status;
    
    if (status === 'CAPTURED' || status === 'AUTHORIZED' || status === 'paid') {
      return (
        <div className="payment-status success">
          <div className="status-icon">✓</div>
          <h3>{t('paymentSuccessful')}</h3>
          <p>{t('paymentProcessedSuccessfully')}</p>
          {paymentStatus?.transaction_id && (
            <div className="transaction-details">
              <div className="transaction-row">
                <span className="label">{t('transactionId')}:</span>
                <span className="value">{paymentStatus.transaction_id}</span>
              </div>
              {paymentStatus?.authorization_code && (
                <div className="transaction-row">
                  <span className="label">{t('authorizationCode')}:</span>
                  <span className="value">{paymentStatus.authorization_code}</span>
                </div>
              )}
              {paymentStatus?.card_last4 && (
                <div className="transaction-row">
                  <span className="label">{t('cardLastFour')}:</span>
                  <span className="value">**** **** **** {paymentStatus.card_last4}</span>
                </div>
              )}
              {paymentStatus?.payment_date && (
                <div className="transaction-row">
                  <span className="label">{t('paymentDate')}:</span>
                  <span className="value">
                    {new Date(paymentStatus.payment_date).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      );
    } else if (status === 'FAILED' || status === 'failed') {
      return (
        <div className="payment-status failed">
          <div className="status-icon">✗</div>
          <h3>{t('paymentFailed')}</h3>
          <p>{t('paymentCouldNotBeProcessed')}</p>
          {paymentStatus?.failure_reason && (
            <p className="failure-reason">
              <strong>{t('failureReason')}:</strong> {paymentStatus.failure_reason}
            </p>
          )}
          {order.payment_method === 'card' && (
            <button onClick={handleRetryPayment} className="retry-payment-btn">
              🔄 {t('retryPayment')}
            </button>
          )}
        </div>
      );
    } else if (status === 'PENDING' || status === 'pending') {
      return (
        <div className="payment-status pending">
          <div className="status-icon">⏳</div>
          <h3>{t('paymentPending')}</h3>
          <p>{t('processingPayment')}</p>
          <p className="helper-text">
            <i className="fa fa-info-circle"></i> {t('doNotRefresh')}
          </p>
          {order.payment_method === 'card' && (
            <button onClick={handleRetryPayment} className="retry-payment-btn">
              🔄 {t('retryPayment')}
            </button>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="order-confirmation-page">
      <div className="container">
        <div className="confirmation-card">
          <div className="success-icon">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="38" fill="#16A2A3" />
              <path d="M25 40 L35 50 L55 30" stroke="white" strokeWidth="4" fill="none" />
            </svg>
          </div>

          <h1>{t('orderSuccessful')}</h1>
          <p className="order-number">{t('orderNumber_label')} #{order.order_number || order.id}</p>

          {/* Track My Order Info for Guest Users */}
          {(order.is_guest || order.isGuestOrder) && order.customer_phone && (
            <div className="track-order-info">
              <div className="track-icon">📦</div>
              <h3>{t('trackYourOrder')}</h3>
              <p className="track-description">{t('saveTheseDetails')}</p>
              <div className="tracking-details">
                <div className="tracking-field">
                  <label>{t('orderNumber')}:</label>
                  <strong>{order.order_number || `#${order.id}`}</strong>
                </div>
                <div className="tracking-field">
                  <label>{t('phoneNumber')}:</label>
                  <strong>{order.customer_phone}</strong>
                </div>
              </div>
              <p className="track-helper">
                <i className="fa fa-info-circle"></i> {t('useTheseDetailsToCheckStatus')}
              </p>
            </div>
          )}

          {getPaymentStatusDisplay()}

          <div className="order-details">
            <h2>{t('orderDetails')}</h2>
            
            <div className="detail-row">
              <span className="label">{t('orderDate')}:</span>
              <span className="value">
                {new Date(order.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>

            <div className="detail-row">
              <span className="label">{t('orderType')}:</span>
              <span className="value">
                {order.order_type === 'delivery' ? `🚚 ${t('delivery')}` : `🏪 ${t('pickup')}`}
              </span>
            </div>

            <div className="detail-row">
              <span className="label">{t('paymentMethod')}:</span>
              <span className="value">
                {order.payment_method === 'cash' ? `💵 ${t('cashOnDelivery')}` : `💳 ${t('creditCard')}`}
              </span>
            </div>

            <div className="detail-row">
              <span className="label">{t('status')}:</span>
              <span className={`status-badge ${order.order_status || order.status}`}>
                {t((order.order_status || order.status || 'pending').toLowerCase())}
              </span>
            </div>

            {/* Branch Information */}
            {(order.branch_title_en || order.branch_title_ar || order.branch_name) && (
              <div className="detail-row">
                <span className="label">{t('branch')}:</span>
                <span className="value">
                  {isArabic ? (order.branch_title_ar || order.branch_title_en || order.branch_name) : (order.branch_title_en || order.branch_title_ar || order.branch_name)}
                </span>
              </div>
            )}

            {/* Customer Information */}
            {order.customer_name && (
              <div className="detail-row">
                <span className="label">{t('customerInfo')}:</span>
                <span className="value">{order.customer_name}</span>
              </div>
            )}

            {order.customer_phone && (
              <div className="detail-row">
                <span className="label">{t('phoneNumber')}:</span>
                <span className="value">{order.customer_phone}</span>
              </div>
            )}

            {order.customer_email && (
              <div className="detail-row">
                <span className="label">{t('email')}:</span>
                <span className="value">{order.customer_email}</span>
              </div>
            )}

            {/* Delivery Address for Delivery Orders */}
            {order.order_type === 'delivery' && (
              <>
                {order.delivery_address && typeof order.delivery_address === 'object' && (
                  <>
                    {order.delivery_address.address_line && (
                      <div className="detail-row address-row">
                        <span className="label">{t('streetAddress')}:</span>
                        <span className="value">{order.delivery_address.address_line}</span>
                      </div>
                    )}
                    {(order.delivery_address.area || order.delivery_address.area_ar) && (
                      <div className="detail-row">
                        <span className="label">{t('area')}:</span>
                        <span className="value">
                          {isArabic ? (order.delivery_address.area_ar || order.delivery_address.area) : (order.delivery_address.area || order.delivery_address.area_ar)}
                        </span>
                      </div>
                    )}
                    {(order.delivery_address.city || order.delivery_address.city_ar) && (
                      <div className="detail-row">
                        <span className="label">{t('city')}:</span>
                        <span className="value">
                          {isArabic ? (order.delivery_address.city_ar || order.delivery_address.city) : (order.delivery_address.city || order.delivery_address.city_ar)}
                        </span>
                      </div>
                    )}
                    {(order.delivery_address.governorate || order.delivery_address.governorate_ar) && (
                      <div className="detail-row">
                        <span className="label">{t('governorate')}:</span>
                        <span className="value">
                          {isArabic ? (order.delivery_address.governorate_ar || order.delivery_address.governorate) : (order.delivery_address.governorate || order.delivery_address.governorate_ar)}
                        </span>
                      </div>
                    )}
                  </>
                )}
                {order.delivery_address && typeof order.delivery_address === 'string' && (
                  <div className="detail-row address-row">
                    <span className="label">{t('deliveryAddress')}:</span>
                    <span className="value">{order.delivery_address}</span>
                  </div>
                )}
                {order.building_no && (
                  <div className="detail-row">
                    <span className="label">{t('building')}:</span>
                    <span className="value">{order.building_no}</span>
                  </div>
                )}
                {(order.floor_no || order.apartment_no) && (
                  <div className="detail-row">
                    <span className="label">{t('aptFloor')}:</span>
                    <span className="value">
                      {order.floor_no && (isArabic ? `${order.floor_no} ${t('floor')}` : `${t('floor')} ${order.floor_no}`)}
                      {order.floor_no && order.apartment_no && ', '}
                      {order.apartment_no && (isArabic ? `${order.apartment_no} ${t('apartment')}` : `${t('apartment')} ${order.apartment_no}`)}
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Promo Code Information */}
            {order.promo_code && (
              <div className="detail-row promo-row">
                <span className="label">{t('promoCode')}:</span>
                <span className="value promo-code">
                  <i className="fa fa-ticket"></i> {order.promo_code}
                </span>
              </div>
            )}
          </div>

          <div className="order-summary">
            <h2>{t('orderSummary')}</h2>
            
            <div className="summary-row">
              <span>{t('subtotal')}</span>
              <span>{safeParseFloat(order.subtotal).toFixed(2)} {t('jod')}</span>
            </div>

            {safeParseFloat(order.delivery_fee) > 0 && (
              <div className="summary-row">
                <span>{t('deliveryFee')}</span>
                <span>{safeParseFloat(order.delivery_fee).toFixed(2)} {t('jod')}</span>
              </div>
            )}

            {safeParseFloat(order.discount || order.discount_amount) > 0 && (
              <div className="summary-row discount">
                <span>{t('discount')}</span>
                <span>-{safeParseFloat(order.discount || order.discount_amount).toFixed(2)} {t('jod')}</span>
              </div>
            )}

            <div className="summary-row total">
              <span>{t('total')}</span>
              <span>{safeParseFloat(order.total_amount || order.total).toFixed(2)} {t('jod')}</span>
            </div>
          </div>

          {order.notes && (
            <div className="order-notes">
              <h3>Order Notes</h3>
              <p>{order.notes}</p>
            </div>
          )}

          {/* Order Items */}
          {orderItems && orderItems.length > 0 && (
            <div className="order-items-section">
              <h2>{t('orderItems')}</h2>
              <div className="order-items-list">
                {orderItems.map((item, index) => (
                  <div key={index} className="order-item">
                    {/* Product Image */}
                    <div className="item-image">
                      {item.product_image ? (
                        <img 
                          src={getImageUrl(item.product_image)} 
                          alt={item.product_name_en || item.product_title_en || 'Product'} 
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/assets/images/placeholder.svg';
                          }}
                        />
                      ) : (
                        <div className="placeholder-image">
                          <i className="fa fa-image"></i>
                        </div>
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="item-details">
                      <div className="item-name">
                        {isArabic 
                          ? (item.product_title_ar || item.product_name_ar || item.product_title_en || item.product_name_en || t('product'))
                          : (item.product_title_en || item.product_name_en || item.product_title_ar || item.product_name_ar || t('product'))
                        }
                      </div>
                      
                      {/* Variant Information */}
                      {(item.variant_title_en || item.variant_title_ar || item.variant_name || item.variant_value) && (
                        <div className="item-variant">
                          <i className="fa fa-tag"></i>
                          {isArabic 
                            ? (item.variant_title_ar || item.variant_title_en || `${item.variant_name || ''}: ${item.variant_value || ''}`)
                            : (item.variant_title_en || item.variant_title_ar || `${item.variant_name || ''}: ${item.variant_value || ''}`)
                          }
                        </div>
                      )}

                      {/* SKU */}
                      {item.product_sku && (
                        <div className="item-sku">
                          <span className="sku-label">{t('sku')}:</span> {item.product_sku}
                        </div>
                      )}

                      {/* Unit Price */}
                      <div className="item-unit-price">
                        {t('price')}: {safeParseFloat(item.unit_price).toFixed(2)} {t('jod')}
                      </div>
                    </div>

                    {/* Quantity and Total */}
                    <div className="item-quantity-price">
                      <div className="item-quantity">
                        <span className="quantity-label">{t('qty')}:</span>
                        <span className="quantity-value">{item.quantity}</span>
                      </div>
                      <div className="item-total-price">
                        {safeParseFloat(item.total_price).toFixed(2)} {t('jod')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="action-buttons">
            <Link to="/shop" className="btn-secondary">
              {t('continueShopping')}
            </Link>
            {/* Only show "View All Orders" for logged-in users */}
            {!order.isGuestOrder && (
              <Link to="/account" state={{ activeTab: 'orders' }} className="btn-primary">
                {t('viewAllOrders')}
              </Link>
            )}
          </div>

          <div className="confirmation-message">
            <p>
              {t('confirmationEmailSent')}
              {order.order_type === 'delivery' 
                ? ' ' + t('deliveryWillArriveSoon')
                : ' ' + t('canPickupFromBranch')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ordersAPI, paymentsAPI, getImageUrl } from '../services/api';
import './OrderConfirmation.css';

const OrderConfirmation = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
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
            <h2>Order Not Found</h2>
            <p>We couldn't find the order you're looking for.</p>
            <Link to="/shop" className="btn-primary">Continue Shopping</Link>
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
          <h3>Cash on Delivery</h3>
          <p>Please prepare the exact amount: <strong>{safeParseFloat(order.total_amount || order.total).toFixed(2)} JOD</strong></p>
          <p className="helper-text">
            <i className="fa fa-info-circle"></i> Payment will be collected upon delivery or pickup
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
          <h3>Payment Successful</h3>
          <p>Your payment has been processed successfully.</p>
          {paymentStatus?.transaction_id && (
            <div className="transaction-details">
              <div className="transaction-row">
                <span className="label">Transaction ID:</span>
                <span className="value">{paymentStatus.transaction_id}</span>
              </div>
              {paymentStatus?.authorization_code && (
                <div className="transaction-row">
                  <span className="label">Authorization Code:</span>
                  <span className="value">{paymentStatus.authorization_code}</span>
                </div>
              )}
              {paymentStatus?.card_last4 && (
                <div className="transaction-row">
                  <span className="label">Card:</span>
                  <span className="value">**** **** **** {paymentStatus.card_last4}</span>
                </div>
              )}
              {paymentStatus?.payment_date && (
                <div className="transaction-row">
                  <span className="label">Payment Date:</span>
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
          <h3>Payment Failed</h3>
          <p>Your payment could not be processed. Please try again.</p>
          {paymentStatus?.failure_reason && (
            <p className="failure-reason">
              <strong>Reason:</strong> {paymentStatus.failure_reason}
            </p>
          )}
          {order.payment_method === 'card' && (
            <button onClick={handleRetryPayment} className="retry-payment-btn">
              🔄 Retry Payment
            </button>
          )}
        </div>
      );
    } else if (status === 'PENDING' || status === 'pending') {
      return (
        <div className="payment-status pending">
          <div className="status-icon">⏳</div>
          <h3>Payment Pending</h3>
          <p>We're processing your payment. This may take a few moments.</p>
          <p className="helper-text">
            <i className="fa fa-info-circle"></i> Please do not refresh or close this page
          </p>
          {order.payment_method === 'card' && (
            <button onClick={handleRetryPayment} className="retry-payment-btn">
              🔄 Retry Payment
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

          <h1>Order Confirmed!</h1>
          <p className="order-number">Order #{order.order_number || order.id}</p>

          {/* Track My Order Info for Guest Users */}
          {(order.is_guest || order.isGuestOrder) && order.customer_phone && (
            <div className="track-order-info">
              <div className="track-icon">📦</div>
              <h3>Track Your Order</h3>
              <p className="track-description">Save these details to track your order:</p>
              <div className="tracking-details">
                <div className="tracking-field">
                  <label>Order Number:</label>
                  <strong>{order.order_number || `#${order.id}`}</strong>
                </div>
                <div className="tracking-field">
                  <label>Phone Number:</label>
                  <strong>{order.customer_phone}</strong>
                </div>
              </div>
              <p className="track-helper">
                <i className="fa fa-info-circle"></i> Use these details on our website to check your order status anytime
              </p>
            </div>
          )}

          {getPaymentStatusDisplay()}

          <div className="order-details">
            <h2>Order Details</h2>
            
            <div className="detail-row">
              <span className="label">Order Date:</span>
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
              <span className="label">Delivery Method:</span>
              <span className="value">
                {order.order_type === 'delivery' ? 'Home Delivery' : 'In-Store Pickup'}
              </span>
            </div>

            <div className="detail-row">
              <span className="label">Payment Method:</span>
              <span className="value">
                {order.payment_method === 'cash' ? 'Cash on Delivery' : 'Credit/Debit Card'}
              </span>
            </div>

            <div className="detail-row">
              <span className="label">Status:</span>
              <span className={`status-badge ${order.order_status || order.status}`}>
                {(order.order_status || order.status || 'pending').charAt(0).toUpperCase() + (order.order_status || order.status || 'pending').slice(1)}
              </span>
            </div>

            {/* Branch Information */}
            {(order.branch_title_en || order.branch_title_ar || order.branch_name) && (
              <div className="detail-row">
                <span className="label">Branch:</span>
                <span className="value">
                  {order.branch_title_en || order.branch_title_ar || order.branch_name}
                </span>
              </div>
            )}

            {/* Customer Information */}
            {order.customer_name && (
              <div className="detail-row">
                <span className="label">Customer Name:</span>
                <span className="value">{order.customer_name}</span>
              </div>
            )}

            {order.customer_phone && (
              <div className="detail-row">
                <span className="label">Phone:</span>
                <span className="value">{order.customer_phone}</span>
              </div>
            )}

            {order.customer_email && (
              <div className="detail-row">
                <span className="label">Email:</span>
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
                        <span className="label">Street Address:</span>
                        <span className="value">{order.delivery_address.address_line}</span>
                      </div>
                    )}
                    {(order.delivery_address.area || order.delivery_address.area_ar) && (
                      <div className="detail-row">
                        <span className="label">Area:</span>
                        <span className="value">
                          {order.delivery_address.area || order.delivery_address.area_ar}
                        </span>
                      </div>
                    )}
                    {(order.delivery_address.city || order.delivery_address.city_ar) && (
                      <div className="detail-row">
                        <span className="label">City:</span>
                        <span className="value">
                          {order.delivery_address.city || order.delivery_address.city_ar}
                        </span>
                      </div>
                    )}
                    {(order.delivery_address.governorate || order.delivery_address.governorate_ar) && (
                      <div className="detail-row">
                        <span className="label">Governorate:</span>
                        <span className="value">
                          {order.delivery_address.governorate || order.delivery_address.governorate_ar}
                        </span>
                      </div>
                    )}
                  </>
                )}
                {order.delivery_address && typeof order.delivery_address === 'string' && (
                  <div className="detail-row address-row">
                    <span className="label">Delivery Address:</span>
                    <span className="value">{order.delivery_address}</span>
                  </div>
                )}
                {order.delivery_city && (
                  <div className="detail-row">
                    <span className="label">City:</span>
                    <span className="value">{order.delivery_city}</span>
                  </div>
                )}
                {order.building_no && (
                  <div className="detail-row">
                    <span className="label">Building:</span>
                    <span className="value">{order.building_no}</span>
                  </div>
                )}
                {(order.floor_no || order.apartment_no) && (
                  <div className="detail-row">
                    <span className="label">Apt/Floor:</span>
                    <span className="value">
                      {order.floor_no && `Floor ${order.floor_no}`}
                      {order.floor_no && order.apartment_no && ', '}
                      {order.apartment_no && `Apt ${order.apartment_no}`}
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Promo Code Information */}
            {order.promo_code && (
              <div className="detail-row promo-row">
                <span className="label">Promo Code:</span>
                <span className="value promo-code">
                  <i className="fa fa-ticket"></i> {order.promo_code}
                </span>
              </div>
            )}
          </div>

          <div className="order-summary">
            <h2>Order Summary</h2>
            
            <div className="summary-row">
              <span>Subtotal</span>
              <span>{safeParseFloat(order.subtotal).toFixed(2)} JOD</span>
            </div>

            {safeParseFloat(order.delivery_fee) > 0 && (
              <div className="summary-row">
                <span>Delivery Fee</span>
                <span>{safeParseFloat(order.delivery_fee).toFixed(2)} JOD</span>
              </div>
            )}

            {safeParseFloat(order.discount || order.discount_amount) > 0 && (
              <div className="summary-row discount">
                <span>Discount</span>
                <span>-{safeParseFloat(order.discount || order.discount_amount).toFixed(2)} JOD</span>
              </div>
            )}

            <div className="summary-row total">
              <span>Total</span>
              <span>{safeParseFloat(order.total_amount || order.total).toFixed(2)} JOD</span>
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
              <h2>Order Items</h2>
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
                        {item.product_title_en || item.product_name_en || item.product_title_ar || item.product_name_ar || 'Product'}
                      </div>
                      
                      {/* Variant Information */}
                      {(item.variant_title_en || item.variant_title_ar || item.variant_name || item.variant_value) && (
                        <div className="item-variant">
                          <i className="fa fa-tag"></i>
                          {item.variant_title_en || item.variant_title_ar || `${item.variant_name || ''}: ${item.variant_value || ''}`}
                        </div>
                      )}

                      {/* SKU */}
                      {item.product_sku && (
                        <div className="item-sku">
                          <span className="sku-label">SKU:</span> {item.product_sku}
                        </div>
                      )}

                      {/* Unit Price */}
                      <div className="item-unit-price">
                        Price: {safeParseFloat(item.unit_price).toFixed(2)} JOD
                      </div>
                    </div>

                    {/* Quantity and Total */}
                    <div className="item-quantity-price">
                      <div className="item-quantity">
                        <span className="quantity-label">Qty:</span>
                        <span className="quantity-value">{item.quantity}</span>
                      </div>
                      <div className="item-total-price">
                        {safeParseFloat(item.total_price).toFixed(2)} JOD
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="action-buttons">
            <Link to="/shop" className="btn-secondary">
              Continue Shopping
            </Link>
            {/* Only show "View All Orders" for logged-in users */}
            {!order.isGuestOrder && (
              <Link to="/account" state={{ activeTab: 'orders' }} className="btn-primary">
                View All Orders
              </Link>
            )}
          </div>

          <div className="confirmation-message">
            <p>
              Thank you for your order! We've sent a confirmation email with your order details.
              {order.order_type === 'delivery' 
                ? ' Your order will be delivered to your address soon.'
                : ' You can pick up your order from the selected branch.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;

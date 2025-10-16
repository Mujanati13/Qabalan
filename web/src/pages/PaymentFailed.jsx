import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ordersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './PaymentFailed.css';

const PaymentFailed = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const orderId = searchParams.get('orderId') || searchParams.get('orders_id');

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    } else {
      setLoading(false);
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const response = await ordersAPI.getById(orderId);
      const orderData = response.data.data?.order || response.data.order || response.data;
      setOrder(orderData);
    } catch (err) {
      console.error('Error fetching order:', err);
      // If order fetch fails, try to get from localStorage for guest users
      const guestOrderInfo = localStorage.getItem('guestOrderInfo');
      if (guestOrderInfo) {
        const guestOrder = JSON.parse(guestOrderInfo);
        if (guestOrder.orderId == orderId) {
          setOrder({
            id: guestOrder.orderId,
            order_number: guestOrder.orderNumber,
            total_amount: guestOrder.total,
            payment_method: guestOrder.paymentMethod,
            isGuestOrder: true
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetryPayment = async () => {
    try {
      setLoading(true);
      const response = await ordersAPI.retryPayment(orderId);
      
      if (response.data.success && response.data.checkoutUrl) {
        window.location.href = response.data.checkoutUrl;
      } else {
        alert('Failed to initialize payment. Please contact support.');
      }
    } catch (error) {
      console.error('Error retrying payment:', error);
      alert('Failed to retry payment. Please contact support.');
      setLoading(false);
    }
  };

  const handleContactSupport = () => {
    navigate('/contact', { 
      state: { 
        orderId: orderId,
        subject: `Payment Failed for Order #${order?.order_number || orderId}` 
      } 
    });
  };

  const handleViewOrder = () => {
    if (user) {
      navigate('/account', { state: { activeTab: 'orders' } });
    } else {
      navigate(`/order-confirmation/${orderId}`);
    }
  };

  if (loading) {
    return (
      <div className="payment-failed-page">
        <div className="container">
          <div className="loading-message">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-failed-page">
      <div className="container">
        <div className="payment-failed-card">
          <div className="error-icon">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="38" fill="#dc2626" />
              <path d="M25 25 L55 55 M55 25 L25 55" stroke="white" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </div>

          <h1>Payment Failed</h1>
          
          {order && (
            <p className="order-number">Order #{order.order_number || order.id}</p>
          )}

          <div className="message-box">
            <div className="message-icon">ℹ️</div>
            <div className="message-content">
              <h3>Don't Worry - Your Order is Safe!</h3>
              <p>
                Your order has been successfully placed and saved in our system. 
                However, the payment could not be completed at this time.
              </p>
              <p>
                <strong>Your cart and order details have NOT been lost.</strong>
              </p>
            </div>
          </div>

          <div className="options-section">
            <h2>What would you like to do?</h2>
            
            <div className="option-cards">
              {/* Option 1: Retry Payment */}
              <div className="option-card">
                <div className="option-icon">💳</div>
                <h3>Retry Payment</h3>
                <p>Try paying for your order again with the same or different card</p>
                <button onClick={handleRetryPayment} className="btn-primary" disabled={loading}>
                  {loading ? 'Processing...' : '🔄 Retry Payment Now'}
                </button>
              </div>

              {/* Option 2: View Order Details */}
              <div className="option-card">
                <div className="option-icon">📦</div>
                <h3>View Order Details</h3>
                <p>Check your order details and payment status in your account</p>
                <button onClick={handleViewOrder} className="btn-secondary">
                  📋 View My Order
                </button>
              </div>

              {/* Option 3: Contact Support */}
              <div className="option-card">
                <div className="option-icon">💬</div>
                <h3>Contact Support</h3>
                <p>Our team will send you a secure payment link or help you complete the order</p>
                <button onClick={handleContactSupport} className="btn-secondary">
                  📞 Contact Support
                </button>
              </div>

              {/* Option 4: Change Payment Method */}
              {user && (
                <div className="option-card">
                  <div className="option-icon">🔄</div>
                  <h3>Change Payment Method</h3>
                  <p>Switch to Cash on Delivery or update your payment details</p>
                  <button onClick={handleContactSupport} className="btn-secondary">
                    💰 Change to Cash on Delivery
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="info-section">
            <h3>Important Information</h3>
            <ul>
              <li>✅ Your order has been recorded with order number: <strong>#{order?.order_number || orderId}</strong></li>
              <li>✅ Your items are reserved and waiting for payment confirmation</li>
              <li>✅ You can pay anytime from your account or when support contacts you</li>
              <li>⏰ Orders are held for 24 hours before automatic cancellation</li>
              <li>📧 You'll receive email/SMS updates about your order status</li>
            </ul>
          </div>

          <div className="action-buttons">
            <Link to="/shop" className="btn-outline">
              Continue Shopping
            </Link>
            <Link to="/" className="btn-outline">
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailed;

import React, { useState, useEffect } from 'react';

const PaymentPage = ({ orderId, lang = 'en' }) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/payments/mpgs/order/${orderId}`);
      const data = await response.json();
      
      if (response.ok) {
        setOrder(data.order);
      } else {
        setError(data.error || 'Failed to fetch order');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const initiatePayment = () => {
    setPaymentLoading(true);
    
    // Redirect to the payment view (equivalent to your PHP approach)
    const paymentUrl = `/api/payments/mpgs/payment/view?orders_id=${orderId}&lang=${lang}`;
    window.location.href = paymentUrl;
  };

  if (loading) {
    return (
      <div className="payment-container">
        <div className="loading">Loading order details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="payment-container">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="payment-container">
        <div className="error">Order not found</div>
      </div>
    );
  }

  return (
    <div className="payment-container">
      <div className="payment-card">
        <h2>{lang === 'ar' ? 'ملخص الطلب' : 'Order Summary'}</h2>
        
        <div className="order-details">
          <div className="detail-row">
            <span className="label">
              {lang === 'ar' ? 'رقم الطلب:' : 'Order ID:'}
            </span>
            <span className="value">#{order.id}</span>
          </div>
          
          <div className="detail-row">
            <span className="label">
              {lang === 'ar' ? 'المبلغ:' : 'Amount:'}
            </span>
            <span className="value amount">
              {order.total_amount} {order.currency || 'JOD'}
            </span>
          </div>
          
          <div className="detail-row">
            <span className="label">
              {lang === 'ar' ? 'الحالة:' : 'Status:'}
            </span>
            <span className={`value status ${order.payment_status || 'pending'}`}>
              {order.payment_status === 'completed' 
                ? (lang === 'ar' ? 'مكتمل' : 'Completed')
                : (lang === 'ar' ? 'معلق' : 'Pending')
              }
            </span>
          </div>
        </div>

        {order.payment_status !== 'completed' && (
          <div className="payment-actions">
            <button 
              className="pay-button"
              onClick={initiatePayment}
              disabled={paymentLoading}
            >
              {paymentLoading 
                ? (lang === 'ar' ? 'جاري المعالجة...' : 'Processing...')
                : (lang === 'ar' ? 'ادفع الآن' : 'Pay Now')
              }
            </button>
            
            <div className="payment-methods">
              <img src="/images/visa.png" alt="Visa" className="payment-method-logo" />
              <img src="/images/mastercard.png" alt="Mastercard" className="payment-method-logo" />
              <span className="secure-text">
                {lang === 'ar' ? 'دفع آمن بواسطة Mastercard' : 'Secure payment by Mastercard'}
              </span>
            </div>
          </div>
        )}

        {order.payment_status === 'completed' && (
          <div className="success-message">
            <div className="success-icon">✅</div>
            <p>{lang === 'ar' ? 'تم الدفع بنجاح!' : 'Payment completed successfully!'}</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .payment-container {
          max-width: 500px;
          margin: 50px auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          direction: ${lang === 'ar' ? 'rtl' : 'ltr'};
        }

        .payment-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          padding: 30px;
          border: 1px solid #e1e5e9;
        }

        h2 {
          color: #1a1a1a;
          margin-bottom: 25px;
          font-size: 24px;
          text-align: center;
        }

        .order-details {
          margin-bottom: 30px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          padding: 10px 0;
          border-bottom: 1px solid #f0f0f0;
        }

        .detail-row:last-child {
          border-bottom: none;
        }

        .label {
          font-weight: 600;
          color: #666;
        }

        .value {
          font-weight: 500;
          color: #1a1a1a;
        }

        .value.amount {
          font-size: 18px;
          font-weight: 700;
          color: #1677ff;
        }

        .value.status.completed {
          color: #52c41a;
        }

        .value.status.pending {
          color: #faad14;
        }

        .payment-actions {
          text-align: center;
        }

        .pay-button {
          background: linear-gradient(135deg, #1677ff 0%, #0f5ec5 100%);
          color: white;
          border: none;
          padding: 15px 40px;
          font-size: 16px;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          width: 100%;
          margin-bottom: 20px;
        }

        .pay-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(22, 119, 255, 0.3);
        }

        .pay-button:disabled {
          background: #d9d9d9;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .payment-methods {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .payment-method-logo {
          height: 24px;
          opacity: 0.8;
        }

        .secure-text {
          font-size: 12px;
          color: #666;
          margin-left: 10px;
        }

        .success-message {
          text-align: center;
          padding: 20px;
          background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%);
          border-radius: 8px;
          border: 1px solid #b7eb8f;
        }

        .success-icon {
          font-size: 48px;
          margin-bottom: 10px;
        }

        .success-message p {
          color: #389e0d;
          font-weight: 600;
          margin: 0;
        }

        .loading, .error {
          text-align: center;
          padding: 40px 20px;
          font-size: 16px;
        }

        .error {
          color: #ff4d4f;
          background: #fff2f0;
          border: 1px solid #ffccc7;
          border-radius: 8px;
        }

        .loading {
          color: #666;
        }
      `}</style>
    </div>
  );
};

export default PaymentPage;

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, Result, Button, Spin, Alert } from 'antd';
import { CreditCardOutlined, LoadingOutlined } from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';

const PaymentCheckout = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const sessionId = searchParams.get('sessionId');
  const orderId = searchParams.get('orderId');
  const amount = searchParams.get('amount');

  useEffect(() => {
    if (!sessionId || !orderId) {
      setError('Missing payment session information');
      setLoading(false);
      return;
    }

    // Load MPGS checkout.js dynamically
    const loadMPGSCheckout = async () => {
      try {
        const gatewayBase = import.meta.env.VITE_MPGS_GATEWAY_BASE || 'https://test-network.mtf.gateway.mastercard.com';
        const checkoutJsUrl = `${gatewayBase}/static/checkout/checkout.js`;
        
        // Create script element
        const script = document.createElement('script');
        script.src = checkoutJsUrl;
        script.async = true;
        
        script.onload = () => {
          // Configure checkout
          if (window.Checkout) {
            window.Checkout.configure({
              session: {
                id: sessionId
              },
              interaction: {
                operation: 'PURCHASE',
                merchant: {
                  name: 'FECS Store',
                  logo: '/logo.png' // Optional logo
                }
              }
            });

            // Start checkout
            window.Checkout.showLightbox();
            setLoading(false);
          } else {
            setError('Failed to initialize payment checkout');
            setLoading(false);
          }
        };

        script.onerror = () => {
          setError('Failed to load payment gateway');
          setLoading(false);
        };

        document.head.appendChild(script);

        // Cleanup
        return () => {
          if (document.head.contains(script)) {
            document.head.removeChild(script);
          }
        };
      } catch (err) {
        console.error('Checkout loading error:', err);
        setError('Failed to initialize payment');
        setLoading(false);
      }
    };

    loadMPGSCheckout();
  }, [sessionId, orderId]);

  const handleReturnToOrders = () => {
    navigate('/orders');
  };

  if (error) {
    return (
      <div style={{ 
        minHeight: '60vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '20px'
      }}>
        <Card style={{ maxWidth: 500, width: '100%' }}>
          <Result
            status="error"
            title="Payment Error"
            subTitle={error}
            extra={[
              <Button 
                type="primary" 
                key="return" 
                onClick={handleReturnToOrders}
              >
                {t('orders.return_to_orders')}
              </Button>
            ]}
          />
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ 
        minHeight: '60vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column'
      }}>
        <Spin 
          size="large" 
          indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />}
        />
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <h2 style={{ marginBottom: 8 }}>Preparing Payment</h2>
          <p style={{ color: '#666', fontSize: '16px' }}>
            Loading secure payment gateway...
          </p>
          {orderId && (
            <div style={{ 
              marginTop: 16, 
              padding: 16, 
              backgroundColor: '#f5f5f5', 
              borderRadius: 8,
              display: 'inline-block'
            }}>
              <div style={{ fontSize: '14px', color: '#666' }}>Order #{orderId}</div>
              {amount && <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{amount} JOD</div>}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '60vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '20px'
    }}>
      <Card style={{ maxWidth: 500, width: '100%', textAlign: 'center' }}>
        <div style={{ marginBottom: 24 }}>
          <CreditCardOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
          <h2>Secure Payment</h2>
          <p style={{ color: '#666' }}>
            Complete your payment securely through our payment gateway
          </p>
        </div>

        {orderId && (
          <Alert
            message={`Order #${orderId}`}
            description={amount ? `Amount: ${amount} JOD` : ''}
            type="info"
            style={{ marginBottom: 24 }}
          />
        )}

        <Button 
          type="default" 
          onClick={handleReturnToOrders}
          style={{ marginTop: 16 }}
        >
          {t('orders.return_to_orders')}
        </Button>
      </Card>
    </div>
  );
};

export default PaymentCheckout;

import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Spin, Result, Button, message } from 'antd';
import { useLanguage } from '../contexts/LanguageContext';

const MPGSCheckout = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checkoutLoaded, setCheckoutLoaded] = useState(false);
  
  // Get data from URL parameters or location state
  const sessionId = searchParams.get('sessionId') || location.state?.sessionId;
  const orderId = searchParams.get('orderId') || location.state?.orderId;
  const amount = searchParams.get('amount') || location.state?.amount;
  const currency = searchParams.get('currency') || location.state?.currency || 'JOD';

  useEffect(() => {
    if (!sessionId || !orderId) {
      setError('Missing payment session information');
      setLoading(false);
      return;
    }

    // Load MPGS hosted checkout script
    const loadCheckoutScript = () => {
      // Remove any existing script
      const existingScript = document.querySelector('script[src*="checkout.js"]');
      if (existingScript) {
        existingScript.remove();
      }

      // Try multiple script URLs as fallback
      const scriptUrls = [
        'https://test-gateway.mastercard.com/checkout/version/latest/checkout.js',
        'https://test-gateway.mastercard.com/hosted/js/checkout.js',
        'https://test-network.mtf.gateway.mastercard.com/checkout/version/latest/checkout.js',
        'https://test-network.mtf.gateway.mastercard.com/checkout/version/68/checkout.js'
      ];

      let currentUrlIndex = 0;

      const tryLoadScript = (urlIndex) => {
        if (urlIndex >= scriptUrls.length) {
          console.error('❌ All script URLs failed to load');
          setError('Unable to load payment system. Please try again later.');
          setLoading(false);
          return;
        }

        const scriptUrl = scriptUrls[urlIndex];
        console.log(`🔄 Trying to load script from: ${scriptUrl}`);

        const script = document.createElement('script');
        script.src = scriptUrl;
        
        script.onload = () => {
          console.log(`✅ MPGS checkout script loaded successfully from: ${scriptUrl}`);
          
          // Wait a moment for the script to initialize
          setTimeout(() => {
            if (window.Checkout || window.checkout) {
              initializeCheckout();
            } else {
              console.warn('⚠️ Script loaded but checkout object not available, trying next URL...');
              tryLoadScript(urlIndex + 1);
            }
          }, 500);
        };
        
        script.onerror = (error) => {
          console.error(`❌ Failed to load script from: ${scriptUrl}`, error);
          // Try next URL
          tryLoadScript(urlIndex + 1);
        };
        
        document.head.appendChild(script);
      };

      tryLoadScript(0);
    };

    const initializeCheckout = () => {
      try {
        // MPGS uses different object names in different versions
        const checkoutObj = window.Checkout || window.checkout;
        console.log('window.Checkout available:', !!window.Checkout);
        console.log('window.checkout available:', !!window.checkout);
        console.log('Using checkout object:', !!checkoutObj);
        
        if (checkoutObj) {
          console.log('Checkout object methods:', Object.getOwnPropertyNames(checkoutObj));
          console.log('Configuring checkout with session:', sessionId);
          
          const config = {
            session: {
              id: sessionId
            },
            interaction: {
              merchant: {
                name: 'Qabalan E-commerce'
              },
              displayControl: {
                billingAddress: 'OPTIONAL',
                customerEmail: 'OPTIONAL',
                orderSummary: 'SHOW',
                shipping: 'HIDE'
              }
            }
          };
          
          console.log('Checkout config:', config);
          
          // Try different configuration methods
          if (typeof checkoutObj.configure === 'function') {
            console.log('Using configure method...');
            checkoutObj.configure(config);
          } else if (typeof checkoutObj.showLightbox === 'function') {
            console.log('Using direct showLightbox method...');
            // Some versions don't need configuration, just direct usage
          } else if (typeof checkoutObj.showPaymentPage === 'function') {
            console.log('Using direct showPaymentPage method...');
            // Some versions don't need configuration, just direct usage
          } else {
            console.log('Available methods:', Object.getOwnPropertyNames(checkoutObj));
            throw new Error('No known configuration or display method found');
          }
          
          // Store the checkout object reference for later use
          window.activeCheckout = checkoutObj;
          window.checkoutConfig = config;
          
          setCheckoutLoaded(true);
          setLoading(false);
          console.log('✅ Checkout initialized successfully');
        } else {
          throw new Error('Neither window.Checkout nor window.checkout is available');
        }
      } catch (error) {
        console.error('❌ Checkout initialization error:', error);
        setError('Failed to initialize payment checkout: ' + error.message);
        setLoading(false);
      }
    };

    loadCheckoutScript();

    // Cleanup function
    return () => {
      const script = document.querySelector('script[src*="checkout.js"]');
      if (script) {
        script.remove();
      }
    };
  }, [sessionId, orderId, amount, currency]);

  const handlePayment = () => {
    console.log('🔵 Pay Now button clicked');
    console.log('Session ID:', sessionId);
    console.log('Checkout loaded:', checkoutLoaded);
    
    const checkoutObj = window.activeCheckout || window.Checkout || window.checkout;
    console.log('Available checkout object:', !!checkoutObj);
    
    if (!checkoutObj || !checkoutLoaded) {
      console.error('❌ Payment system not ready');
      message.error('Payment system not ready');
      return;
    }

    try {
      console.log('🎯 Attempting to show payment interface...');
      console.log('Available methods:', Object.getOwnPropertyNames(checkoutObj));
      
      // Method 1: Try showLightbox with session ID
      if (typeof checkoutObj.showLightbox === 'function') {
        console.log('Trying showLightbox method...');
        checkoutObj.showLightbox();
        
      // Method 2: Try showPaymentPage
      } else if (typeof checkoutObj.showPaymentPage === 'function') {
        console.log('Trying showPaymentPage method...');
        checkoutObj.showPaymentPage();
        
      // Method 3: Try show method
      } else if (typeof checkoutObj.show === 'function') {
        console.log('Trying show method...');
        checkoutObj.show();
        
      // Method 4: Try showForm method
      } else if (typeof checkoutObj.showForm === 'function') {
        console.log('Trying showForm method...');
        checkoutObj.showForm();
        
      // Method 5: Try direct configuration and show
      } else if (typeof checkoutObj.configure === 'function') {
        console.log('Trying configure then show...');
        const config = window.checkoutConfig || {
          session: { id: sessionId }
        };
        checkoutObj.configure(config);
        
        // Try to show after configuration
        if (typeof checkoutObj.showLightbox === 'function') {
          checkoutObj.showLightbox();
        } else if (typeof checkoutObj.show === 'function') {
          checkoutObj.show();
        }
        
      } else {
        // If no known methods, try to open the MPGS URL directly
        console.log('No known methods found, trying direct URL...');
        const mpgsUrl = `https://test-gateway.mastercard.com/checkout/entry?session.id=${sessionId}`;
        window.open(mpgsUrl, '_blank', 'width=800,height=600');
      }
      
      console.log('✅ Payment interface initiated');
      
    } catch (error) {
      console.error('❌ Payment error:', error);
      message.error('Failed to open payment form: ' + error.message);
    }
  };

  const handleCancel = () => {
    navigate('/orders');
  };

  if (error) {
    return (
      <div className="payment-checkout-container" style={{ maxWidth: 600, margin: '50px auto', padding: '20px' }}>
        <Card>
          <Result
            status="error"
            title={t('payment.error.title')}
            subTitle={error}
            extra={[
              <Button key="back" onClick={handleCancel}>
                {t('common.back')}
              </Button>
            ]}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="payment-checkout-container" style={{ maxWidth: 600, margin: '50px auto', padding: '20px' }}>
      <Card title={t('payment.checkout.title')}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
            <p style={{ marginTop: '16px' }}>Loading secure payment system...</p>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h3>{t('payment.checkout.orderSummary')}</h3>
              <p><strong>{t('orders.orderId')}:</strong> {orderId}</p>
              <p><strong>{t('orders.amount')}:</strong> {amount} {currency}</p>
              <p><strong>Session ID:</strong> {sessionId}</p>
              <p><strong>Status:</strong> {checkoutLoaded ? '✅ Ready' : '⏳ Loading...'}</p>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <Button 
                type="primary" 
                size="large" 
                onClick={handlePayment}
                disabled={!checkoutLoaded}
                style={{ marginRight: '12px' }}
              >
                {t('payment.checkout.payNow')}
              </Button>
              <Button 
                size="large" 
                onClick={handleCancel}
              >
                {t('common.cancel')}
              </Button>
            </div>
            
            {checkoutLoaded && (
              <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '6px' }}>
                <p style={{ margin: 0, color: '#389e0d' }}>
                  ✅ Payment system loaded successfully. Click "Pay Now" to proceed with secure payment.
                </p>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default MPGSCheckout;

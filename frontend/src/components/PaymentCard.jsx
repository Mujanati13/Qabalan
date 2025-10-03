import React, { useState, useEffect } from 'react';

const PaymentCard = ({ orderId, amount, currency = 'JOD', onPaymentSuccess, onPaymentError }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [authenticationToken, setAuthenticationToken] = useState(null);
  const [showThreeDS, setShowThreeDS] = useState(false);
  const [threeDSHtml, setThreeDSHtml] = useState('');
  
  // Card form state
  const [cardData, setCardData] = useState({
    number: '4000000000001000', // Test card
    securityCode: '123',
    expiryMonth: '01',
    expiryYear: '29',
    nameOnCard: 'John Doe'
  });

  const showStatus = (message, type = 'info') => {
    setStatus(prev => [...prev, { message, type, id: Date.now() }]);
    setTimeout(() => {
      setStatus(prev => prev.filter(s => s.id !== Date.now()));
    }, 10000);
  };

  const getBrowserData = () => ({
    userAgent: navigator.userAgent,
    acceptHeader: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    language: navigator.language,
    javaEnabled: navigator.javaEnabled ? navigator.javaEnabled() : false,
    colorDepth: screen.colorDepth,
    screenWidth: screen.width,
    screenHeight: screen.height,
    timezoneOffsetMinutes: new Date().getTimezoneOffset()
  });

  const createSession = async () => {
    try {
      const response = await fetch('/api/payments/mpgs/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, amount, currency })
      });

      if (!response.ok) {
        throw new Error(`Session creation failed: ${response.statusText}`);
      }

      const data = await response.json();
      setCurrentSession(data);
      showStatus('Session created successfully', 'success');
      return data;
    } catch (error) {
      showStatus(`Session creation failed: ${error.message}`, 'error');
      throw error;
    }
  };

  const updateSession = () => {
    if (!currentSession || !window.Session) return Promise.reject(new Error('Session not ready'));

    return new Promise((resolve, reject) => {
      window.Session.configure({
        session: currentSession.sessionId,
        fields: {
          card: {
            number: '#card-number',
            securityCode: '#security-code',
            expiryMonth: '#expiry-month',
            expiryYear: '#expiry-year',
            nameOnCard: '#cardholder-name'
          }
        },
        frameEmbeddingMitigation: ['javascript'],
        callbacks: {
          initialized: (response) => {
            console.log('Session initialized:', response);
          },
          formSessionUpdate: (response) => {
            console.log('Session updated:', response);
            if (response.status === 'ok') {
              resolve(response);
            } else {
              reject(new Error(`Session update failed: ${response.errors?.join(', ')}`));
            }
          }
        }
      });
    });
  };

  const initiateAuthentication = async () => {
    try {
      const browserData = getBrowserData();
      
      const response = await fetch('/api/payments/3ds/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: currentSession.orderId,
          amount: currentSession.amount,
          currency: currentSession.currency,
          sessionId: currentSession.sessionId,
          browserData
        })
      });

      if (!response.ok) {
        throw new Error(`Authentication initiation failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.redirectHtml) {
        // Show 3DS challenge
        setShowThreeDS(true);
        setThreeDSHtml(data.redirectHtml);
        setAuthenticationToken(data.authenticationToken);
        showStatus('3D Secure challenge required', 'info');
      } else {
        // Frictionless authentication
        setAuthenticationToken(data.authenticationToken);
        await completeAuthentication(data.authenticationToken);
      }
    } catch (error) {
      showStatus(`Authentication failed: ${error.message}`, 'error');
      onPaymentError?.(error);
    }
  };

  const completeAuthentication = async (token = authenticationToken) => {
    if (!token) {
      showStatus('No authentication token available', 'error');
      return;
    }

    try {
      const response = await fetch('/api/payments/3ds/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: currentSession.orderId,
          authenticationToken: token
        })
      });

      if (!response.ok) {
        throw new Error(`Authentication completion failed: ${response.statusText}`);
      }

      const data = await response.json();
      showStatus(`Authentication status: ${data.status}`, 'success');
      
      // Hide 3DS container
      setShowThreeDS(false);
      
      // Proceed with payment
      await processPayment();
    } catch (error) {
      showStatus(`Authentication completion failed: ${error.message}`, 'error');
      onPaymentError?.(error);
    }
  };

  const processPayment = async () => {
    try {
      const response = await fetch('/api/payments/mpgs/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: currentSession.orderId,
          sessionId: currentSession.sessionId
        })
      });

      if (!response.ok) {
        throw new Error(`Payment failed: ${response.statusText}`);
      }

      const data = await response.json();
      const success = data.result === 'SUCCESS';
      showStatus(`Payment ${data.result}: ${data.authorizationCode || 'No auth code'}`, 
        success ? 'success' : 'error');
      
      if (success) {
        onPaymentSuccess?.(data);
      } else {
        onPaymentError?.(new Error(`Payment failed: ${data.result}`));
      }
    } catch (error) {
      showStatus(`Payment failed: ${error.message}`, 'error');
      onPaymentError?.(error);
    }
  };

  const handlePayment = async () => {
    setLoading(true);
    
    try {
      // Step 1: Create session
      await createSession();
      
      // Step 2: Update session with card data
      await updateSession();
      showStatus('Card data validated', 'success');
      
      // Step 3: Initiate 3DS authentication
      await initiateAuthentication();
      
    } catch (error) {
      showStatus(`Payment failed: ${error.message}`, 'error');
      onPaymentError?.(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardChange = (field, value) => {
    setCardData(prev => ({ ...prev, [field]: value }));
  };

  // Load MPGS session.js script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = `${process.env.REACT_APP_API_URL || ''}/api/page/version/73/session.js`;
    script.async = true;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return (
    <div className="payment-card">
      <style jsx>{`
        .payment-card {
          max-width: 600px;
          margin: 0 auto;
          font-family: Arial, sans-serif;
        }
        .card-form {
          background: #f9f9f9;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .form-group {
          margin-bottom: 15px;
        }
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
        }
        .form-group input,
        .form-group select {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        .pay-button {
          background: #007bff;
          color: white;
          padding: 12px 24px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          width: 100%;
        }
        .pay-button:hover {
          background: #0056b3;
        }
        .pay-button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        .status {
          padding: 10px;
          margin: 10px 0;
          border-radius: 4px;
        }
        .status.success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        .status.error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
        .status.info {
          background: #d1ecf1;
          color: #0c5460;
          border: 1px solid #bee5eb;
        }
        .threeds-container {
          margin: 20px 0;
          border: 1px solid #ddd;
          border-radius: 4px;
          overflow: hidden;
        }
        .threeds-frame {
          width: 100%;
          height: 400px;
          border: none;
        }
        .threeds-header {
          background: #f8f9fa;
          padding: 15px;
          border-bottom: 1px solid #ddd;
        }
        .complete-auth-button {
          background: #28a745;
          color: white;
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          margin: 15px;
        }
      `}</style>

      <h2>Card Payment</h2>

      {/* Status Messages */}
      <div className="status-messages">
        {status.map(s => (
          <div key={s.id} className={`status ${s.type}`}>
            {s.message}
          </div>
        ))}
      </div>

      {/* Order Information */}
      <div className="card-form">
        <h3>Order Information</h3>
        <div className="form-group">
          <label>Order ID:</label>
          <input type="text" value={orderId} readOnly />
        </div>
        <div className="form-group">
          <label>Amount:</label>
          <input type="text" value={`${amount} ${currency}`} readOnly />
        </div>
      </div>

      {/* Card Information */}
      <div className="card-form">
        <h3>Card Information</h3>
        <div className="form-group">
          <label>Card Number:</label>
          <input
            type="text"
            id="card-number"
            value={cardData.number}
            onChange={(e) => handleCardChange('number', e.target.value)}
            placeholder="4000000000001000"
            maxLength="19"
          />
        </div>
        
        <div style={{ display: 'flex', gap: '15px' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Expiry Month:</label>
            <select
              id="expiry-month"
              value={cardData.expiryMonth}
              onChange={(e) => handleCardChange('expiryMonth', e.target.value)}
            >
              <option value="">Month</option>
              {Array.from({ length: 12 }, (_, i) => {
                const month = String(i + 1).padStart(2, '0');
                return <option key={month} value={month}>{month}</option>;
              })}
            </select>
          </div>
          
          <div className="form-group" style={{ flex: 1 }}>
            <label>Expiry Year:</label>
            <select
              id="expiry-year"
              value={cardData.expiryYear}
              onChange={(e) => handleCardChange('expiryYear', e.target.value)}
            >
              <option value="">Year</option>
              {Array.from({ length: 10 }, (_, i) => {
                const year = String(new Date().getFullYear() + i).slice(-2);
                return <option key={year} value={year}>20{year}</option>;
              })}
            </select>
          </div>
          
          <div className="form-group" style={{ flex: 1 }}>
            <label>CVV:</label>
            <input
              type="text"
              id="security-code"
              value={cardData.securityCode}
              onChange={(e) => handleCardChange('securityCode', e.target.value)}
              placeholder="123"
              maxLength="4"
            />
          </div>
        </div>
        
        <div className="form-group">
          <label>Cardholder Name:</label>
          <input
            type="text"
            id="cardholder-name"
            value={cardData.nameOnCard}
            onChange={(e) => handleCardChange('nameOnCard', e.target.value)}
            placeholder="John Doe"
          />
        </div>
        
        <button
          className="pay-button"
          onClick={handlePayment}
          disabled={loading}
        >
          {loading ? 'Processing...' : `Pay ${amount} ${currency}`}
        </button>
      </div>

      {/* 3DS Challenge */}
      {showThreeDS && (
        <div className="threeds-container">
          <div className="threeds-header">
            <h3>3D Secure Authentication</h3>
            <p>Please complete the authentication challenge below:</p>
          </div>
          <iframe
            className="threeds-frame"
            srcDoc={threeDSHtml}
            title="3D Secure Challenge"
          />
          <button
            className="complete-auth-button"
            onClick={() => completeAuthentication()}
          >
            Complete Authentication
          </button>
        </div>
      )}

      <div className="card-form">
        <h4>Test Cards</h4>
        <ul style={{ fontSize: '14px', color: '#666' }}>
          <li><strong>4000000000001000</strong> - Frictionless (no challenge)</li>
          <li><strong>4000000000001091</strong> - Challenge required</li>
          <li><strong>Expiry:</strong> 01/39 or any future date</li>
          <li><strong>CVV:</strong> 123 or any 3-4 digits</li>
        </ul>
      </div>
    </div>
  );
};

export default PaymentCard;

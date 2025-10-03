import React, { useState } from 'react';
import PaymentCard from '../components/PaymentCard';

const PaymentTest = () => {
  const [paymentResult, setPaymentResult] = useState(null);
  const [orderId] = useState(`ORDER_${Date.now()}`);

  const handlePaymentSuccess = (result) => {
    console.log('Payment successful:', result);
    setPaymentResult({ success: true, data: result });
  };

  const handlePaymentError = (error) => {
    console.error('Payment failed:', error);
    setPaymentResult({ success: false, error: error.message });
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>MPGS 3D Secure Payment Test</h1>
      
      {paymentResult && (
        <div style={{
          padding: '15px',
          marginBottom: '20px',
          borderRadius: '4px',
          backgroundColor: paymentResult.success ? '#d4edda' : '#f8d7da',
          color: paymentResult.success ? '#155724' : '#721c24',
          border: `1px solid ${paymentResult.success ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          <h3>{paymentResult.success ? '✅ Payment Successful!' : '❌ Payment Failed'}</h3>
          {paymentResult.success ? (
            <div>
              <p><strong>Authorization Code:</strong> {paymentResult.data.authorizationCode}</p>
              <p><strong>Transaction ID:</strong> {paymentResult.data.transactionId}</p>
              <p><strong>Result:</strong> {paymentResult.data.result}</p>
            </div>
          ) : (
            <p><strong>Error:</strong> {paymentResult.error}</p>
          )}
        </div>
      )}

      <PaymentCard
        orderId={orderId}
        amount="10.00"
        currency="JOD"
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentError={handlePaymentError}
      />

      <div style={{
        marginTop: '30px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px'
      }}>
        <h3>Integration Instructions</h3>
        <ol>
          <li>Make sure your backend is running on the correct port</li>
          <li>Set REACT_APP_API_URL in your .env file (or leave empty for same origin)</li>
          <li>Ensure MPGS environment variables are configured in your backend</li>
          <li>Use test cards from the list below the payment form</li>
          <li>Check browser console and network tab for debugging</li>
        </ol>
        
        <h4>Backend Environment Variables Required:</h4>
        <ul style={{ fontFamily: 'monospace', fontSize: '12px' }}>
          <li>MPGS_GATEWAY=https://test-gateway.mastercard.com</li>
          <li>MPGS_API_VERSION=73</li>
          <li>MPGS_MERCHANT_ID=TESTNITEST2</li>
          <li>MPGS_API_USERNAME=merchant.TESTNITEST2</li>
          <li>MPGS_API_PASSWORD=your_password</li>
          <li>MPGS_MERCHANT_NAME=Test Merchant</li>
          <li>MPGS_DEFAULT_CURRENCY=JOD</li>
          <li>MPGS_RETURN_BASE_URL=http://localhost:3000</li>
        </ul>
      </div>
    </div>
  );
};

export default PaymentTest;

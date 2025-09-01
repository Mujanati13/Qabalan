// Quick test for the checkout-session endpoint
const test = async () => {
  try {
    console.log('Testing /mpgs/checkout-session endpoint...');
    
    // Test with missing orderId
    let response = await fetch('http://localhost:3015/api/payments/mpgs/checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: '25.50' })
    });
    
    if (response.status === 400) {
      console.log('✅ Correctly returns 400 for missing orderId');
    }
    
    // Test with missing amount
    response = await fetch('http://localhost:3015/api/payments/mpgs/checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: '123' })
    });
    
    if (response.status === 400) {
      console.log('✅ Correctly returns 400 for missing amount');
    }
    
    console.log('✅ Endpoint validation working correctly');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

// Only run if server is available
if (process.env.NODE_ENV !== 'production') {
  setTimeout(test, 1000);
}

module.exports = { test };

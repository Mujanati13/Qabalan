const { createRequire } = require('module');

async function testAdminEndpoint() {
  try {
    // Import fetch polyfill if needed
    const fetch = globalThis.fetch || (await import('node-fetch')).default;
    
    console.log('Testing admin dashboard /mpgs/session endpoint...');
    
    const response = await fetch('http://localhost:3015/api/payments/mpgs/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderId: '1',
        amount: '50.00',
        currency: 'USD'
      })
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const text = await response.text();
      console.log('Error response:', text);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('SUCCESS: Admin endpoint working');
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    // Check if it has expected fields for admin dashboard
    if (data.sessionId && data.orderId && data.amount && data.currency) {
      console.log('✅ Admin dashboard compatibility confirmed');
    } else {
      console.log('⚠️  Missing some expected admin fields');
    }
    
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
}

testAdminEndpoint();

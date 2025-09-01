const { createRequire } = require('module');

async function testWebClientEndpoint() {
  try {
    const fetch = globalThis.fetch || (await import('node-fetch')).default;
    
    console.log('Testing web-client /mpgs/payment/view endpoint...');
    
    const response = await fetch('http://localhost:3015/api/payments/mpgs/payment/view?orders_id=1');
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.status === 200) {
      console.log('✅ Web client endpoint working');
    } else {
      console.log('❌ Web client endpoint failed');
      const text = await response.text();
      console.log('Response body:', text);
    }
    
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    
    // Try to check if server is running
    try {
      const healthCheck = await fetch('http://localhost:3015/');
      console.log('Server health check status:', healthCheck.status);
    } catch (healthError) {
      console.log('❌ Server appears to be down:', healthError.message);
    }
  }
}

testWebClientEndpoint();

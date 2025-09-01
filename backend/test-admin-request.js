const axios = require('axios');

async function testAdminRequest() {
  try {
    console.log('Testing admin dashboard request...');
    
    // Simulate exactly what the admin dashboard sends
    const config = {
      method: 'POST',
      url: 'http://localhost:3015/api/payments/mpgs/session',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake-token',
        'Accept-Language': 'en'
      },
      data: {
        orderId: 1,
        amount: '50.00',
        currency: 'JOD'
      },
      timeout: 10000
    };
    
    console.log('Request config:', JSON.stringify(config, null, 2));
    
    const response = await axios(config);
    console.log('SUCCESS! Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('ERROR occurred!');
    console.log('Status:', error.response?.status);
    console.log('Status Text:', error.response?.statusText);
    console.log('Response Data:', error.response?.data);
    console.log('Request Data:', error.config?.data);
    console.log('Full Error:', error.message);
  }
}

testAdminRequest();

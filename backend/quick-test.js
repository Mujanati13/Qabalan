const http = require('http');

async function quickTest() {
  console.log('🔧 Quick MPGS Test');
  console.log('================');
  
  const tests = [
    { name: 'HPP Test Page', url: 'http://localhost:3015/api/payments/mpgs/hpp/test' },
    { name: 'Create Order (POST)', url: 'http://localhost:3015/api/payments/mpgs/create-test-order', method: 'POST' }
  ];

  for (const test of tests) {
    console.log(`\n🧪 Testing: ${test.name}`);
    try {
      const options = {
        method: test.method || 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      if (test.method === 'POST') {
        options.body = JSON.stringify({ amount: '10.00', currency: 'USD' });
      }

      const response = await fetch(test.url, options);
      const status = response.status;
      
      if (status >= 200 && status < 300) {
        console.log(`✅ SUCCESS (${status})`);
      } else {
        console.log(`❌ FAILED (${status})`);
        const text = await response.text();
        console.log(`   Response: ${text.substring(0, 100)}...`);
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
    }
  }
  
  console.log('\n🔗 Manual test URLs:');
  console.log('   HPP Test: http://localhost:3015/api/payments/mpgs/hpp/test');
  console.log('   Payment View: http://localhost:3015/api/payments/mpgs/payment/view?orders_id=123');
}

quickTest().catch(console.error);

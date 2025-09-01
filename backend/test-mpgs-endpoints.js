#!/usr/bin/env node

const http = require('http');
const https = require('https');

// Test configuration
const BASE_URL = 'http://localhost:3015';
const API_BASE = `${BASE_URL}/api/payments`;

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testEndpoint(name, url, options = {}) {
  log('blue', `\n🧪 Testing: ${name}`);
  log('yellow', `   URL: ${url}`);
  
  try {
    const result = await makeRequest(url, options);
    
    if (result.status >= 200 && result.status < 300) {
      log('green', `   ✅ SUCCESS (${result.status})`);
      if (result.data && typeof result.data === 'object') {
        console.log(`   📄 Response:`, JSON.stringify(result.data, null, 2).substring(0, 200) + '...');
      }
      return { success: true, data: result.data, status: result.status };
    } else {
      log('red', `   ❌ FAILED (${result.status})`);
      console.log(`   📄 Response:`, result.data);
      return { success: false, data: result.data, status: result.status };
    }
  } catch (error) {
    log('red', `   ❌ ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  log('bold', '🚀 MPGS Payment Endpoints Test Suite');
  log('bold', '=====================================\n');
  
  let testResults = [];
  let testOrderId = null;

  // Test 1: Create test order
  const createOrderTest = await testEndpoint(
    'Create Test Order',
    `${API_BASE}/mpgs/create-test-order`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: '25.50',
        currency: 'USD',
        description: 'Test Order from Script'
      })
    }
  );
  testResults.push({ name: 'Create Test Order', ...createOrderTest });
  
  if (createOrderTest.success && createOrderTest.data.order) {
    testOrderId = createOrderTest.data.order.id;
    log('green', `   📝 Created order ID: ${testOrderId}`);
  }

  // Test 2: Get order details
  if (testOrderId) {
    const getOrderTest = await testEndpoint(
      'Get Order Details',
      `${API_BASE}/mpgs/order/${testOrderId}`
    );
    testResults.push({ name: 'Get Order Details', ...getOrderTest });
  }

  // Test 3: Test HPP endpoint
  const hppTest = await testEndpoint(
    'HPP Test Page',
    `${API_BASE}/mpgs/hpp/test`
  );
  testResults.push({ name: 'HPP Test Page', ...hppTest });

  // Test 4: Test payment view (requires order ID)
  if (testOrderId) {
    const paymentViewTest = await testEndpoint(
      'Payment View Page',
      `${API_BASE}/mpgs/payment/view?orders_id=${testOrderId}`
    );
    testResults.push({ name: 'Payment View Page', ...paymentViewTest });
  }

  // Test 5: Test checkout session creation (this might fail due to auth)
  if (testOrderId) {
    const checkoutSessionTest = await testEndpoint(
      'Checkout Session Creation',
      `${API_BASE}/mpgs/checkout-session`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId: testOrderId,
          amount: '25.50'
        })
      }
    );
    testResults.push({ name: 'Checkout Session Creation', ...checkoutSessionTest });
  }

  // Test 6: Debug order (if order exists)
  if (testOrderId) {
    const debugOrderTest = await testEndpoint(
      'Debug Order Status',
      `${API_BASE}/mpgs/debug-order/${testOrderId}`
    );
    testResults.push({ name: 'Debug Order Status', ...debugOrderTest });
  }

  // Test 7: Test static files
  const staticTest = await testEndpoint(
    'Quick Test Page',
    `${BASE_URL}/mpgs-quick-test.html`
  );
  testResults.push({ name: 'Quick Test Page', ...staticTest });

  // Results summary
  log('bold', '\n📊 TEST RESULTS SUMMARY');
  log('bold', '=======================');
  
  const passed = testResults.filter(t => t.success).length;
  const failed = testResults.filter(t => !t.success).length;
  
  testResults.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const statusText = result.success ? 'PASS' : 'FAIL';
    log(result.success ? 'green' : 'red', `${status} ${result.name}: ${statusText}`);
    
    if (!result.success && result.error) {
      log('red', `   Error: ${result.error}`);
    }
    if (!result.success && result.status) {
      log('red', `   Status: ${result.status}`);
    }
  });

  log('bold', `\n📈 TOTAL: ${passed} passed, ${failed} failed out of ${testResults.length} tests`);
  
  if (testOrderId) {
    log('blue', `\n🔗 Test URLs you can visit:`);
    log('yellow', `   Payment View: ${BASE_URL}/api/payments/mpgs/payment/view?orders_id=${testOrderId}`);
    log('yellow', `   Quick Test: ${BASE_URL}/mpgs-quick-test.html`);
    log('yellow', `   HPP Test: ${BASE_URL}/api/payments/mpgs/hpp/test`);
  }

  if (failed === 0) {
    log('green', '\n🎉 All tests passed! Your MPGS integration is working correctly.');
  } else {
    log('red', '\n⚠️  Some tests failed. Check the output above for details.');
  }
}

// Check if server is running first
async function checkServer() {
  try {
    await makeRequest(`${BASE_URL}/api/payments/mpgs/hpp/test`);
    return true;
  } catch (error) {
    log('red', `❌ Server is not running on ${BASE_URL}`);
    log('yellow', '💡 Please start your server first: node app.js');
    return false;
  }
}

// Main execution
async function main() {
  const serverRunning = await checkServer();
  if (!serverRunning) {
    process.exit(1);
  }
  
  await runTests();
}

// Run the tests
main().catch(error => {
  log('red', `💥 Test script failed: ${error.message}`);
  process.exit(1);
});

const axios = require('axios');
require('dotenv').config();

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3015';

console.log('🧪 Testing Promo Code Creation');
console.log('=============================');

let authToken = null;

// Test authentication
async function testAuthentication() {
  console.log('\n1️⃣ Testing Authentication...');
  
  try {
    const response = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'admin@admin.com',
      password: 'simo1234'
    });

    if (response.data && response.data.success) {
      authToken = response.data.data.tokens.accessToken;
      console.log('✅ Authentication successful');
      return true;
    } else {
      console.log('❌ Authentication failed - Invalid response structure');
      return false;
    }
  } catch (error) {
    console.log('❌ Authentication failed:', error.response?.data?.message || error.message);
    return false;
  }
}

// Test promo code creation with valid data
async function testPromoCreation() {
  console.log('\n2️⃣ Testing Promo Code Creation...');
  
  const testPromoData = {
    code: 'TEST' + Date.now(),
    title_en: 'Test Promo Code',
    title_ar: 'كود خصم تجريبي',
    description_en: 'Test promo code for debugging',
    description_ar: 'كود خصم تجريبي للتجربة',
    discount_type: 'percentage',
    discount_value: 15,
    min_order_amount: null,
    max_discount_amount: null,
    usage_limit: null,
    user_usage_limit: 1,
    valid_from: new Date().toISOString().slice(0, 19).replace('T', ' '),
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '),
    is_active: 1
  };

  console.log('📤 Sending promo data:', testPromoData);

  try {
    const response = await axios.post(`${API_BASE}/api/promos`, testPromoData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data && response.data.success) {
      console.log('✅ Promo code created successfully!');
      console.log('📄 Created promo:', response.data.data);
      return true;
    } else {
      console.log('❌ Promo creation failed - Invalid response structure');
      console.log('Response:', response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Promo creation failed');
    console.log('Status:', error.response?.status);
    console.log('Error message:', error.response?.data?.message);
    console.log('Debug info:', error.response?.data?.debug);
    console.log('Full error response:', JSON.stringify(error.response?.data, null, 2));
    return false;
  }
}

// Test different discount types
async function testDifferentDiscountTypes() {
  console.log('\n3️⃣ Testing Different Discount Types...');
  
  const discountTypes = [
    { type: 'percentage', value: 20 },
    { type: 'fixed_amount', value: 10.50 },
    { type: 'free_shipping', value: 0 }
  ];

  for (const discount of discountTypes) {
    console.log(`\n🔍 Testing ${discount.type} discount...`);
    
    const testData = {
      code: `${discount.type.toUpperCase()}_${Date.now()}`,
      title_en: `Test ${discount.type} Promo`,
      discount_type: discount.type,
      discount_value: discount.value,
      valid_from: new Date().toISOString().slice(0, 19).replace('T', ' '),
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '),
      is_active: 1
    };

    try {
      const response = await axios.post(`${API_BASE}/api/promos`, testData, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.success) {
        console.log(`✅ ${discount.type} promo created successfully`);
      } else {
        console.log(`❌ ${discount.type} promo creation failed`);
      }
    } catch (error) {
      console.log(`❌ ${discount.type} promo creation failed:`, error.response?.data?.message);
      if (error.response?.data?.debug) {
        console.log('Debug info:', error.response.data.debug);
      }
    }
  }
}

// Main test runner
async function runTests() {
  try {
    const authSuccess = await testAuthentication();
    if (!authSuccess) {
      console.log('\n❌ Cannot proceed without authentication');
      process.exit(1);
    }

    const basicTestSuccess = await testPromoCreation();
    if (basicTestSuccess) {
      await testDifferentDiscountTypes();
    }

    console.log('\n🎉 Test completed!');
    console.log('Check the backend console for detailed debugging information.');
    
  } catch (error) {
    console.log('\n💥 Test suite crashed:', error.message);
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  runTests()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Test suite error:', error);
      process.exit(1);
    });
}

module.exports = { runTests };
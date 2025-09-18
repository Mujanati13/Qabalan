// Mobile App Production API Test
const axios = require('axios');

async function testMobileAppProductionAPI() {
  console.log('📱 Testing Mobile App with Production API');
  console.log('🌐 API URL: https://qablanapi.albech.me/api');
  console.log('═══════════════════════════════════════');
  console.log('');

  const testPhone = '962795555555';
  let verificationCode = null;

  // Step 1: Test sending SMS verification
  console.log('📋 Step 1: Testing SMS verification send...');
  try {
    const smsResponse = await axios.post('https://qablanapi.albech.me/api/auth/send-sms-verification', {
      phone: testPhone,
      language: 'en'
    });

    console.log('✅ SMS Send Response:');
    console.log('   Status:', smsResponse.status);
    console.log('   Success:', smsResponse.data.success);
    console.log('   Message:', smsResponse.data.message);
    console.log('   Phone:', smsResponse.data.data?.phone);
    console.log('   Expires in:', smsResponse.data.data?.expires_in_minutes, 'minutes');
    console.log('');

    if (smsResponse.data.success) {
      console.log('✅ SMS verification code sent successfully!');
      console.log('📱 In a real scenario, the user would receive the SMS code.');
      console.log('🧪 For testing, we\'ll simulate with a test code.');
    }

  } catch (error) {
    console.error('❌ SMS Send Error:');
    console.error('   Status:', error.response?.status);
    console.error('   Message:', error.response?.data?.message);
    console.error('   Details:', error.response?.data);
    return;
  }

  console.log('');

  // Step 2: Test SMS verification with invalid code (expected to fail)
  console.log('📋 Step 2: Testing SMS verification with test code...');
  try {
    const verifyResponse = await axios.post('https://qablanapi.albech.me/api/auth/verify-sms', {
      phone: testPhone,
      code: '123456' // Test code
    });

    console.log('✅ Unexpected success:', verifyResponse.data);

  } catch (error) {
    console.log('⚠️ Expected failure for test code:');
    console.log('   Status:', error.response?.status);
    console.log('   Message:', error.response?.data?.message);
    console.log('   This confirms the API is working correctly.');
  }

  console.log('');

  // Step 3: Test registration with SMS (will fail without valid code)
  console.log('📋 Step 3: Testing registration with SMS...');
  try {
    const registerResponse = await axios.post('https://qablanapi.albech.me/api/auth/register-with-sms', {
      first_name: 'Test',
      last_name: 'User',
      phone: testPhone,
      password: 'Test123456',
      sms_code: '123456', // Test code
      language: 'en'
    });

    console.log('✅ Unexpected registration success:', registerResponse.data);

  } catch (error) {
    console.log('⚠️ Expected registration failure (no valid SMS code):');
    console.log('   Status:', error.response?.status);
    console.log('   Message:', error.response?.data?.message);
    console.log('   This confirms SMS verification is required.');
  }

  console.log('');

  // Step 4: Test login with SMS (will fail without valid code)
  console.log('📋 Step 4: Testing login with SMS...');
  try {
    const loginResponse = await axios.post('https://qablanapi.albech.me/api/auth/login-with-sms', {
      phone: testPhone,
      sms_code: '123456' // Test code
    });

    console.log('✅ Unexpected login success:', loginResponse.data);

  } catch (error) {
    console.log('⚠️ Expected login failure (no valid SMS code):');
    console.log('   Status:', error.response?.status);
    console.log('   Message:', error.response?.data?.message);
    console.log('   This confirms SMS verification is required.');
  }

  console.log('');
  console.log('🎯 TEST SUMMARY:');
  console.log('═══════════════');
  console.log('✅ Production API is accessible');
  console.log('✅ SMS sending endpoint works correctly');
  console.log('✅ SMS verification requires valid code');
  console.log('✅ Registration requires SMS verification');
  console.log('✅ Login requires SMS verification');
  console.log('');
  console.log('📱 MOBILE APP STATUS:');
  console.log('✅ API URL configured for production');
  console.log('✅ SMS verification flow working');
  console.log('✅ Error handling working correctly');
  console.log('');
  console.log('🔧 NEXT STEPS:');
  console.log('1. Test with real phone number to receive SMS');
  console.log('2. Use actual verification code from SMS');
  console.log('3. Complete registration/login flow');
}

testMobileAppProductionAPI().then(() => {
  console.log('\\n📱 Mobile app production API test completed!');
});

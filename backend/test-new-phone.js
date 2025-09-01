const axios = require('axios');
const { executeQuery } = require('./config/database');

const API_BASE = 'http://localhost:3015/api';

async function testNewPhoneRegistration() {
  try {
    // Use a different phone number for testing
    const testPhone = '962795555888';
    const testData = {
      phone: testPhone,
      language: 'en'
    };

    console.log('🧪 Testing SMS Registration with NEW phone number...');
    console.log(`📱 Phone: ${testPhone}`);

    // Step 1: Send SMS verification
    console.log('\n📱 Step 1: Sending SMS verification...');
    const smsResponse = await axios.post(`${API_BASE}/auth/send-sms-verification`, testData);
    console.log(`   Status: ${smsResponse.status}`);
    console.log(`   Response: ${JSON.stringify(smsResponse.data)}`);
    
    if (smsResponse.status === 200) {
      console.log('✅ SMS sent successfully');
    } else {
      console.log('❌ SMS sending failed');
      return;
    }

    // Step 2: Get verification code from database
    console.log('\n📋 Step 2: Getting verification code from database...');
    const [verification] = await executeQuery(
      'SELECT code FROM verification_codes WHERE phone = ? AND type = "sms_verification" AND used_at IS NULL ORDER BY created_at DESC LIMIT 1',
      [testPhone]
    );
    
    if (!verification) {
      console.log('❌ No verification code found');
      return;
    }
    
    console.log(`✅ Found verification code: ${verification.code}`);

    // Step 3: Register with SMS verification
    console.log('\n📋 Step 3: Registering with SMS verification...');
    const registrationData = {
      first_name: 'New',
      last_name: 'TestUser',
      email: 'newtestuser@example.com',
      phone: testPhone,
      password: 'TestPassword123!',
      sms_code: verification.code,
      language: 'en'
    };

    const regResponse = await axios.post(`${API_BASE}/auth/register-with-sms`, registrationData);
    console.log(`   Status: ${regResponse.status}`);
    console.log(`   Response: ${JSON.stringify(regResponse.data)}`);
    
    if (regResponse.status === 200 || regResponse.status === 201) {
      console.log('✅ Registration successful!');
    } else {
      console.log('❌ Registration failed');
    }

    console.log('\n🧪 New phone registration test finished!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test error:', error.response?.data || error.message);
    console.log(`   Status: ${error.response?.status}`);
    console.log(`   Response: ${JSON.stringify(error.response?.data)}`);
    process.exit(1);
  }
}

testNewPhoneRegistration();

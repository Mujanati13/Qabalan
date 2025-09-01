// Mobile App Registration Flow Test
const http = require('http');

async function testMobileRegistrationFlow() {
  console.log('📱 Testing Mobile App Registration with Phone Verification...\n');

  // Test data similar to what mobile app would send
  const registrationData = {
    first_name: 'Test',
    last_name: 'User',
    email: 'test@example.com',
    phone: '962795555555',
    password: 'Test123456',
    sms_code: '123456' // This would be the code received via SMS
  };

  // Step 1: Test send SMS verification
  console.log('📋 Step 1: Testing send SMS verification...');
  const smsResult = await sendSMSVerification(registrationData.phone);
  
  if (smsResult.success) {
    console.log('✅ SMS verification sent successfully');
    
    // Step 2: Test registration with SMS
    console.log('\n📋 Step 2: Testing registration with SMS verification...');
    await testRegistrationWithSMS(registrationData);
  } else {
    console.log('❌ SMS verification failed');
  }
}

function sendSMSVerification(phone) {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      phone: phone,
      language: 'en'
    });

    const options = {
      hostname: 'localhost',
      port: 3015,
      path: '/api/auth/send-sms-verification',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Response: ${responseData}`);
        
        resolve({
          success: res.statusCode === 200,
          data: responseData
        });
      });
    });

    req.on('error', (error) => {
      console.error('   ❌ Request failed:', error.message);
      resolve({ success: false, error: error.message });
    });

    req.write(data);
    req.end();
  });
}

function testRegistrationWithSMS(userData) {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      first_name: userData.first_name,
      last_name: userData.last_name,
      phone: userData.phone,
      email: userData.email,
      password: userData.password,
      sms_code: userData.sms_code,
      language: 'en'
    });

    const options = {
      hostname: 'localhost',
      port: 3015,
      path: '/api/auth/register-with-sms',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Response: ${responseData}`);
        
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log('✅ Registration with SMS verification successful!');
        } else {
          console.log('❌ Registration with SMS verification failed');
        }
        
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error('   ❌ Request failed:', error.message);
      resolve();
    });

    req.write(data);
    req.end();
  });
}

// Run the test
testMobileRegistrationFlow().then(() => {
  console.log('\n📱 Mobile registration test completed!');
});

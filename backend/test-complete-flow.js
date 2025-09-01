const http = require('http');
const mysql = require('mysql2/promise');

async function testCompleteFlow() {
  console.log('🧪 Testing Complete SMS Registration Flow...\n');

  const testPhone = '962795555556'; // Different phone number for fresh test
  const testUser = {
    first_name: 'Test',
    last_name: 'User',
    email: 'newtest@example.com',
    phone: testPhone,
    password: 'Test123456'
  };

  // Step 1: Send SMS verification
  console.log('📱 Step 1: Sending SMS verification...');
  const smsResult = await sendSMSRequest(testPhone);
  
  if (!smsResult.success) {
    console.log('❌ SMS sending failed');
    return;
  }

  console.log('✅ SMS sent successfully');
  
  // Step 2: Get verification code from database
  console.log('\n📋 Step 2: Getting verification code from database...');
  const code = await getVerificationCode(testPhone);
  
  if (!code) {
    console.log('❌ No verification code found');
    return;
  }

  console.log(`✅ Found verification code: ${code}`);

  // Step 3: Register with SMS
  console.log('\n📝 Step 3: Registering with SMS verification...');
  const registerResult = await registerWithSMS({
    ...testUser,
    sms_code: code,
    language: 'en'
  });

  if (registerResult.success) {
    console.log('🎉 COMPLETE SUCCESS! SMS Registration Flow Working! 🎉');
  } else {
    console.log('❌ Registration failed:', registerResult.error);
  }
}

function sendSMSRequest(phone) {
  return new Promise((resolve) => {
    const data = JSON.stringify({ phone, language: 'en' });
    
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
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        resolve({ success: res.statusCode === 200, data: responseData });
      });
    });

    req.on('error', (error) => {
      console.log(`   Error: ${error.message}`);
      resolve({ success: false, error: error.message });
    });

    req.write(data);
    req.end();
  });
}

async function getVerificationCode(phone) {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'simo1234',
      database: 'fecs_db'
    });

    const [rows] = await connection.execute(`
      SELECT code FROM verification_codes 
      WHERE phone = ? AND type = 'sms_verification' AND used_at IS NULL
      ORDER BY created_at DESC LIMIT 1
    `, [phone]);

    await connection.end();
    return rows.length > 0 ? rows[0].code : null;
  } catch (error) {
    console.log(`   Database error: ${error.message}`);
    return null;
  }
}

function registerWithSMS(userData) {
  return new Promise((resolve) => {
    const data = JSON.stringify(userData);
    
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
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Response: ${responseData}`);
        resolve({ 
          success: res.statusCode === 200 || res.statusCode === 201, 
          data: responseData 
        });
      });
    });

    req.on('error', (error) => {
      console.log(`   Error: ${error.message}`);
      resolve({ success: false, error: error.message });
    });

    req.write(data);
    req.end();
  });
}

testCompleteFlow();

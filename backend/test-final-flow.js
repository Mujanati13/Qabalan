const http = require('http');
const mysql = require('mysql2/promise');

async function testCompleteFlow() {
  console.log('🧪 Testing Complete SMS Registration Flow...\n');

  const testPhone = '962795555777'; // Use a different test number
  const testEmail = 'testuser2@example.com';

  try {
    // Step 1: Send SMS verification
    console.log('📱 Step 1: Sending SMS verification...');
    const smsResult = await sendSMSVerification(testPhone);
    
    if (!smsResult.success) {
      console.log('❌ SMS sending failed');
      return;
    }

    console.log('✅ SMS sent successfully');

    // Step 2: Get verification code from database
    console.log('\n📋 Step 2: Getting verification code from database...');
    const verificationCode = await getVerificationCode(testPhone);
    
    if (!verificationCode) {
      console.log('❌ No verification code found');
      return;
    }

    console.log(`✅ Found verification code: ${verificationCode}`);

    // Step 3: Register with SMS verification
    console.log('\n📋 Step 3: Registering with SMS verification...');
    const registrationResult = await registerWithSMS({
      first_name: 'Test',
      last_name: 'User',
      email: testEmail,
      phone: testPhone,
      password: 'Test123456',
      sms_code: verificationCode,
      language: 'en'
    });

    if (registrationResult.success) {
      console.log('🎉 COMPLETE SUCCESS! Phone verification registration working!');
      
      // Step 4: Verify user was created
      console.log('\n📋 Step 4: Verifying user was created in database...');
      await verifyUserCreated(testPhone, testEmail);
      
    } else {
      console.log('❌ Registration failed');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
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
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Response: ${responseData}`);
        resolve({ success: res.statusCode === 200, data: responseData });
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

async function getVerificationCode(phone) {
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
      res.on('data', (chunk) => responseData += chunk);
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
      console.error('   ❌ Request failed:', error.message);
      resolve({ success: false, error: error.message });
    });

    req.write(data);
    req.end();
  });
}

async function verifyUserCreated(phone, email) {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'simo1234',
    database: 'fecs_db'
  });

  const [rows] = await connection.execute(`
    SELECT id, first_name, last_name, email, phone, is_verified, phone_verified_at, language
    FROM users 
    WHERE phone = ? AND email = ?
    ORDER BY created_at DESC LIMIT 1
  `, [phone, email]);

  if (rows.length > 0) {
    console.log('✅ User created successfully in database:');
    console.table(rows);
  } else {
    console.log('❌ User not found in database');
  }

  await connection.end();
}

// Run the complete test
testCompleteFlow().then(() => {
  console.log('\n🧪 Complete SMS registration test finished!');
});

const mysql = require('mysql2/promise');
const http = require('http');

async function testWithRealCode() {
  console.log('🔍 Testing with real verification code from database...\n');

  try {
    // Get the latest verification code from database
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'simo1234',
      database: 'fecs_db'
    });

    const [rows] = await connection.execute(`
      SELECT code, expires_at, created_at 
      FROM verification_codes 
      WHERE phone = ? AND type = 'sms_verification' AND used_at IS NULL
      ORDER BY created_at DESC LIMIT 1
    `, ['962795555555']);

    if (rows.length > 0) {
      const verificationCode = rows[0].code;
      console.log(`📋 Found verification code: ${verificationCode}`);
      console.log(`📋 Expires at: ${rows[0].expires_at}`);
      console.log(`📋 Created at: ${rows[0].created_at}`);

      // Test registration with real code
      console.log('\n📋 Testing registration with real verification code...');
      
      const registrationData = {
        first_name: 'Test',
        last_name: 'User', 
        email: 'testuser@example.com',
        phone: '962795555555',
        password: 'Test123456',
        sms_code: verificationCode,
        language: 'en'
      };

      const data = JSON.stringify(registrationData);

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
          console.log(`📋 Status: ${res.statusCode}`);
          console.log(`📋 Response: ${responseData}`);
          
          if (res.statusCode === 200 || res.statusCode === 201) {
            console.log('✅ Registration with SMS verification SUCCESSFUL! 🎉');
            console.log('✅ Phone verification flow is working perfectly!');
          } else {
            console.log('❌ Registration failed');
          }
        });
      });

      req.on('error', (error) => {
        console.error('❌ Request failed:', error.message);
      });

      req.write(data);
      req.end();

    } else {
      console.log('❌ No unused verification code found');
      console.log('💡 Try sending a new SMS verification first');
    }

    await connection.end();

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testWithRealCode();

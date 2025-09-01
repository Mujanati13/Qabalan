const http = require('http');
const mysql = require('mysql2/promise');

async function testSMSVerificationFlow() {
  console.log('🧪 Testing SMS Verification Flow...\n');

  // Test phone verification endpoint
  const testData = JSON.stringify({
    phone: '962795555555',
    language: 'en'
  });

  const options = {
    hostname: 'localhost',
    port: 3015,
    path: '/api/auth/send-sms-verification',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(testData)
    }
  };

  return new Promise((resolve, reject) => {
    console.log('📱 Testing SMS verification endpoint...');
    
    const req = http.request(options, async (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', async () => {
        console.log(`📋 Response Status: ${res.statusCode}`);
        console.log(`📋 Response Body: ${data}`);
        
        if (res.statusCode === 200) {
          console.log('✅ SMS verification endpoint working!');
          
          // Check database for verification code
          await checkDatabase();
        } else {
          console.log('❌ SMS verification endpoint failed');
        }
        
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request failed:', error.message);
      console.log('💡 Make sure the backend server is running on port 3015');
      resolve();
    });

    req.write(testData);
    req.end();
  });
}

async function checkDatabase() {
  try {
    console.log('\n📋 Checking database for verification code...');
    
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'simo1234',
      database: 'fecs_db'
    });

    const [rows] = await connection.execute(`
      SELECT id, phone, code, type, expires_at, created_at, used_at 
      FROM verification_codes 
      WHERE phone = ? AND type = 'sms_verification' 
      ORDER BY created_at DESC LIMIT 3
    `, ['962795555555']);

    if (rows.length > 0) {
      console.log('✅ Verification codes found in database:');
      rows.forEach((row, index) => {
        console.log(`\n📋 Code ${index + 1}:`);
        console.log(`   ID: ${row.id}`);
        console.log(`   Phone: ${row.phone}`);
        console.log(`   Code: ${row.code}`);
        console.log(`   Type: ${row.type}`);
        console.log(`   Expires: ${row.expires_at}`);
        console.log(`   Created: ${row.created_at}`);
        console.log(`   Used: ${row.used_at || 'Not used'}`);
      });
    } else {
      console.log('❌ No verification codes found in database');
    }

    await connection.end();
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  }
}

async function checkBackendStatus() {
  console.log('🔍 Checking if backend server is running...\n');
  
  const options = {
    hostname: 'localhost',
    port: 3015,
    path: '/api/health',
    method: 'GET',
    timeout: 5000
  };

  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      console.log(`✅ Backend server is running (Status: ${res.statusCode})`);
      resolve(true);
    });

    req.on('error', () => {
      console.log('❌ Backend server is not running');
      console.log('💡 Please start the backend server first: npm start');
      resolve(false);
    });

    req.on('timeout', () => {
      console.log('❌ Backend server timeout');
      resolve(false);
    });

    req.end();
  });
}

// Run the tests
async function runTests() {
  const isServerRunning = await checkBackendStatus();
  
  if (isServerRunning) {
    await testSMSVerificationFlow();
  }
  
  console.log('\n🧪 Test completed!');
}

runTests();

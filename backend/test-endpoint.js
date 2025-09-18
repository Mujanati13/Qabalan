// Simple test to check if the backend endpoint is accessible
const http = require('http');

const testEndpoint = () => {
  const options = {
    hostname: 'localhost',
    port: 3015,
    path: '/api/promos/available',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('Response:', data);
      if (res.statusCode === 200) {
        console.log('✅ Endpoint is working!');
      } else {
        console.log('❌ Endpoint returned error:', res.statusCode);
      }
    });
  });

  req.on('error', (e) => {
    console.error('❌ Request failed:', e.message);
    console.log('Is the backend server running on port 3015?');
  });

  req.end();
};

console.log('🧪 Testing backend endpoint: GET /api/promos/available');
testEndpoint();
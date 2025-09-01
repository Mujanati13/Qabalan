const https = require('https');

const urls = [
  'https://test-gateway.mastercard.com/static/checkout/checkout.js',
  'https://test-gateway.mastercard.com/checkout/version/73/checkout.js'
];

console.log('Testing MPGS checkout.js URLs...\n');

urls.forEach((url, index) => {
  console.log(`${index + 1}. Testing: ${url}`);
  
  https.get(url, (res) => {
    console.log(`   Status: ${res.statusCode}`);
    console.log(`   Content-Type: ${res.headers['content-type']}`);
    
    if (res.statusCode === 200) {
      console.log('   ✅ URL is accessible\n');
    } else {
      console.log(`   ❌ URL returned status: ${res.statusCode}\n`);
    }
  }).on('error', (err) => {
    console.log(`   ❌ Error: ${err.message}\n`);
  });
});

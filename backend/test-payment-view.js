const fetch = require('node-fetch');

async function testPaymentView() {
  try {
    console.log('Testing /mpgs/payment/view endpoint...');
    
    const response = await fetch('http://localhost:3015/api/payments/mpgs/payment/view?orders_id=8992');
    
    console.log('Status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    
    if (response.status === 200) {
      const html = await response.text();
      
      // Extract script URL from HTML
      const scriptMatch = html.match(/src="([^"]*checkout\.js[^"]*)"/);
      if (scriptMatch) {
        console.log('Script URL found:', scriptMatch[1]);
        
        // Check if checkout script is accessible
        console.log('Testing script accessibility...');
        try {
          const scriptResponse = await fetch(scriptMatch[1]);
          console.log('Script status:', scriptResponse.status);
          console.log('Script content-type:', scriptResponse.headers.get('content-type'));
          
          if (scriptResponse.status === 200) {
            console.log('✅ Script is accessible');
          } else {
            console.log('❌ Script returned status:', scriptResponse.status);
          }
        } catch (scriptError) {
          console.log('❌ Script error:', scriptError.message);
        }
      } else {
        console.log('❌ No script URL found in HTML');
      }
      
    } else {
      const text = await response.text();
      console.log('❌ Endpoint error:', text);
    }
    
  } catch (error) {
    console.log('❌ Request error:', error.message);
  }
}

testPaymentView();

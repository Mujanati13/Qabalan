// Test database fix
const test = async () => {
  console.log('🔧 Testing Database Fix');
  console.log('=====================');
  
  try {
    // Test create order (should work now without currency column)
    const response = await fetch('http://localhost:3015/api/payments/mpgs/create-test-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: '15.99', currency: 'USD' })
    });
    
    const status = response.status;
    const data = await response.json();
    
    if (status === 200 && data.success) {
      console.log('✅ Create order fixed! Order ID:', data.order.id);
      
      // Test payment view with the new order
      const viewResponse = await fetch(`http://localhost:3015/api/payments/mpgs/payment/view?orders_id=${data.order.id}`);
      const viewStatus = viewResponse.status;
      
      if (viewStatus === 200) {
        console.log('✅ Payment view working!');
      } else {
        console.log('❌ Payment view failed:', viewStatus);
      }
      
      console.log(`\n🔗 Test payment URL: http://localhost:3015/api/payments/mpgs/payment/view?orders_id=${data.order.id}`);
      
    } else {
      console.log('❌ Create order still failing:', status, data);
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
};

test();

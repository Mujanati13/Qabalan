const axios = require('axios');

const API_URL = 'http://localhost:3015/api';

async function testOrderWithFreeShipping() {
  console.log('🧪 Testing Order with Free Shipping Promo...\n');

  try {
    // Fetch the order from the list endpoint
    console.log('1️⃣ Fetching order from list endpoint...');
    const listResponse = await axios.get(`${API_URL}/orders?limit=1&page=1`);
    
    if (!listResponse.data.success || !listResponse.data.data.length) {
      console.log('❌ No orders found in the system');
      return;
    }

    const orderFromList = listResponse.data.data[0];
    console.log('✅ Order fetched from list:', orderFromList.order_number);
    console.log('   Order ID:', orderFromList.id);
    console.log('   Promo Code:', orderFromList.promo_code || 'None');
    console.log('   Promo Code ID:', orderFromList.promo_code_id || 'None');
    
    // Check if required fields are present in list response
    console.log('\n2️⃣ Checking list endpoint fields:');
    console.log('   ✓ subtotal:', orderFromList.subtotal);
    console.log('   ✓ delivery_fee:', orderFromList.delivery_fee);
    console.log('   ✓ delivery_fee_original:', orderFromList.delivery_fee_original);
    console.log('   ✓ discount_amount:', orderFromList.discount_amount);
    console.log('   ✓ shipping_discount_amount:', orderFromList.shipping_discount_amount);
    console.log('   ✓ total_amount:', orderFromList.total_amount);

    // Fetch the same order from the detail endpoint
    console.log('\n3️⃣ Fetching same order from detail endpoint...');
    const detailResponse = await axios.get(`${API_URL}/orders/${orderFromList.id}`);
    
    if (!detailResponse.data.success) {
      console.log('❌ Failed to fetch order details');
      return;
    }

    const orderFromDetail = detailResponse.data.data.order;
    console.log('✅ Order fetched from detail endpoint');
    
    // Check if required fields are present in detail response
    console.log('\n4️⃣ Checking detail endpoint fields:');
    console.log('   ✓ subtotal:', orderFromDetail.subtotal);
    console.log('   ✓ delivery_fee:', orderFromDetail.delivery_fee);
    console.log('   ✓ delivery_fee_original:', orderFromDetail.delivery_fee_original);
    console.log('   ✓ discount_amount:', orderFromDetail.discount_amount);
    console.log('   ✓ shipping_discount_amount:', orderFromDetail.shipping_discount_amount);
    console.log('   ✓ total_amount:', orderFromDetail.total_amount);

    // Compare values
    console.log('\n5️⃣ Comparing list vs detail values:');
    const fieldsToCompare = [
      'subtotal',
      'delivery_fee',
      'delivery_fee_original',
      'discount_amount',
      'shipping_discount_amount',
      'total_amount'
    ];

    let allMatch = true;
    fieldsToCompare.forEach(field => {
      const listValue = parseFloat(orderFromList[field] || 0);
      const detailValue = parseFloat(orderFromDetail[field] || 0);
      const match = Math.abs(listValue - detailValue) < 0.01;
      
      console.log(`   ${match ? '✓' : '✗'} ${field}: ${listValue} vs ${detailValue}`);
      if (!match) allMatch = false;
    });

    // Check if promo code is present
    if (orderFromList.promo_code_id) {
      console.log('\n6️⃣ Analyzing Free Shipping Promo:');
      console.log('   Promo Code:', orderFromDetail.promo_code);
      console.log('   Original Delivery Fee:', orderFromDetail.delivery_fee_original);
      console.log('   Final Delivery Fee:', orderFromDetail.delivery_fee);
      console.log('   Shipping Discount:', orderFromDetail.shipping_discount_amount);
      console.log('   Promo Discount:', orderFromDetail.discount_amount);
      
      const shippingDiscount = parseFloat(orderFromDetail.shipping_discount_amount || 0);
      const originalFee = parseFloat(orderFromDetail.delivery_fee_original || 0);
      const finalFee = parseFloat(orderFromDetail.delivery_fee || 0);
      
      if (shippingDiscount > 0) {
        console.log('\n   ✅ Free shipping promo is correctly applied!');
        console.log(`   💰 Customer saved: ${shippingDiscount} on delivery`);
        
        const expectedFinalFee = Math.max(originalFee - shippingDiscount, 0);
        if (Math.abs(finalFee - expectedFinalFee) < 0.01) {
          console.log('   ✅ Delivery fee calculation is correct');
        } else {
          console.log(`   ⚠️ Delivery fee mismatch: expected ${expectedFinalFee}, got ${finalFee}`);
        }
      } else {
        console.log('\n   ℹ️ No shipping discount applied (not a free shipping promo)');
      }
    } else {
      console.log('\n6️⃣ No promo code applied to this order');
    }

    // Check address data
    console.log('\n7️⃣ Checking address data:');
    if (orderFromList.delivery_address) {
      console.log('   ✅ List endpoint has delivery_address:');
      console.log('      -', orderFromList.delivery_address.address_line || 'N/A');
      console.log('      -', orderFromList.delivery_address.city || 'N/A');
      console.log('      -', orderFromList.delivery_address.area || 'N/A');
    } else {
      console.log('   ⚠️ List endpoint missing delivery_address');
    }

    if (orderFromDetail.delivery_address) {
      console.log('   ✅ Detail endpoint has delivery_address:');
      console.log('      -', orderFromDetail.delivery_address.address_line || 'N/A');
      console.log('      -', orderFromDetail.delivery_address.city || 'N/A');
      console.log('      -', orderFromDetail.delivery_address.area || 'N/A');
    } else {
      console.log('   ⚠️ Detail endpoint missing delivery_address');
    }

    console.log('\n' + '='.repeat(60));
    console.log(allMatch ? '✅ ALL TESTS PASSED!' : '⚠️ SOME TESTS FAILED');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testOrderWithFreeShipping();

#!/usr/bin/env node

const axios = require('axios');

async function testAutoApplyEndpoint() {
  console.log('🧪 Testing Auto-Apply Promo Endpoint');
  console.log('=' .repeat(50));

  try {
    console.log('📡 Step 1: Testing /api/promos/available endpoint...');
    
    const response = await axios.get('http://localhost:3000/api/promos/available', {
      timeout: 5000
    });
    
    console.log('✅ Endpoint Response Status:', response.status);
    console.log('✅ Response Success:', response.data.success);
    console.log('✅ Response Data Count:', response.data.data?.length || 0);
    
    if (response.data.success && response.data.data) {
      console.log('\n📋 Available Promo Codes:');
      response.data.data.forEach((promo, index) => {
        console.log(`   ${index + 1}. ${promo.code} (${promo.discount_type})`);
        console.log(`      min_order: $${promo.min_order_amount || 0}`);
        console.log(`      auto_apply_eligible: ${promo.auto_apply_eligible}`);
        console.log(`      is_active: ${promo.is_active}`);
        console.log('');
      });
      
      // Test the auto-apply logic simulation
      console.log('🎯 Testing Auto-Apply Logic Simulation:');
      console.log('-'.repeat(40));
      
      const testOrderTotals = [5, 15, 25, 50];
      
      for (const orderTotal of testOrderTotals) {
        console.log(`\n💰 Order Total: $${orderTotal}`);
        
        // Filter eligible promos (same logic as mobile app)
        const eligiblePromos = response.data.data.filter(promo => {
          const minOrder = promo.min_order_amount || 0;
          return orderTotal >= minOrder && promo.auto_apply_eligible === 1 && promo.is_active === 1;
        });
        
        console.log(`   Eligible promos: ${eligiblePromos.length}`);
        
        if (eligiblePromos.length > 0) {
          // Calculate savings for each (simplified version)
          const promoWithSavings = eligiblePromos.map(promo => {
            let savings = 0;
            if (promo.discount_type === 'percentage') {
              savings = orderTotal * (promo.discount_value / 100);
              if (promo.max_discount_amount && savings > promo.max_discount_amount) {
                savings = promo.max_discount_amount;
              }
            } else if (promo.discount_type === 'fixed_amount') {
              savings = promo.discount_value;
            } else if (promo.discount_type === 'free_shipping') {
              savings = promo.max_discount_amount || 8;
            }
            return { ...promo, savings };
          });
          
          // Sort by savings (highest first)
          const sortedPromos = promoWithSavings.sort((a, b) => b.savings - a.savings);
          const bestPromo = sortedPromos[0];
          
          console.log(`   🏆 Best promo: ${bestPromo.code} (saves $${bestPromo.savings.toFixed(2)})`);
        } else {
          console.log('   ❌ No eligible promos for this order total');
        }
      }
      
    } else {
      console.log('❌ API returned unsuccessful response');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Backend server is not running. Please start it with: npm start');
      
      console.log('\n🔧 Manual Check - Testing with static data:');
      console.log('If the server was running, these promos should be available for auto-apply:');
      
      const staticPromos = [
        { code: 'E0HNNOGJ', type: 'free_shipping', min_order: 2, savings: '$10' },
        { code: 'FREESHIP50', type: 'free_shipping', min_order: 10, savings: '$8' },
        { code: 'CEXQXULK', type: 'free_shipping', min_order: 12, savings: '$14' },
        { code: 'LF5K6CPE', type: 'percentage', min_order: 0, savings: '12%' }
      ];
      
      staticPromos.forEach(promo => {
        console.log(`   - ${promo.code} (${promo.type}): min_order $${promo.min_order}, saves ${promo.savings}`);
      });
      
    } else if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Response:', error.response.data);
    }
  }
}

// Additional check for mobile app requirements
function checkMobileAppConditions() {
  console.log('\n📱 Mobile App Auto-Apply Conditions Checklist:');
  console.log('=' .repeat(50));
  
  console.log('For auto-apply to work, ALL of these must be true:');
  console.log('1. ✓ appliedPromo === null (no promo currently applied)');
  console.log('2. ✓ orderCalculation?.subtotal > 0 (valid order total)');
  console.log('3. ✓ validatingPromo === false (not currently validating)');
  console.log('4. ✓ promoCode.trim() === "" (no manual promo code entered)');
  console.log('5. ✓ ApiService.getAvailablePromoCodes() returns data');
  console.log('6. ✓ At least one promo meets minimum order requirements');
  console.log('7. ✓ Promo validation succeeds');
  
  console.log('\n🔍 Common Issues:');
  console.log('- User already has a promo applied (appliedPromo is not null)');
  console.log('- User typed something in promo code field (promoCode is not empty)');
  console.log('- Order calculation not completed (orderCalculation.subtotal is 0)');
  console.log('- Backend server not running or endpoint not accessible');
  console.log('- All promos have higher minimum order requirements than current total');
  console.log('- Promos are not marked as auto_apply_eligible in database');
}

// Run the tests
testAutoApplyEndpoint().then(() => {
  checkMobileAppConditions();
}).catch(() => {
  checkMobileAppConditions();
});
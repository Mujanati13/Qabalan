#!/usr/bin/env node

const axios = require('axios');

// Test updating a promo code with auto_apply_eligible
async function testPromoUpdate() {
  console.log('🧪 Testing Promo Code Auto-Apply Toggle Update');
  console.log('=' .repeat(50));

  try {
    // First, get a promo code to test with
    console.log('📋 Step 1: Getting available promo codes...');
    const getResponse = await axios.get('http://localhost:3000/api/promos/available');
    
    if (!getResponse.data.success || !getResponse.data.data.length) {
      console.log('❌ No promo codes available for testing');
      return;
    }

    const testPromo = getResponse.data.data[0];
    console.log(`✅ Found test promo: ${testPromo.code} (ID: ${testPromo.id})`);
    console.log(`   Current auto_apply_eligible: ${testPromo.auto_apply_eligible}`);

    // Toggle the auto_apply_eligible value
    const newAutoApplyValue = testPromo.auto_apply_eligible === 1 ? 0 : 1;
    console.log(`🔄 Step 2: Toggling auto_apply_eligible from ${testPromo.auto_apply_eligible} to ${newAutoApplyValue}...`);

    // Prepare the update data (same as frontend would send)
    const updateData = {
      code: testPromo.code,
      title_en: testPromo.title_en,
      title_ar: testPromo.title_ar,
      description_en: testPromo.description_en,
      description_ar: testPromo.description_ar,
      discount_type: testPromo.discount_type,
      discount_value: parseFloat(testPromo.discount_value),
      min_order_amount: testPromo.min_order_amount ? parseFloat(testPromo.min_order_amount) : null,
      max_discount_amount: testPromo.max_discount_amount ? parseFloat(testPromo.max_discount_amount) : null,
      usage_limit: testPromo.usage_limit ? parseInt(testPromo.usage_limit) : null,
      user_usage_limit: testPromo.user_usage_limit ? parseInt(testPromo.user_usage_limit) : 1,
      valid_from: testPromo.valid_from,
      valid_until: testPromo.valid_until,
      is_active: testPromo.is_active,
      auto_apply_eligible: newAutoApplyValue
    };

    console.log('📝 Update data to be sent:');
    console.log('   auto_apply_eligible:', updateData.auto_apply_eligible, typeof updateData.auto_apply_eligible);

    // Since this is a protected route, we'll test the data structure
    // In a real scenario, you'd need proper authentication
    console.log('⚠️  Note: This test shows the data structure that would be sent to the API.');
    console.log('   In production, this would require admin authentication.');

    // Verify the data looks correct
    const requiredFields = ['code', 'discount_type', 'valid_from', 'valid_until'];
    const missingFields = requiredFields.filter(field => !updateData[field]);
    
    if (missingFields.length > 0) {
      console.log('❌ Missing required fields:', missingFields);
      return;
    }

    console.log('✅ All required fields present');
    console.log('✅ auto_apply_eligible is properly formatted as integer:', updateData.auto_apply_eligible);

    // Show what the SQL query would look like
    console.log('\n📊 Database update that would be executed:');
    console.log('UPDATE promo_codes SET auto_apply_eligible = ? WHERE id = ?');
    console.log(`Parameters: [${updateData.auto_apply_eligible}, ${testPromo.id}]`);

    console.log('\n🎯 Summary:');
    console.log(`   Promo Code: ${testPromo.code}`);
    console.log(`   Current auto_apply_eligible: ${testPromo.auto_apply_eligible}`);
    console.log(`   Would change to: ${updateData.auto_apply_eligible}`);
    console.log(`   Data type: ${typeof updateData.auto_apply_eligible}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Response:', error.response.data);
    }
  }
}

// Run the test
testPromoUpdate();
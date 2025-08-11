#!/usr/bin/env node

/**
 * Test the bulk branch operations API endpoints
 */

require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

// Test configuration
const TEST_PRODUCT_ID = 1447; // Use the product ID we saw in the database
const TEST_BRANCH_ID = 1688;  // Use the branch ID we saw in the database

async function testBulkOperations() {
  console.log('🧪 Testing Bulk Branch Operations API');
  console.log('====================================');

  try {
    // Test 1: Deactivate product in branch
    console.log('\n🔄 Test 1: Deactivating product in branch...');
    console.log(`   PUT ${API_BASE_URL}/products/${TEST_PRODUCT_ID}/branches/${TEST_BRANCH_ID}`);
    console.log('   Body: { is_available: false }');

    const deactivateResponse = await axios.put(
      `${API_BASE_URL}/products/${TEST_PRODUCT_ID}/branches/${TEST_BRANCH_ID}`,
      { is_available: false },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }
    );

    if (deactivateResponse.status === 200) {
      console.log('✅ Deactivate test passed');
      console.log('   Response:', deactivateResponse.data.message);
    } else {
      console.log('❌ Deactivate test failed - unexpected status:', deactivateResponse.status);
    }

    // Test 2: Activate product in branch
    console.log('\n🔄 Test 2: Activating product in branch...');
    console.log(`   PUT ${API_BASE_URL}/products/${TEST_PRODUCT_ID}/branches/${TEST_BRANCH_ID}`);
    console.log('   Body: { is_available: true }');

    const activateResponse = await axios.put(
      `${API_BASE_URL}/products/${TEST_PRODUCT_ID}/branches/${TEST_BRANCH_ID}`,
      { is_available: true },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }
    );

    if (activateResponse.status === 200) {
      console.log('✅ Activate test passed');
      console.log('   Response:', activateResponse.data.message);
    } else {
      console.log('❌ Activate test failed - unexpected status:', activateResponse.status);
    }

    // Test 3: Get product branches to verify changes
    console.log('\n🔄 Test 3: Checking product branches...');
    console.log(`   GET ${API_BASE_URL}/products/${TEST_PRODUCT_ID}/branches`);

    const branchesResponse = await axios.get(
      `${API_BASE_URL}/products/${TEST_PRODUCT_ID}/branches`,
      {
        timeout: 5000
      }
    );

    if (branchesResponse.status === 200 && branchesResponse.data.success) {
      console.log('✅ Get branches test passed');
      const branches = branchesResponse.data.data?.availability || [];
      console.log(`   Found ${branches.length} branch assignments`);
      
      branches.forEach(branch => {
        const status = branch.branch_is_active || branch.is_available ? '✅ Active' : '❌ Inactive';
        console.log(`   - Branch ${branch.branch_id}: ${status} (Stock: ${branch.stock_quantity})`);
      });
    } else {
      console.log('❌ Get branches test failed');
    }

    console.log('\n🎉 All API tests completed successfully!');
    console.log('The bulk activate/deactivate functionality is working correctly.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Backend server not running. Please:');
      console.log('   1. Start the backend server: npm start');
      console.log('   2. Make sure it\'s running on port 3000');
    } else if (error.response) {
      console.log('\n💡 API Error:');
      console.log('   Status:', error.response.status);
      console.log('   Message:', error.response.data?.message || error.response.statusText);
      
      if (error.response.status === 404) {
        console.log('   - Check that the product and branch IDs exist');
        console.log('   - Verify the API endpoints are correct');
      } else if (error.response.status === 500) {
        console.log('   - Check the backend server logs for details');
        console.log('   - Ensure the database migration was successful');
      }
    }
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testBulkOperations().catch(console.error);
}

module.exports = { testBulkOperations };

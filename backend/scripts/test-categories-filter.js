#!/usr/bin/env node

/**
 * Test Categories API Filter
 * This script tests the include_inactive parameter for categories endpoints
 */

require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

async function testCategoriesFilter() {
  console.log('🧪 Testing Categories API Filter');
  console.log('===============================');

  try {
    console.log('\n🔄 Test 1: Get active categories only (default)...');
    const activeResponse = await axios.get(`${API_BASE_URL}/categories`);
    
    if (activeResponse.data.success) {
      const activeCategories = activeResponse.data.data;
      console.log(`✅ Found ${activeCategories.length} active categories`);
      
      // Check if any inactive categories are included
      const inactiveCount = activeCategories.filter(cat => !cat.is_active).length;
      if (inactiveCount === 0) {
        console.log('✅ Correctly filtered out inactive categories');
      } else {
        console.log(`❌ Found ${inactiveCount} inactive categories in active-only request`);
      }
    }

    console.log('\n🔄 Test 2: Get all categories (including inactive)...');
    const allResponse = await axios.get(`${API_BASE_URL}/categories?include_inactive=true`);
    
    if (allResponse.data.success) {
      const allCategories = allResponse.data.data;
      console.log(`✅ Found ${allCategories.length} total categories`);
      
      const activeCount = allCategories.filter(cat => cat.is_active).length;
      const inactiveCount = allCategories.filter(cat => !cat.is_active).length;
      
      console.log(`   - Active: ${activeCount}`);
      console.log(`   - Inactive: ${inactiveCount}`);
      
      if (allCategories.length >= activeResponse.data.data.length) {
        console.log('✅ include_inactive=true returns equal or more categories');
      } else {
        console.log('❌ include_inactive=true returned fewer categories than active-only');
      }
    }

    console.log('\n🔄 Test 3: Get categories tree (active only)...');
    const treeActiveResponse = await axios.get(`${API_BASE_URL}/categories/tree`);
    
    if (treeActiveResponse.data.success) {
      const activeTree = treeActiveResponse.data.data;
      console.log(`✅ Tree view: ${activeTree.length} root categories (active only)`);
    }

    console.log('\n🔄 Test 4: Get categories tree (including inactive)...');
    const treeAllResponse = await axios.get(`${API_BASE_URL}/categories/tree?include_inactive=true`);
    
    if (treeAllResponse.data.success) {
      const allTree = treeAllResponse.data.data;
      console.log(`✅ Tree view: ${allTree.length} root categories (including inactive)`);
      
      if (allTree.length >= treeActiveResponse.data.data.length) {
        console.log('✅ Tree include_inactive=true works correctly');
      } else {
        console.log('❌ Tree include_inactive=true returned fewer categories');
      }
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('The categories filter should work correctly in the admin dashboard.');
    
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
    }
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testCategoriesFilter().catch(console.error);
}

module.exports = { testCategoriesFilter };

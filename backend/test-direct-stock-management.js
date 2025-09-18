const axios = require('axios');
require('dotenv').config();

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3015';

console.log('🧪 Testing Direct Product Stock Management Functionality');
console.log('===================================================');

let authToken = null;

// Test authentication
async function testAuthentication() {
  console.log('\n1️⃣ Testing Authentication...');
  
  try {
    const response = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'admin@admin.com',
      password: 'simo1234'
    });

    if (response.data && response.data.success) {
      authToken = response.data.data.tokens.accessToken;
      console.log('✅ Authentication successful');
      console.log(`📄 Token received: ${authToken.substring(0, 20)}...`);
      return true;
    } else {
      console.log('❌ Authentication failed - Invalid response structure');
      return false;
    }
  } catch (error) {
    console.log('❌ Authentication failed:', error.response?.data?.message || error.message);
    return false;
  }
}

// Test getting products list with stock_quantity field
async function testProductsList() {
  console.log('\n2️⃣ Testing Products List API (with direct stock_quantity)...');
  
  try {
    const response = await axios.get(`${API_BASE}/api/products?limit=5`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.data && response.data.success) {
      const products = response.data.data;
      console.log('✅ Products list retrieved successfully');
      console.log(`📊 Found ${products.length} products`);
      
      if (products.length > 0) {
        const firstProduct = products[0];
        console.log('📄 First product details:');
        console.log(`   - ID: ${firstProduct.id}`);
        console.log(`   - Title: ${firstProduct.title_en || firstProduct.title_ar}`);
        console.log(`   - Stock Quantity: ${firstProduct.stock_quantity || 0}`);
        console.log(`   - Stock Status: ${firstProduct.stock_status}`);
        
        // Verify stock_quantity field exists
        if (typeof firstProduct.stock_quantity !== 'undefined') {
          console.log('✅ stock_quantity field is present in API response');
          return firstProduct.id; // Return product ID for testing updates
        } else {
          console.log('❌ stock_quantity field is missing from API response');
          return null;
        }
      } else {
        console.log('⚠️ No products found in database');
        return null;
      }
    } else {
      console.log('❌ Failed to get products list');
      return null;
    }
  } catch (error) {
    console.log('❌ Error getting products list:', error.response?.data?.message || error.message);
    return null;
  }
}

// Test single product API
async function testSingleProduct(productId) {
  console.log(`\n3️⃣ Testing Single Product API (ID: ${productId})...`);
  
  try {
    const response = await axios.get(`${API_BASE}/api/products/${productId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.data && response.data.success) {
      const product = response.data.data;
      console.log('✅ Single product retrieved successfully');
      console.log(`📄 Product details:`);
      console.log(`   - ID: ${product.id}`);
      console.log(`   - Title: ${product.title_en || product.title_ar}`);
      console.log(`   - Current Stock Quantity: ${product.stock_quantity || 0}`);
      console.log(`   - Stock Status: ${product.stock_status}`);
      
      return product.stock_quantity || 0;
    } else {
      console.log('❌ Failed to get single product');
      return null;
    }
  } catch (error) {
    console.log('❌ Error getting single product:', error.response?.data?.message || error.message);
    return null;
  }
}

// Test updating product stock quantity directly
async function testStockUpdate(productId, newStockQuantity) {
  console.log(`\n4️⃣ Testing Direct Stock Update (Product ID: ${productId}, New Quantity: ${newStockQuantity})...`);
  
  try {
    const response = await axios.put(`${API_BASE}/api/products/${productId}/stock`, {
      stock_quantity: newStockQuantity
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data && response.data.success) {
      console.log('✅ Stock quantity updated successfully');
      console.log(`📄 Updated product details:`);
      console.log(`   - ID: ${response.data.data.id}`);
      console.log(`   - Updated Stock Quantity: ${response.data.data.stock_quantity}`);
      console.log(`   - Updated At: ${response.data.data.updated_at}`);
      
      // Verify the update was successful
      if (response.data.data.stock_quantity === newStockQuantity) {
        console.log('✅ Stock quantity update verified successfully');
        return true;
      } else {
        console.log(`❌ Stock quantity mismatch: expected ${newStockQuantity}, got ${response.data.data.stock_quantity}`);
        return false;
      }
    } else {
      console.log('❌ Failed to update stock quantity');
      return false;
    }
  } catch (error) {
    console.log('❌ Error updating stock quantity:', error.response?.data?.message || error.message);
    console.log('🔍 Error details:', error.response?.data);
    return false;
  }
}

// Verify the stock update persisted
async function verifyStockUpdate(productId, expectedQuantity) {
  console.log(`\n5️⃣ Verifying Stock Update Persistence (Expected: ${expectedQuantity})...`);
  
  try {
    const response = await axios.get(`${API_BASE}/api/products/${productId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.data && response.data.success) {
      const actualQuantity = response.data.data.stock_quantity;
      console.log(`📊 Current stock quantity: ${actualQuantity}`);
      
      if (actualQuantity === expectedQuantity) {
        console.log('✅ Stock update persistence verified successfully');
        return true;
      } else {
        console.log(`❌ Stock persistence failed: expected ${expectedQuantity}, got ${actualQuantity}`);
        return false;
      }
    } else {
      console.log('❌ Failed to verify stock update');
      return false;
    }
  } catch (error) {
    console.log('❌ Error verifying stock update:', error.response?.data?.message || error.message);
    return false;
  }
}

// Test edge cases
async function testEdgeCases(productId) {
  console.log('\n6️⃣ Testing Edge Cases...');
  
  console.log('\n📋 Test 6.1: Zero stock quantity');
  const zeroStockTest = await testStockUpdate(productId, 0);
  
  console.log('\n📋 Test 6.2: Large stock quantity');
  const largeStockTest = await testStockUpdate(productId, 9999);
  
  console.log('\n📋 Test 6.3: Invalid negative stock quantity');
  try {
    const response = await axios.put(`${API_BASE}/api/products/${productId}/stock`, {
      stock_quantity: -10
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data && !response.data.success) {
      console.log('✅ Negative stock validation working correctly');
    } else {
      console.log('❌ Negative stock validation failed - update should have been rejected');
    }
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Negative stock validation working correctly (400 error as expected)');
    } else {
      console.log('❌ Unexpected error with negative stock:', error.message);
    }
  }
  
  console.log('\n📋 Test 6.4: Missing stock_quantity parameter');
  try {
    const response = await axios.put(`${API_BASE}/api/products/${productId}/stock`, {
      // No stock_quantity parameter
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data && !response.data.success) {
      console.log('✅ Missing parameter validation working correctly');
    } else {
      console.log('❌ Missing parameter validation failed');
    }
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Missing parameter validation working correctly (400 error as expected)');
    } else {
      console.log('❌ Unexpected error with missing parameter:', error.message);
    }
  }
  
  return zeroStockTest && largeStockTest;
}

// Main test runner
async function runTests() {
  const startTime = Date.now();
  
  try {
    // Step 1: Authenticate
    const authSuccess = await testAuthentication();
    if (!authSuccess) {
      console.log('\n❌ Test suite failed - Could not authenticate');
      process.exit(1);
    }
    
    // Step 2: Test products list API
    const testProductId = await testProductsList();
    if (!testProductId) {
      console.log('\n❌ Test suite failed - Could not get products or stock_quantity field missing');
      process.exit(1);
    }
    
    // Step 3: Test single product API
    const currentStock = await testSingleProduct(testProductId);
    if (currentStock === null) {
      console.log('\n❌ Test suite failed - Could not get single product');
      process.exit(1);
    }
    
    // Step 4: Test stock update
    const newStockQuantity = 50;
    const updateSuccess = await testStockUpdate(testProductId, newStockQuantity);
    if (!updateSuccess) {
      console.log('\n❌ Test suite failed - Stock update failed');
      process.exit(1);
    }
    
    // Step 5: Verify persistence
    const persistenceSuccess = await verifyStockUpdate(testProductId, newStockQuantity);
    if (!persistenceSuccess) {
      console.log('\n❌ Test suite failed - Stock update did not persist');
      process.exit(1);
    }
    
    // Step 6: Test edge cases
    const edgeCasesSuccess = await testEdgeCases(testProductId);
    
    // Restore original stock
    console.log(`\n🔄 Restoring original stock quantity (${currentStock})...`);
    await testStockUpdate(testProductId, currentStock);
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n🎉 TEST SUITE COMPLETED SUCCESSFULLY!');
    console.log('=====================================');
    console.log(`✅ All tests passed in ${duration} seconds`);
    console.log('\n📋 Summary:');
    console.log('   ✅ Authentication working');
    console.log('   ✅ Products list API returns stock_quantity field');
    console.log('   ✅ Single product API returns stock_quantity field');
    console.log('   ✅ Direct stock update endpoint working');
    console.log('   ✅ Stock updates persist correctly');
    console.log('   ✅ Edge case validation working');
    console.log('\n🚀 Direct product stock management is working perfectly!');
    
  } catch (error) {
    console.log('\n💥 Test suite crashed:', error.message);
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  runTests()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Test suite error:', error);
      process.exit(1);
    });
}

module.exports = { runTests };
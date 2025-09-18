const axios = require('axios');

const API_BASE_URL = 'http://localhost:3015/api';

// Test configuration
const TEST_CONFIG = {
  adminCredentials: {
    email: 'admin@fecs.com',
    password: 'admin123'
  },
  testProductId: null, // Will be set dynamically
  testBranchId: null   // Will be set dynamically
};

let adminToken = null;

// Helper function to make authenticated requests
const apiRequest = async (method, url, data = null) => {
  const config = {
    method,
    url: `${API_BASE_URL}${url}`,
    headers: adminToken ? { 'Authorization': `Bearer ${adminToken}` } : {},
    data
  };
  
  // Debug auth header
  if (adminToken && url.includes('/branches')) {
    console.log(`🔐 Using auth token for ${method} ${url}: ${adminToken ? 'Present' : 'Missing'}`);
  }

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`API Error (${method} ${url}):`, error.response?.data || error.message);
    throw error;
  }
};

// Test functions
const loginAsAdmin = async () => {
  console.log('🔐 Logging in as admin...');
  try {
    const response = await apiRequest('POST', '/auth/login', TEST_CONFIG.adminCredentials);
    adminToken = response.token;
    console.log('✅ Admin login successful');
    return true;
  } catch (error) {
    console.error('❌ Admin login failed:', error.message);
    return false;
  }
};

const testGetProducts = async () => {
  console.log('\n📦 Testing products list with stock quantities...');
  try {
    const response = await apiRequest('GET', '/products?include_inactive=true&limit=5');
    
    if (response.success && response.data.length > 0) {
      console.log('✅ Products list retrieved successfully');
      console.log(`📊 Found ${response.data.length} products`);
      
      // Display stock information for each product
      response.data.forEach((product, index) => {
        console.log(`  ${index + 1}. ${product.title_en || product.name}`);
        console.log(`     ID: ${product.id}, Stock: ${product.stock_quantity || 0}, Min Level: ${product.min_stock_level || 0}`);
        
        // Set test product ID from first product
        if (index === 0) {
          TEST_CONFIG.testProductId = product.id;
        }
      });
      
      return true;
    } else {
      console.error('❌ No products found or invalid response');
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to get products list');
    return false;
  }
};

const testGetSingleProduct = async () => {
  if (!TEST_CONFIG.testProductId) {
    console.log('⚠️  Skipping single product test - no test product ID available');
    return false;
  }

  console.log(`\n🔍 Testing single product details (ID: ${TEST_CONFIG.testProductId})...`);
  try {
    const response = await apiRequest('GET', `/products/${TEST_CONFIG.testProductId}`);
    
    if (response.success && response.data) {
      const product = response.data;
      console.log('✅ Single product retrieved successfully');
      console.log(`📊 Product: ${product.title_en || product.name}`);
      console.log(`📊 Stock Quantity: ${product.stock_quantity || 0}`);
      console.log(`📊 Min Stock Level: ${product.min_stock_level || 0}`);
      console.log(`📊 Stock Status: ${product.stock_status}`);
      return true;
    } else {
      console.error('❌ Invalid single product response');
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to get single product');
    return false;
  }
};

const testGetBranches = async () => {
  console.log('\n🏢 Testing branches list...');
  try {
    const response = await apiRequest('GET', '/branches');
    
    if (response.success && response.data.length > 0) {
      console.log('✅ Branches list retrieved successfully');
      console.log(`📊 Found ${response.data.length} branches`);
      
      // Display branch information
      response.data.forEach((branch, index) => {
        console.log(`  ${index + 1}. ${branch.title_en || branch.title_ar || 'Unnamed'} - ID: ${branch.id}, Active: ${branch.is_active}`);
        
        // Set test branch ID from first active branch
        if (index === 0 && branch.is_active) {
          TEST_CONFIG.testBranchId = branch.id;
        }
      });
      
      return true;
    } else {
      console.error('❌ No branches found or invalid response');
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to get branches list');
    return false;
  }
};

const testGetProductBranches = async () => {
  if (!TEST_CONFIG.testProductId) {
    console.log('⚠️  Skipping product branches test - no test product ID available');
    return false;
  }

  console.log(`\n🏪 Testing product branch inventory (Product ID: ${TEST_CONFIG.testProductId})...`);
  try {
    const response = await apiRequest('GET', `/products/${TEST_CONFIG.testProductId}/branches`);
    
    if (response.success) {
      console.log('✅ Product branch inventory retrieved successfully');
      console.log(`📊 Found ${response.data.length} branch assignments`);
      
      // Display branch inventory information
      response.data.forEach((branchInventory, index) => {
        console.log(`  ${index + 1}. Branch: ${branchInventory.branch_name}`);
        console.log(`     Stock: ${branchInventory.stock_quantity || 0}, Min Level: ${branchInventory.min_stock_level || 0}`);
        console.log(`     Available: ${branchInventory.is_available ? 'Yes' : 'No'}, Price Override: ${branchInventory.price_override || 'None'}`);
      });
      
      return true;
    } else {
      console.error('❌ Invalid product branches response');
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to get product branches');
    return false;
  }
};

const testUpdateBranchStock = async () => {
  if (!TEST_CONFIG.testProductId || !TEST_CONFIG.testBranchId) {
    console.log('⚠️  Skipping stock update test - missing product or branch ID');
    return false;
  }

  console.log(`\n📝 Testing stock quantity update...`);
  console.log(`   Product ID: ${TEST_CONFIG.testProductId}, Branch ID: ${TEST_CONFIG.testBranchId}`);
  
  try {
    // First, get current stock level
    const currentResponse = await apiRequest('GET', `/products/${TEST_CONFIG.testProductId}/branches`);
    const currentBranchInfo = currentResponse.data.find(b => b.branch_id == TEST_CONFIG.testBranchId);
    const currentStock = currentBranchInfo ? currentBranchInfo.stock_quantity : 0;
    
    console.log(`📊 Current stock level: ${currentStock}`);
    
    // Test updating stock quantity
    const newStockQuantity = currentStock + 10; // Add 10 to current stock
    console.log(`📊 Updating stock to: ${newStockQuantity}`);
    
    const updateResponse = await apiRequest('PUT', `/products/${TEST_CONFIG.testProductId}/branches/${TEST_CONFIG.testBranchId}`, {
      stock_quantity: newStockQuantity
    });
    
    if (updateResponse.success) {
      console.log('✅ Stock quantity updated successfully');
      
      // Verify the update by checking the product again
      console.log('🔍 Verifying stock update...');
      const verifyResponse = await apiRequest('GET', `/products/${TEST_CONFIG.testProductId}`);
      
      if (verifyResponse.success) {
        const updatedStock = verifyResponse.data.stock_quantity;
        console.log(`📊 Verified stock level: ${updatedStock}`);
        
        if (updatedStock >= newStockQuantity) {
          console.log('✅ Stock update verification successful');
          return true;
        } else {
          console.error(`❌ Stock update verification failed - expected >= ${newStockQuantity}, got ${updatedStock}`);
          return false;
        }
      } else {
        console.error('❌ Failed to verify stock update');
        return false;
      }
    } else {
      console.error('❌ Stock update failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Stock update test failed');
    return false;
  }
};

// Main test runner
const runStockQuantityTests = async () => {
  console.log('🧪 Starting Stock Quantity API Tests...\n');
  
  const results = {
    login: false,
    productsList: false,
    singleProduct: false,
    branches: false,
    productBranches: false,
    stockUpdate: false
  };

  // Run tests sequentially
  results.login = await loginAsAdmin();
  if (!results.login) {
    console.log('\n❌ Aborting tests due to login failure');
    return;
  }

  results.productsList = await testGetProducts();
  results.singleProduct = await testGetSingleProduct();
  results.branches = await testGetBranches();
  results.productBranches = await testGetProductBranches();
  results.stockUpdate = await testUpdateBranchStock();

  // Print summary
  console.log('\n📋 Test Results Summary:');
  console.log('========================');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });

  const passedCount = Object.values(results).filter(r => r).length;
  const totalCount = Object.keys(results).length;
  
  console.log(`\n🎯 Overall: ${passedCount}/${totalCount} tests passed`);
  
  if (passedCount === totalCount) {
    console.log('🎉 All tests passed! Stock quantity functionality is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the backend implementation.');
  }
};

// Run the tests
runStockQuantityTests().catch(error => {
  console.error('❌ Test runner failed:', error.message);
  process.exit(1);
});
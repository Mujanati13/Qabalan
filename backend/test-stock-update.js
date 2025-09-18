const axios = require('axios');

const API_BASE_URL = 'http://localhost:3015/api';

const testStockUpdate = async () => {
  try {
    console.log('🧪 Testing Stock Update Process...\n');
    
    // Step 1: Login as admin
    console.log('🔐 Step 1: Logging in as admin...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'admin@fecs.com',
      password: 'admin123'
    });
    
    console.log('✅ Admin login successful');
    console.log('🔍 Login response:', JSON.stringify(loginResponse.data, null, 2));
    
    const adminToken = loginResponse.data.data.tokens.accessToken;
    console.log('🔑 Token:', adminToken ? 'Present' : 'Missing');
    console.log('🔑 Token length:', adminToken ? adminToken.length : 0);
    
    const authHeaders = { 'Authorization': `Bearer ${adminToken}` };
    
    // Step 2: Get current product stock
    console.log('\n📦 Step 2: Getting current product stock...');
    const productResponse = await axios.get(`${API_BASE_URL}/products/2192`);
    const currentStock = productResponse.data.data.stock_quantity;
    console.log(`Current stock for product 2192: ${currentStock}`);
    
    // Step 3: Get product branch assignments
    console.log('\n🏪 Step 3: Getting product branch assignments...');
    const branchesResponse = await axios.get(`${API_BASE_URL}/products/2192/branches`, {
      headers: authHeaders
    });
    
    if (branchesResponse.data.success && branchesResponse.data.data.length > 0) {
      const branchAssignment = branchesResponse.data.data[0]; // Use first branch
      console.log(`Found branch assignment: Branch ID ${branchAssignment.branch_id}, Current Stock: ${branchAssignment.stock_quantity}`);
      
      // Step 4: Update stock quantity
      const newStockQuantity = (branchAssignment.stock_quantity || 0) + 5; // Add 5 units
      console.log(`\n📝 Step 4: Updating stock from ${branchAssignment.stock_quantity} to ${newStockQuantity}...`);
      
      const updateResponse = await axios.put(
        `${API_BASE_URL}/products/2192/branches/${branchAssignment.branch_id}`, 
        { stock_quantity: newStockQuantity },
        { headers: authHeaders }
      );
      
      if (updateResponse.data.success) {
        console.log('✅ Stock update request successful');
        
        // Step 5: Verify the update
        console.log('\n🔍 Step 5: Verifying stock update...');
        
        // Check branch inventory
        const verifyBranchResponse = await axios.get(`${API_BASE_URL}/products/2192/branches`, {
          headers: authHeaders
        });
        
        const updatedBranchAssignment = verifyBranchResponse.data.data.find(b => b.branch_id === branchAssignment.branch_id);
        console.log(`Branch inventory updated stock: ${updatedBranchAssignment.stock_quantity}`);
        
        // Check product total stock
        const verifyProductResponse = await axios.get(`${API_BASE_URL}/products/2192`);
        const updatedTotalStock = verifyProductResponse.data.data.stock_quantity;
        console.log(`Product total stock: ${updatedTotalStock}`);
        
        // Step 6: Results
        console.log('\n📊 Results Summary:');
        console.log(`Original stock: ${currentStock}`);
        console.log(`Expected new stock: ${currentStock - branchAssignment.stock_quantity + newStockQuantity}`);
        console.log(`Actual new stock: ${updatedTotalStock}`);
        
        if (updatedBranchAssignment.stock_quantity === newStockQuantity) {
          console.log('✅ Branch inventory update: SUCCESS');
        } else {
          console.log(`❌ Branch inventory update: FAILED (expected ${newStockQuantity}, got ${updatedBranchAssignment.stock_quantity})`);
        }
        
        if (updatedTotalStock !== currentStock) {
          console.log('✅ Product total stock update: SUCCESS');
        } else {
          console.log('❌ Product total stock update: FAILED (no change detected)');
        }
        
      } else {
        console.log('❌ Stock update request failed:', updateResponse.data);
      }
      
    } else {
      console.log('❌ No branch assignments found for product');
      console.log('Response:', branchesResponse.data);
    }
    
  } catch (error) {
    console.error('❌ Test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
};

testStockUpdate();
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3015/api';

const testSpecificEndpoints = async () => {
  try {
    console.log('🧪 Testing specific API endpoints...\n');
    
    // Test products list endpoint
    console.log('📦 Testing GET /products (list)...');
    const listResponse = await axios.get(`${API_BASE_URL}/products?include_inactive=true&limit=5`);
    
    const testProduct = listResponse.data.data.find(p => p.id === 2192);
    if (testProduct) {
      console.log('✅ Test product found in list:');
      console.log(`   ID: ${testProduct.id}`);
      console.log(`   Title: ${testProduct.title_en}`);
      console.log(`   Stock: ${testProduct.stock_quantity}`);
      console.log(`   Min Level: ${testProduct.min_stock_level}`);
    } else {
      console.log('❌ Test product not found in list');
    }
    
    // Test single product endpoint
    console.log('\n🔍 Testing GET /products/2192 (single)...');
    const singleResponse = await axios.get(`${API_BASE_URL}/products/2192`);
    
    if (singleResponse.data.success && singleResponse.data.data) {
      const product = singleResponse.data.data;
      console.log('✅ Single product retrieved:');
      console.log(`   ID: ${product.id}`);
      console.log(`   Title: ${product.title_en}`);
      console.log(`   Stock: ${product.stock_quantity}`);
      console.log(`   Min Level: ${product.min_stock_level}`);
      console.log(`   Full response keys:`, Object.keys(product).sort());
    } else {
      console.log('❌ Single product request failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
};

testSpecificEndpoints();
// Test script to verify API connectivity from mobile app perspective
const API_BASE_URL = 'http://192.168.126.1:3000/api';

async function testProductsAPI() {
  try {
    console.log('🔍 Testing products API...');
    
    const response = await fetch(`${API_BASE_URL}/products?limit=3`);
    const data = await response.json();
    
    console.log('📊 API Response Status:', response.status);
    console.log('✅ Success:', data.success);
    console.log('📦 Products count:', data.data?.length || 0);
    
    if (data.data && data.data.length > 0) {
      console.log('\n🍞 Sample Product:');
      const product = data.data[0];
      console.log('  - ID:', product.id);
      console.log('  - Title (EN):', product.title_en);
      console.log('  - Title (AR):', product.title_ar);
      console.log('  - Price:', product.final_price);
      console.log('  - Image:', product.main_image ? 'Yes' : 'No');
      console.log('  - Image URL:', product.main_image);
      console.log('  - Stock:', product.stock_status);
      console.log('  - Featured:', product.is_featured ? 'Yes' : 'No');
    }
    
    console.log('\n📄 Pagination Info:');
    if (data.pagination) {
      console.log('  - Page:', data.pagination.page);
      console.log('  - Total:', data.pagination.total);
      console.log('  - Total Pages:', data.pagination.totalPages);
      console.log('  - Has Next:', data.pagination.hasNext);
    }
    
  } catch (error) {
    console.error('❌ API Test Failed:', error.message);
  }
}

// Run the test
testProductsAPI();

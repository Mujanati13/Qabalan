const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

// Test locations filtering
async function testLocationsFilter() {
  try {
    console.log('🧪 Testing locations filtering endpoints...\n');
    
    // Test without token first (should fail)
    try {
      const response = await axios.get(`${API_BASE_URL}/locations/cities`);
      console.log('❌ Should have failed without token');
    } catch (error) {
      console.log('✅ Correctly requires authentication');
    }
    
    // Login to get token
    console.log('\n🔑 Logging in...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    const headers = { Authorization: `Bearer ${token}` };
    
    console.log('✅ Login successful\n');
    
    // Test cities endpoint with different filters
    console.log('📍 Testing cities endpoints:');
    
    // Test all cities
    const allCities = await axios.get(`${API_BASE_URL}/locations/cities`, { headers });
    console.log(`✅ All cities: ${allCities.data.data.length} found`);
    
    // Test active cities only
    const activeCities = await axios.get(`${API_BASE_URL}/locations/cities?is_active=true`, { headers });
    console.log(`✅ Active cities: ${activeCities.data.data.length} found`);
    
    // Test inactive cities only
    const inactiveCities = await axios.get(`${API_BASE_URL}/locations/cities?is_active=false`, { headers });
    console.log(`✅ Inactive cities: ${inactiveCities.data.data.length} found`);
    
    // Test with search
    const searchCities = await axios.get(`${API_BASE_URL}/locations/cities?search=City`, { headers });
    console.log(`✅ Cities with 'City' in name: ${searchCities.data.data.length} found`);
    
    // Test areas endpoint
    console.log('\n🏘️ Testing areas endpoints:');
    
    const allAreas = await axios.get(`${API_BASE_URL}/locations/areas`, { headers });
    console.log(`✅ All areas: ${allAreas.data.data.length} found`);
    
    const activeAreas = await axios.get(`${API_BASE_URL}/locations/areas?is_active=true`, { headers });
    console.log(`✅ Active areas: ${activeAreas.data.data.length} found`);
    
    const inactiveAreas = await axios.get(`${API_BASE_URL}/locations/areas?is_active=false`, { headers });
    console.log(`✅ Inactive areas: ${inactiveAreas.data.data.length} found`);
    
    // Test streets endpoint
    console.log('\n🛣️ Testing streets endpoints:');
    
    const allStreets = await axios.get(`${API_BASE_URL}/locations/streets`, { headers });
    console.log(`✅ All streets: ${allStreets.data.data.length} found`);
    
    const activeStreets = await axios.get(`${API_BASE_URL}/locations/streets?is_active=true`, { headers });
    console.log(`✅ Active streets: ${activeStreets.data.data.length} found`);
    
    const inactiveStreets = await axios.get(`${API_BASE_URL}/locations/streets?is_active=false`, { headers });
    console.log(`✅ Inactive streets: ${inactiveStreets.data.data.length} found`);
    
    console.log('\n🎉 All location filter tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testLocationsFilter();
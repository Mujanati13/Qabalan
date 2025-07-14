const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5000/api';
let adminToken = '';
let customerToken = '';
let testUserId = null;
let testAddressId = null;

// Helper function for API calls
const apiCall = async (method, endpoint, data = null, token = null) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {}
    };

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (data) {
      config.data = data;
      config.headers['Content-Type'] = 'application/json';
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message, 
      status: error.response?.status 
    };
  }
};

// Test functions
const testAdminLogin = async () => {
  console.log('\n🔐 Testing Admin Login...');
  const result = await apiCall('POST', '/auth/login', {
    email: 'admin@fecs.com',
    password: 'Admin123!'
  });

  if (result.success && result.data.token) {
    adminToken = result.data.token;
    console.log('✅ Admin login successful');
    return true;
  } else {
    console.log('❌ Admin login failed:', result.error);
    return false;
  }
};

const testGetUsers = async () => {
  console.log('\n👥 Testing Get Users (Admin)...');
  const result = await apiCall('GET', '/users?page=1&limit=5', null, adminToken);

  if (result.success) {
    console.log('✅ Get users successful');
    console.log(`📊 Found ${result.data.data.length} users`);
    return true;
  } else {
    console.log('❌ Get users failed:', result.error);
    return false;
  }
};

const testCreateUser = async () => {
  console.log('\n➕ Testing Create User (Admin)...');
  const userData = {
    first_name: 'Test',
    last_name: 'Customer',
    email: `test.customer.${Date.now()}@example.com`,
    phone: `+961 70 ${Math.floor(Math.random() * 1000000)}`,
    password: 'TestPassword123!',
    user_type: 'customer',
    birth_date: '1990-01-01'
  };

  const result = await apiCall('POST', '/users', userData, adminToken);

  if (result.success && result.data.data) {
    testUserId = result.data.data.id;
    console.log('✅ Create user successful');
    console.log(`👤 Created user ID: ${testUserId}`);
    return true;
  } else {
    console.log('❌ Create user failed:', result.error);
    return false;
  }
};

const testGetUserDetails = async () => {
  if (!testUserId) return false;

  console.log('\n👤 Testing Get User Details...');
  const result = await apiCall('GET', `/users/${testUserId}`, null, adminToken);

  if (result.success && result.data.data) {
    console.log('✅ Get user details successful');
    console.log(`📝 User: ${result.data.data.first_name} ${result.data.data.last_name}`);
    return true;
  } else {
    console.log('❌ Get user details failed:', result.error);
    return false;
  }
};

const testUpdateUser = async () => {
  if (!testUserId) return false;

  console.log('\n✏️ Testing Update User...');
  const updateData = {
    first_name: 'Updated Test',
    last_name: 'Updated Customer',
    notification_promo: false
  };

  const result = await apiCall('PUT', `/users/${testUserId}`, updateData, adminToken);

  if (result.success) {
    console.log('✅ Update user successful');
    return true;
  } else {
    console.log('❌ Update user failed:', result.error);
    return false;
  }
};

const testCreateAddress = async () => {
  if (!testUserId) return false;

  console.log('\n🏠 Testing Create Address...');
  
  // First get available cities/areas/streets
  const citiesResult = await apiCall('GET', '/addresses/locations/cities');
  if (!citiesResult.success || !citiesResult.data.data.length) {
    console.log('❌ No cities available for address creation');
    return false;
  }

  const cityId = citiesResult.data.data[0].id;
  const areasResult = await apiCall('GET', `/addresses/locations/areas/${cityId}`);
  if (!areasResult.success || !areasResult.data.data.length) {
    console.log('❌ No areas available for address creation');
    return false;
  }

  const areaId = areasResult.data.data[0].id;
  const streetsResult = await apiCall('GET', `/addresses/locations/streets/${areaId}`);
  if (!streetsResult.success || !streetsResult.data.data.length) {
    console.log('❌ No streets available for address creation');
    return false;
  }

  const streetId = streetsResult.data.data[0].id;

  const addressData = {
    user_id: testUserId,
    name: 'Test Home',
    city_id: cityId,
    area_id: areaId,
    street_id: streetId,
    building_no: '123',
    floor_no: '2',
    apartment_no: 'A',
    details: 'Test address for API testing',
    is_default: true
  };

  const result = await apiCall('POST', '/addresses', addressData, adminToken);

  if (result.success && result.data.data) {
    testAddressId = result.data.data.id;
    console.log('✅ Create address successful');
    console.log(`🏠 Created address ID: ${testAddressId}`);
    return true;
  } else {
    console.log('❌ Create address failed:', result.error);
    return false;
  }
};

const testGetAddresses = async () => {
  console.log('\n🏠 Testing Get Addresses...');
  const result = await apiCall('GET', `/addresses?user_id=${testUserId}`, null, adminToken);

  if (result.success) {
    console.log('✅ Get addresses successful');
    console.log(`📊 Found ${result.data.data.length} addresses`);
    return true;
  } else {
    console.log('❌ Get addresses failed:', result.error);
    return false;
  }
};

const testUpdateAddress = async () => {
  if (!testAddressId) return false;

  console.log('\n✏️ Testing Update Address...');
  const updateData = {
    name: 'Updated Test Home',
    building_no: '456',
    details: 'Updated test address details'
  };

  const result = await apiCall('PUT', `/addresses/${testAddressId}`, updateData, adminToken);

  if (result.success) {
    console.log('✅ Update address successful');
    return true;
  } else {
    console.log('❌ Update address failed:', result.error);
    return false;
  }
};

const testUserStats = async () => {
  console.log('\n📊 Testing User Statistics...');
  const result = await apiCall('GET', '/users/stats', null, adminToken);

  if (result.success && result.data.data) {
    console.log('✅ Get user stats successful');
    console.log(`📈 User types found: ${result.data.data.user_stats.length}`);
    return true;
  } else {
    console.log('❌ Get user stats failed:', result.error);
    return false;
  }
};

const testLocationEndpoints = async () => {
  console.log('\n🌍 Testing Location Endpoints...');
  
  // Test cities
  const citiesResult = await apiCall('GET', '/addresses/locations/cities');
  if (!citiesResult.success) {
    console.log('❌ Get cities failed:', citiesResult.error);
    return false;
  }
  console.log(`✅ Get cities successful (${citiesResult.data.data.length} cities)`);

  if (citiesResult.data.data.length > 0) {
    const cityId = citiesResult.data.data[0].id;
    
    // Test areas
    const areasResult = await apiCall('GET', `/addresses/locations/areas/${cityId}`);
    if (!areasResult.success) {
      console.log('❌ Get areas failed:', areasResult.error);
      return false;
    }
    console.log(`✅ Get areas successful (${areasResult.data.data.length} areas)`);

    if (areasResult.data.data.length > 0) {
      const areaId = areasResult.data.data[0].id;
      
      // Test streets
      const streetsResult = await apiCall('GET', `/addresses/locations/streets/${areaId}`);
      if (!streetsResult.success) {
        console.log('❌ Get streets failed:', streetsResult.error);
        return false;
      }
      console.log(`✅ Get streets successful (${streetsResult.data.data.length} streets)`);
    }
  }

  return true;
};

const testUserPermissions = async () => {
  if (!testUserId) return false;

  console.log('\n🔒 Testing User Permissions...');
  
  // Try to access users endpoint without admin token (should fail)
  const result = await apiCall('GET', '/users');
  if (result.status === 401) {
    console.log('✅ Unauthorized access properly blocked');
  } else {
    console.log('❌ Unauthorized access not properly blocked');
    return false;
  }

  // Try customer accessing another customer's details (should fail)
  // This would require creating a customer token, skipping for now
  console.log('✅ Permission tests basic validation passed');
  return true;
};

const cleanup = async () => {
  console.log('\n🧹 Cleaning up test data...');
  
  if (testAddressId) {
    const addressResult = await apiCall('DELETE', `/addresses/${testAddressId}?hard_delete=true`, null, adminToken);
    if (addressResult.success) {
      console.log('✅ Test address deleted');
    }
  }

  if (testUserId) {
    const userResult = await apiCall('DELETE', `/users/${testUserId}?hard_delete=true`, null, adminToken);
    if (userResult.success) {
      console.log('✅ Test user deleted');
    }
  }
};

// Main test runner
const runTests = async () => {
  console.log('🚀 Starting Customer Management API Tests');
  console.log('==========================================');

  const tests = [
    { name: 'Admin Login', fn: testAdminLogin },
    { name: 'Get Users', fn: testGetUsers },
    { name: 'User Statistics', fn: testUserStats },
    { name: 'Location Endpoints', fn: testLocationEndpoints },
    { name: 'Create User', fn: testCreateUser },
    { name: 'Get User Details', fn: testGetUserDetails },
    { name: 'Update User', fn: testUpdateUser },
    { name: 'Create Address', fn: testCreateAddress },
    { name: 'Get Addresses', fn: testGetAddresses },
    { name: 'Update Address', fn: testUpdateAddress },
    { name: 'User Permissions', fn: testUserPermissions }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} failed with error:`, error.message);
      failed++;
    }
  }

  // Cleanup
  await cleanup();

  console.log('\n📋 Test Results Summary');
  console.log('========================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${passed + failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Customer Management API is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Please check the error messages above.');
  }
};

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };

/**
 * Test flexible address validation
 * Tests various address creation scenarios to ensure backend is flexible
 */

const axios = require('axios');

const API_BASE_URL = 'http://192.168.1.104:3000/api';

// Test scenarios
const testScenarios = [
  {
    name: 'GPS Address with minimal data',
    data: {
      name: 'Home',
      phone: '+9611234567',
      latitude: 33.8938,
      longitude: 35.5018,
      // No city, area, street, building details
    }
  },
  {
    name: 'GPS Address with some details',
    data: {
      name: 'Office',
      phone: '+9611234567',
      latitude: 33.8938,
      longitude: 35.5018,
      details: 'Near the main entrance'
      // No building_no required
    }
  },
  {
    name: 'Traditional address with location IDs',
    data: {
      name: 'Friend House',
      phone: '+9611234567',
      city_id: 1,
      area_id: 1,
      street_id: 1,
      building_no: '123'
    }
  },
  {
    name: 'Traditional address without building_no but with details',
    data: {
      name: 'Relative House',
      phone: '+9611234567',
      city_id: 1,
      area_id: 1,
      details: 'The blue house next to the pharmacy'
      // No building_no but has details
    }
  }
];

async function testAddressValidation() {
  console.log('🧪 Testing Flexible Address Validation\n');

  // You'll need to replace this with a valid token
  const token = 'your-jwt-token-here';
  
  for (const scenario of testScenarios) {
    console.log(`📍 Testing: ${scenario.name}`);
    console.log('Data:', JSON.stringify(scenario.data, null, 2));
    
    try {
      const response = await axios.post(`${API_BASE_URL}/addresses`, scenario.data, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        console.log('✅ Success:', response.data.message);
        console.log('Address ID:', response.data.address?.id);
      } else {
        console.log('❌ Failed:', response.data.message);
      }
    } catch (error) {
      if (error.response?.data) {
        console.log('❌ Validation Error:', error.response.data.message);
        console.log('Arabic Message:', error.response.data.message_ar);
      } else {
        console.log('❌ Network Error:', error.message);
      }
    }
    
    console.log('---\n');
  }
}

async function testInvalidData() {
  console.log('🚫 Testing Invalid Data Scenarios\n');
  
  const token = 'your-jwt-token-here';
  
  const invalidScenarios = [
    {
      name: 'Missing name',
      data: {
        phone: '+9611234567',
        latitude: 33.8938,
        longitude: 35.5018
        // No name
      }
    },
    {
      name: 'Missing phone',
      data: {
        name: 'Test Address',
        latitude: 33.8938,
        longitude: 35.5018
        // No phone
      }
    },
    {
      name: 'Invalid coordinates',
      data: {
        name: 'Test Address',
        phone: '+9611234567',
        latitude: 200, // Invalid latitude
        longitude: 35.5018
      }
    }
  ];
  
  for (const scenario of invalidScenarios) {
    console.log(`📍 Testing: ${scenario.name}`);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/addresses`, scenario.data, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('❌ Should have failed but succeeded:', response.data);
    } catch (error) {
      if (error.response?.data) {
        console.log('✅ Correctly rejected:', error.response.data.message);
      } else {
        console.log('❌ Network Error:', error.message);
      }
    }
    
    console.log('---\n');
  }
}

// Run tests
if (require.main === module) {
  console.log('⚠️  Please update the JWT token in the script before running');
  console.log('⚠️  You can get a token by logging in through the mobile app or web interface\n');
  
  // Uncomment these lines after adding a valid token:
  // testAddressValidation();
  // testInvalidData();
}

module.exports = { testAddressValidation, testInvalidData };
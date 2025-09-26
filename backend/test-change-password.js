/**
 * Test change password endpoint
 */

const axios = require('axios');

const API_BASE_URL = 'http://192.168.11.135:3015/api';

async function testChangePassword() {
  console.log('🔐 Testing Change Password Endpoint\n');

  // You'll need to replace this with a valid token
  const token = 'your-jwt-token-here';
  const userId = 'your-user-id-here';
  
  const testData = {
    current_password: 'OldPassword123',
    new_password: 'NewPassword123',
    confirm_password: 'NewPassword123'
  };
  
  try {
    console.log('📍 Testing endpoint:', `${API_BASE_URL}/users/${userId}/change-password`);
    console.log('📍 Request data:', testData);
    
    const response = await axios.put(`${API_BASE_URL}/users/${userId}/change-password`, testData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      console.log('✅ Success:', response.data.message);
    } else {
      console.log('❌ Failed:', response.data.message);
    }
  } catch (error) {
    if (error.response?.data) {
      console.log('❌ API Error:', error.response.status);
      console.log('Message:', error.response.data.message);
      console.log('Arabic Message:', error.response.data.message_ar);
      if (error.response.data.errors) {
        console.log('Validation Errors:', error.response.data.errors);
      }
    } else {
      console.log('❌ Network Error:', error.message);
    }
  }
}

// Test validation without token
async function testValidation() {
  console.log('\n🚫 Testing Validation Errors\n');
  
  try {
    const response = await axios.put(`${API_BASE_URL}/users/1/change-password`, {
      current_password: 'short',
      new_password: 'weak',
      confirm_password: 'different'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    if (error.response?.data) {
      console.log('Expected validation errors:', error.response.data);
    }
  }
}

// Run tests
if (require.main === module) {
  console.log('⚠️  Please update the JWT token and user ID in the script before running');
  console.log('⚠️  You can get a token by logging in through the mobile app\n');
  
  // Uncomment these lines after adding a valid token:
  // testChangePassword();
  // testValidation();
}

module.exports = { testChangePassword, testValidation };
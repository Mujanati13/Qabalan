const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

// Test support tickets date range filtering
async function testSupportDateFilter() {
  try {
    console.log('🧪 Testing support tickets date range filtering...\n');
    
    // Login to get token
    console.log('🔑 Logging in...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    const headers = { Authorization: `Bearer ${token}` };
    
    console.log('✅ Login successful\n');
    
    // Test 1: Get all tickets
    console.log('📋 Test 1: All tickets');
    const allTickets = await axios.get(`${API_BASE_URL}/support/admin/tickets`, { headers });
    console.log(`✅ All tickets: ${allTickets.data.data.length} found`);
    
    // Test 2: Get tickets with date_from filter (last week)
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const dateFrom = lastWeek.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    console.log(`\n📋 Test 2: Tickets from ${dateFrom}`);
    const fromDateTickets = await axios.get(`${API_BASE_URL}/support/admin/tickets?date_from=${dateFrom}`, { headers });
    console.log(`✅ Tickets from ${dateFrom}: ${fromDateTickets.data.data.length} found`);
    
    // Test 3: Get tickets with date range (last 3 days)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const today = new Date();
    const dateFromRange = threeDaysAgo.toISOString().split('T')[0];
    const dateToRange = today.toISOString().split('T')[0];
    
    console.log(`\n📋 Test 3: Tickets from ${dateFromRange} to ${dateToRange}`);
    const rangeTickets = await axios.get(`${API_BASE_URL}/support/admin/tickets?date_from=${dateFromRange}&date_to=${dateToRange}`, { headers });
    console.log(`✅ Tickets in range: ${rangeTickets.data.data.length} found`);
    
    // Test 4: Get tickets for today only
    const todayStr = today.toISOString().split('T')[0];
    console.log(`\n📋 Test 4: Tickets for today (${todayStr})`);
    const todayTickets = await axios.get(`${API_BASE_URL}/support/admin/tickets?date_from=${todayStr}&date_to=${todayStr}`, { headers });
    console.log(`✅ Today's tickets: ${todayTickets.data.data.length} found`);
    
    console.log('\n🎉 All support date filter tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testSupportDateFilter();
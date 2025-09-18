const { executeQuery } = require('./config/database');

// Check support tickets data
async function checkSupportData() {
  try {
    console.log('🔍 Checking support tickets data...\n');
    
    // Check if support_tickets table exists and has data
    const tickets = await executeQuery('SELECT COUNT(*) as count FROM support_tickets');
    console.log('✅ Total support tickets:', tickets[0].count);
    
    // Check recent tickets with dates
    const recentTickets = await executeQuery(`
      SELECT 
        id, 
        ticket_number, 
        created_at,
        DATE(created_at) as date_only
      FROM support_tickets 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log('\n📋 Recent tickets:');
    recentTickets.forEach((ticket, index) => {
      console.log(`${index + 1}. #${ticket.ticket_number} - ${ticket.created_at} (${ticket.date_only})`);
    });
    
    // Test date filtering query directly
    const today = new Date().toISOString().split('T')[0];
    console.log(`\n🗓️ Testing date filter for today: ${today}`);
    
    const todayTickets = await executeQuery(`
      SELECT COUNT(*) as count 
      FROM support_tickets 
      WHERE DATE(created_at) = ?
    `, [today]);
    
    console.log(`✅ Tickets for today: ${todayTickets[0].count}`);
    
    // Test date range query
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const dateFrom = threeDaysAgo.toISOString().split('T')[0];
    
    console.log(`\n📅 Testing date range from ${dateFrom} to ${today}`);
    
    const rangeTickets = await executeQuery(`
      SELECT COUNT(*) as count 
      FROM support_tickets 
      WHERE DATE(created_at) BETWEEN ? AND ?
    `, [dateFrom, today]);
    
    console.log(`✅ Tickets in range: ${rangeTickets[0].count}`);
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  }
}

checkSupportData();
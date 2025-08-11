console.log('🧪 Testing notification system...');

// Test if FCM service is properly initialized
const fcmService = require('./services/fcmService');
const notificationService = require('./services/notificationService');

async function testNotificationSystem() {
  console.log('\n=== FCM Service Test ===');
  console.log('FCM Service initialized:', fcmService.isInitialized);
  
  console.log('\n=== Database Connection Test ===');
  try {
    const { executeQuery } = require('./config/database');
    
    // Check if we have any FCM tokens
    const tokens = await executeQuery('SELECT COUNT(*) as count FROM user_fcm_tokens WHERE is_active = 1');
    console.log('Active FCM tokens in database:', tokens[0].count);
    
    // Check recent support tickets
    const tickets = await executeQuery(`
      SELECT id, ticket_number, user_id, status, created_at 
      FROM support_tickets 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    console.log('Recent support tickets:', tickets.length);
    
    // Check recent support replies
    const replies = await executeQuery(`
      SELECT sr.*, st.ticket_number, st.user_id 
      FROM support_replies sr 
      JOIN support_tickets st ON sr.ticket_id = st.id 
      WHERE sr.is_admin_reply = 1 AND sr.is_internal_note = 0
      ORDER BY sr.created_at DESC 
      LIMIT 5
    `);
    console.log('Recent admin replies (non-internal):', replies.length);
    
    if (replies.length > 0) {
      console.log('Latest admin reply:', {
        ticket_id: replies[0].ticket_id,
        ticket_number: replies[0].ticket_number,
        user_id: replies[0].user_id,
        message: replies[0].message.substring(0, 50) + '...',
        created_at: replies[0].created_at
      });
      
      // Check if this user has FCM tokens
      const userTokens = await executeQuery(`
        SELECT token, device_type, is_active, last_used_at 
        FROM user_fcm_tokens 
        WHERE user_id = ? AND is_active = 1
      `, [replies[0].user_id]);
      
      console.log(`FCM tokens for user ${replies[0].user_id}:`, userTokens.length);
      if (userTokens.length > 0) {
        userTokens.forEach((token, index) => {
          console.log(`  Token ${index + 1}: ${token.token.substring(0, 20)}... (${token.device_type})`);
        });
      }
    }
    
  } catch (error) {
    console.error('Database test failed:', error);
  }
  
  console.log('\n=== Test Complete ===');
}

testNotificationSystem().catch(console.error);

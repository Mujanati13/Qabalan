#!/usr/bin/env node

/**
 * Check notification distribution
 */

const { executeQuery } = require('./config/database');

async function checkNotifications() {
  console.log('🔍 Checking notification distribution...');
  
  try {
    // Check total notifications
    const [totalNotifications] = await executeQuery('SELECT COUNT(*) as total FROM notifications');
    console.log(`📊 Total notifications: ${totalNotifications.total}`);
    
    // Check global notifications (user_id IS NULL)
    const [globalNotifications] = await executeQuery('SELECT COUNT(*) as count FROM notifications WHERE user_id IS NULL');
    console.log(`🌍 Global notifications (user_id = NULL): ${globalNotifications.count}`);
    
    // Check user-specific notifications
    const [userNotifications] = await executeQuery('SELECT COUNT(*) as count FROM notifications WHERE user_id IS NOT NULL');
    console.log(`👤 User-specific notifications: ${userNotifications.count}`);
    
    // Check unread global notifications
    const [unreadGlobal] = await executeQuery('SELECT COUNT(*) as count FROM notifications WHERE user_id IS NULL AND is_read = 0');
    console.log(`📬 Unread global notifications: ${unreadGlobal.count}`);
    
    // Check unread user notifications 
    const [unreadUser] = await executeQuery('SELECT COUNT(*) as count FROM notifications WHERE user_id IS NOT NULL AND is_read = 0');
    console.log(`📫 Unread user-specific notifications: ${unreadUser.count}`);
    
    // Sample of global notifications
    if (globalNotifications.count > 0) {
      console.log('\n📋 Sample global notifications:');
      const samples = await executeQuery('SELECT id, title_en, message_en, created_at FROM notifications WHERE user_id IS NULL LIMIT 5');
      samples.forEach((notif, idx) => {
        console.log(`   ${idx + 1}. ID:${notif.id} "${notif.title_en}" - ${notif.created_at}`);
      });
    }
    
    // Check for new user (latest user)
    const [latestUser] = await executeQuery('SELECT id, email, created_at FROM users ORDER BY created_at DESC LIMIT 1');
    if (latestUser) {
      console.log(`\n👤 Latest user: ID:${latestUser.id} (${latestUser.email}) - ${latestUser.created_at}`);
      
      // Check their notification count
      const [userCount] = await executeQuery(`
        SELECT COUNT(*) as count 
        FROM notifications 
        WHERE (user_id = ? OR user_id IS NULL) AND is_read = 0
      `, [latestUser.id]);
      console.log(`📱 Notifications for latest user: ${userCount.count}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

checkNotifications();

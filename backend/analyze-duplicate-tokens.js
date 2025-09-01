const { executeQuery } = require('./config/database');

async function analyzeTokenDuplicates() {
  try {
    console.log('🔍 Analyzing FCM token duplicates in detail...');
    
    // Get detailed info about duplicate tokens
    const duplicateDetails = await executeQuery(`
      SELECT id, user_id, token, device_type, device_id, 
             created_at, updated_at, last_used_at
      FROM user_fcm_tokens 
      WHERE is_active = 1 
      AND user_id IN (
        SELECT user_id 
        FROM user_fcm_tokens 
        WHERE is_active = 1 
        GROUP BY user_id 
        HAVING COUNT(*) > 1
      )
      ORDER BY user_id, created_at
    `);
    
    console.log('📊 Duplicate token details:');
    duplicateDetails.forEach(token => {
      console.log(`  ID: ${token.id}, User: ${token.user_id}, Token: ${token.token.substring(0, 20)}...`);
      console.log(`    Device: ${token.device_type}, Created: ${token.created_at}, Updated: ${token.updated_at}`);
      console.log('');
    });
    
    // Check for exact token duplicates
    const exactDuplicates = await executeQuery(`
      SELECT token, COUNT(*) as count, 
             GROUP_CONCAT(id) as ids,
             GROUP_CONCAT(user_id) as user_ids
      FROM user_fcm_tokens 
      WHERE is_active = 1 
      GROUP BY token 
      HAVING COUNT(*) > 1
    `);
    
    if (exactDuplicates.length > 0) {
      console.log('🔍 Found exact token duplicates:');
      exactDuplicates.forEach(dup => {
        console.log(`  Token: ${dup.token.substring(0, 20)}... appears ${dup.count} times`);
        console.log(`    IDs: ${dup.ids}, Users: ${dup.user_ids}`);
      });
    } else {
      console.log('✅ No exact token duplicates found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

analyzeTokenDuplicates();

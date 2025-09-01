const { executeQuery } = require('./config/database');

async function cleanupDuplicateTokens() {
  try {
    console.log('🧹 Cleaning up duplicate FCM tokens...');
    
    // Find and remove duplicate tokens, keeping only the latest one
    const cleanupQuery = `
      DELETE t1 FROM user_fcm_tokens t1
      INNER JOIN user_fcm_tokens t2 
      WHERE 
        t1.user_id = t2.user_id 
        AND t1.token = t2.token 
        AND t1.id < t2.id
        AND t1.is_active = 1 
        AND t2.is_active = 1
    `;
    
    const result = await executeQuery(cleanupQuery);
    console.log(`✅ Removed ${result.affectedRows || 0} duplicate token entries`);
    
    // Verify the cleanup
    const remainingDuplicates = await executeQuery(`
      SELECT user_id, COUNT(*) as token_count, 
             GROUP_CONCAT(CONCAT(device_type, ':', SUBSTRING(token, 1, 10), '...')) as tokens
      FROM user_fcm_tokens 
      WHERE is_active = 1 
      GROUP BY user_id 
      HAVING COUNT(*) > 1
    `);
    
    if (remainingDuplicates.length > 0) {
      console.log('⚠️  Still found users with multiple active tokens:');
      remainingDuplicates.forEach(dup => {
        console.log(`  User ${dup.user_id}: ${dup.token_count} tokens (${dup.tokens})`);
      });
    } else {
      console.log('✅ All duplicate tokens cleaned up successfully');
    }
    
    // Show final token count
    const finalCount = await executeQuery(`
      SELECT COUNT(*) as total_active_tokens 
      FROM user_fcm_tokens 
      WHERE is_active = 1
    `);
    
    console.log(`📊 Final active FCM tokens: ${finalCount[0].total_active_tokens}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanupDuplicateTokens();

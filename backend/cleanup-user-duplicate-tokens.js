const { executeQuery } = require('./config/database');

async function cleanupUserDuplicateTokens() {
  try {
    console.log('🧹 Cleaning up multiple tokens per user...');
    
    // Find users with multiple active tokens
    const usersWithMultipleTokens = await executeQuery(`
      SELECT user_id, COUNT(*) as token_count
      FROM user_fcm_tokens 
      WHERE is_active = 1 
      GROUP BY user_id 
      HAVING COUNT(*) > 1
    `);
    
    console.log(`Found ${usersWithMultipleTokens.length} users with multiple tokens`);
    
    for (const user of usersWithMultipleTokens) {
      console.log(`\n👤 User ${user.user_id} has ${user.token_count} tokens`);
      
      // Get all tokens for this user, ordered by most recent first
      const userTokens = await executeQuery(`
        SELECT id, token, device_type, created_at, updated_at, last_used_at
        FROM user_fcm_tokens 
        WHERE user_id = ? AND is_active = 1 
        ORDER BY 
          COALESCE(last_used_at, updated_at, created_at) DESC,
          id DESC
      `, [user.user_id]);
      
      // Keep the most recent token, deactivate the rest
      const keepToken = userTokens[0];
      const removeTokens = userTokens.slice(1);
      
      console.log(`  ✅ Keeping token ID ${keepToken.id} (${keepToken.token.substring(0, 20)}...)`);
      console.log(`     Created: ${keepToken.created_at}, Updated: ${keepToken.updated_at}, Last used: ${keepToken.last_used_at}`);
      
      if (removeTokens.length > 0) {
        console.log(`  🗑️  Deactivating ${removeTokens.length} old tokens:`);
        
        for (const token of removeTokens) {
          console.log(`     - ID ${token.id} (${token.token.substring(0, 20)}...)`);
          
          await executeQuery(`
            UPDATE user_fcm_tokens 
            SET is_active = 0, updated_at = NOW() 
            WHERE id = ?
          `, [token.id]);
        }
        
        console.log(`  ✅ Deactivated ${removeTokens.length} tokens for user ${user.user_id}`);
      }
    }
    
    // Verify the cleanup
    console.log('\n🔍 Verifying cleanup...');
    const remainingMultiple = await executeQuery(`
      SELECT user_id, COUNT(*) as token_count
      FROM user_fcm_tokens 
      WHERE is_active = 1 
      GROUP BY user_id 
      HAVING COUNT(*) > 1
    `);
    
    if (remainingMultiple.length === 0) {
      console.log('✅ All users now have only one active token!');
    } else {
      console.log(`⚠️  ${remainingMultiple.length} users still have multiple tokens`);
    }
    
    // Final summary
    const summary = await executeQuery(`
      SELECT 
        COUNT(*) as total_active_tokens,
        COUNT(DISTINCT user_id) as unique_users
      FROM user_fcm_tokens 
      WHERE is_active = 1
    `);
    
    console.log('\n📊 Final summary:');
    console.log(`   Active tokens: ${summary[0].total_active_tokens}`);
    console.log(`   Unique users: ${summary[0].unique_users}`);
    console.log(`   Tokens per user: ${(summary[0].total_active_tokens / summary[0].unique_users).toFixed(2)}`);
    
    console.log('\n🎉 Duplicate notification issue should now be resolved!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanupUserDuplicateTokens();

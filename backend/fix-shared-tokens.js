const { executeQuery } = require('./config/database');

async function fixSharedTokens() {
  try {
    console.log('🔧 Fixing shared FCM tokens...');
    
    // Find tokens that are shared across multiple users
    const sharedTokens = await executeQuery(`
      SELECT token, COUNT(DISTINCT user_id) as user_count,
             GROUP_CONCAT(DISTINCT user_id) as user_ids,
             GROUP_CONCAT(id ORDER BY updated_at DESC) as ids,
             GROUP_CONCAT(updated_at ORDER BY updated_at DESC) as update_times
      FROM user_fcm_tokens 
      WHERE is_active = 1 
      GROUP BY token 
      HAVING COUNT(DISTINCT user_id) > 1
    `);
    
    if (sharedTokens.length === 0) {
      console.log('✅ No shared tokens found');
      return;
    }
    
    console.log(`⚠️  Found ${sharedTokens.length} tokens shared across multiple users:`);
    
    for (const tokenInfo of sharedTokens) {
      console.log(`\n📱 Token: ${tokenInfo.token.substring(0, 20)}...`);
      console.log(`   Users: ${tokenInfo.user_ids} (${tokenInfo.user_count} users)`);
      console.log(`   IDs: ${tokenInfo.ids}`);
      
      // Keep only the most recently updated token entry
      const idsArray = tokenInfo.ids.split(',');
      const keepId = idsArray[0]; // First one is most recent due to ORDER BY updated_at DESC
      const removeIds = idsArray.slice(1);
      
      console.log(`   ✅ Keeping ID: ${keepId}`);
      console.log(`   🗑️  Removing IDs: ${removeIds.join(', ')}`);
      
      // Deactivate the older duplicate entries
      if (removeIds.length > 0) {
        const placeholders = removeIds.map(() => '?').join(',');
        await executeQuery(`
          UPDATE user_fcm_tokens 
          SET is_active = 0, updated_at = NOW() 
          WHERE id IN (${placeholders})
        `, removeIds);
        
        console.log(`   ✅ Deactivated ${removeIds.length} duplicate entries`);
      }
    }
    
    // Verify the fix
    console.log('\n🔍 Verifying fix...');
    const remainingShared = await executeQuery(`
      SELECT token, COUNT(DISTINCT user_id) as user_count
      FROM user_fcm_tokens 
      WHERE is_active = 1 
      GROUP BY token 
      HAVING COUNT(DISTINCT user_id) > 1
    `);
    
    if (remainingShared.length === 0) {
      console.log('✅ All shared tokens fixed successfully!');
    } else {
      console.log(`⚠️  Still have ${remainingShared.length} shared tokens`);
    }
    
    // Show final summary
    const finalSummary = await executeQuery(`
      SELECT COUNT(*) as total_active_tokens,
             COUNT(DISTINCT user_id) as unique_users,
             COUNT(DISTINCT token) as unique_tokens
      FROM user_fcm_tokens 
      WHERE is_active = 1
    `);
    
    console.log('\n📊 Final summary:');
    console.log(`   Active tokens: ${finalSummary[0].total_active_tokens}`);
    console.log(`   Unique users: ${finalSummary[0].unique_users}`);
    console.log(`   Unique tokens: ${finalSummary[0].unique_tokens}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixSharedTokens();
